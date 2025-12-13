// 
const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessage = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = fileUploadWrapper.querySelector("#file-cancel");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");
const budgetCalculator = document.querySelector("#budget-calculator");
const calculatorModal = document.querySelector("#calculator-modal");
const closeModal = document.querySelector(".close-modal");
const calculateBtn = document.querySelector("#calculate-btn");
const suggestionChips = document.querySelector(".suggestion-chips");
const themeToggler = document.querySelector("#theme-toggler");

// Gemini API configuration
const GEMINI_API_KEY = "AIzaSyAgvfy9ZR_MY7dvTf6obP-mmwB_1NO9OaYAIzaSyAgvfy9ZR_MY7dvTf6obP-mmwB_1NO9OaY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// Store chat history and financial context
const chatHistory = [];
const userFinancialContext = {
  income: null,
  expenses: null,
  savings: null,
  budgetGoals: null,
  lastTopics: [],
};

// Financial suggestion chips by category
const financialSuggestions = {
  general: [
    "Create a budget plan",
    "How to save money",
    "Debt reduction tips",
    "Investment advice for beginners"
  ],
  budgeting: [
    "50/30/20 budget rule",
    "Track my expenses",
    "Budget apps recommendation",
    "Reduce monthly bills"
  ],
  investing: [
    "Start investing with $500",
    "Stock market basics",
    "Index funds vs ETFs",
    "Retirement planning"
  ],
  debt: [
    "Pay off credit card debt",
    "Student loan repayment",
    "Debt consolidation options",
    "Improve credit score"
  ],
  saving: [
    "Emergency fund tips",
    "Save for home down payment",
    "Automate my savings",
    "High-yield savings accounts"
  ]
};

// Initialize input height
const initialInputHeight = messageInput.scrollHeight;

// Create message element with dynamic classes and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Function to generate suggestions based on last topic
const generateSuggestions = (topic = "general") => {
  suggestionChips.innerHTML = "";
  
  const suggestions = financialSuggestions[topic] || financialSuggestions.general;
  
  suggestions.forEach(suggestion => {
    const chip = document.createElement("button");
    chip.classList.add("suggestion-chip");
    chip.textContent = suggestion;
    chip.addEventListener("click", () => {
      messageInput.value = suggestion;
      messageInput.dispatchEvent(new Event("input"));
      handleOutgoingMessage(new Event("submit"));
    });
    suggestionChips.appendChild(chip);
  });
};

// Function to get response from Gemini API
const getGeminiResponse = async (userMessage) => {
  try {
    // Create context with previous messages and financial information
    let contextPrompt = "You are BudgetBot, a helpful financial assistant. ";
    
    // Add financial context if available
    if (userFinancialContext.income) {
      contextPrompt += `The user's monthly income is $${userFinancialContext.income}. `;
    }
    if (userFinancialContext.expenses) {
      contextPrompt += `Their monthly expenses are $${userFinancialContext.expenses}. `;
    }
    
    // Add recent conversation history (last 3 exchanges)
    const recentHistory = chatHistory.slice(-6);
    if (recentHistory.length > 0) {
      contextPrompt += "Recent conversation: ";
      recentHistory.forEach(msg => {
        contextPrompt += `${msg.role}: ${msg.message} `;
      });
    }
    
    // Create the full prompt
    const fullPrompt = `${contextPrompt}
    
    Respond to this user query about personal finance: "${userMessage}"
    
    Keep your response friendly, helpful, and focused on practical financial advice. Format your answer with bullet points or short paragraphs when appropriate. If you need to use numbers, format them clearly with dollar signs and commas where appropriate.
    
    Be specific, actionable, and provide clear next steps when possible. If you're suggesting tools or resources, be specific about why they'd be helpful.
    
    If you don't have enough information to give personalized advice, ask a specific follow-up question to get what you need.`;
    
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }]
      })
    };
    
    const response = await fetch(${GEMINI_API_URL}?key=${GEMINI_API_KEY}, requestOptions);
    
    if (!response.ok) {
      throw new Error(API request failed with status ${response.status});
    }
    
    const data = await response.json();
    
    // Extract and clean the response text
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const responseText = data.candidates[0].content.parts[0].text;
      return responseText;
    } else {
      throw new Error("No response content from API");
    }
  } catch (error) {
    console.error("Error fetching response from Gemini API:", error);
    
    // Fallback to local response if API fails
    return determineLocalResponse(userMessage);
  }
};

// Determine relevant financial topic from user message
const determineFinancialTopic = (message) => {
  const topics = {
    budgeting: ["budget", "spending", "expense", "track", "money", "plan", "50/30/20", "allocate"],
    saving: ["save", "emergency fund", "savings", "piggybank", "put away", "high-yield"],
    debt: ["debt", "loan", "credit card", "mortgage", "interest", "repayment", "consolidate"],
    investing: ["invest", "stock", "bond", "ETF", "mutual fund", "return", "risk", "diversify"],
    taxes: ["tax", "deduction", "credit", "refund", "IRS", "filing", "write-off"],
    housing: ["house", "apartment", "rent", "mortgage", "down payment", "property"],
    credit: ["credit score", "FICO", "credit report", "utilization", "credit history"],
    retirement: ["retire", "401k", "IRA", "pension", "social security", "compound interest"],
    insurance: ["insure", "policy", "premium", "coverage", "deductible", "claim"],
    education: ["college", "university", "student loan", "scholarship", "education", "degree", "tuition"],
    children: ["kid", "child", "baby", "family", "allowance", "529 plan"],
    business: ["business", "entrepreneur", "startup", "self-employed", "freelance", "company"]
  };
  
  const messageLower = message.toLowerCase();
  let matchedTopic = "general";
  let highestMatchCount = 0;
  
  // Find topic with most keyword matches
  for (const [topic, keywords] of Object.entries(topics)) {
    const matchCount = keywords.filter(keyword => messageLower.includes(keyword.toLowerCase())).length;
    if (matchCount > highestMatchCount) {
      highestMatchCount = matchCount;
      matchedTopic = topic;
    }
  }
  
  // If greeting is detected, use general
  const greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening"];
  if (greetings.some(greeting => messageLower.includes(greeting)) && messageLower.length < 20) {
    return "general";
  }
  
  return highestMatchCount > 0 ? matchedTopic : "general";
};

// Fallback function for local responses if API fails
const determineLocalResponse = (userMessage) => {
  const financialKnowledgeBase = {
    general: [
      "I'm BudgetBot, your personal financial assistant! I can help with budgeting, savings strategies, debt management, investment basics, and more. What specific financial topic can I help you with today?",
      "Looking to improve your financial situation? I can help with creating budgets, saving strategies, debt reduction plans, and basic investment advice. What's your biggest financial challenge right now?",
      "Financial wellness starts with a plan. I can help you create budgets, set savings goals, manage debt, or understand basic investments. What area of your finances would you like to focus on?"
    ],
    budgeting: [
      "Creating a budget starts with tracking your income and expenses. The 50/30/20 rule is a great starting point: 50% for needs, 30% for wants, and 20% for savings and debt repayment. Would you like me to explain how to implement this approach?",
      "Effective budgeting is about awareness and intention. Start by tracking every expense for a month, then categorize them into needs, wants, and savings/debt. Apps like Mint, YNAB, or Personal Capital can automate this process. What budgeting challenges are you facing?",
      "Zero-based budgeting assigns every dollar a purpose before the month begins. This creates full accountability and ensures you're making intentional choices with your money. Would you like to learn how to create a zero-based budget?"
    ],
    saving: [
      "An emergency fund should be your first savings priority - aim for 3-6 months of essential expenses. Keep it in a high-yield savings account for easy access while earning some interest. Have you started building your emergency fund?",
      "Automating your savings is proven to be highly effective. Set up automatic transfers to a separate savings account on payday - what you don't see, you won't miss. Even small amounts add up significantly over time. What savings goal are you working toward?",
      "For larger savings goals like a down payment or vacation, try creating a dedicated savings account for each goal. This mental accounting helps maintain focus and reduces the temptation to tap into those funds. What big purchase are you saving for?"
    ],
    debt: [
      "There are two popular debt repayment strategies: the snowball method (paying smallest debts first for psychological wins) and the avalanche method (focusing on highest interest rates first for maximum savings). Which approach sounds more motivating to you?",
      "When dealing with high-interest debt like credit cards, always pay more than the minimum. Even an extra $50 per month can significantly reduce your repayment time and interest paid. Have you considered debt consolidation or balance transfers to lower your interest rates?",
      "Creating a debt payoff plan with specific goals and timeline can keep you motivated. Track your progress visually with a chart or app to see your debt decreasing. What's your biggest debt concern right now?"
    ],
    investing: [
      "For beginner investors, low-cost index funds or ETFs are generally recommended. They offer instant diversification with lower fees than actively managed funds. The S&P 500 index fund is a common starting point. What's your investment timeline and risk tolerance?",
      "Dollar-cost averaging—investing fixed amounts regularly regardless of market conditions—reduces the impact of market volatility and removes the stress of trying to time the market. Have you considered setting up automatic investments?",
      "When starting to invest, consider your time horizon and risk tolerance. Generally, younger investors can take more risk with a higher allocation to stocks, while those closer to needing the money should have more conservative portfolios. What's your investment goal?"
    ]
  };
  
  const topic = determineFinancialTopic(userMessage);
  
  // Extract financial details from message if present
  if (userMessage.includes("income") && /\d/.test(userMessage)) {
    const incomeMatch = userMessage.match(/\$?\s?(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)\s?(k|thousand|mil|million)?/i);
    if (incomeMatch) {
      let amount = parseFloat(incomeMatch[1].replace(/,/g, ''));
      if (incomeMatch[5]) {
        if (incomeMatch[5].toLowerCase() === 'k' || incomeMatch[5].toLowerCase() === 'thousand') {
          amount *= 1000;
        } else if (incomeMatch[5].toLowerCase() === 'mil' || incomeMatch[5].toLowerCase() === 'million') {
          amount *= 1000000;
        }
      }
      userFinancialContext.income = amount;
    }
  }
  
  if (userMessage.includes("spend") || userMessage.includes("expense")) {
    const expenseMatch = userMessage.match(/\$?\s?(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)\s?(k|thousand|mil|million)?/i);
    if (expenseMatch) {
      let amount = parseFloat(expenseMatch[1].replace(/,/g, ''));
      if (expenseMatch[5]) {
        if (expenseMatch[5].toLowerCase() === 'k' || expenseMatch[5].toLowerCase() === 'thousand') {
          amount *= 1000;
        } else if (expenseMatch[5].toLowerCase() === 'mil' || expenseMatch[5].toLowerCase() === 'million') {
          amount *= 1000000;
        }
      }
      userFinancialContext.expenses = amount;
    }
  }
  
  // Get responses for the topic
  const responses = financialKnowledgeBase[topic] || financialKnowledgeBase.general;
  
  // Select a response that hasn't been used recently if possible
  const recentResponses = chatHistory
    .filter(msg => msg.role === "bot")
    .slice(-3)
    .map(msg => msg.message);
  
  const unusedResponses = responses.filter(response => !recentResponses.includes(response));
  
  // Select a response
  let selectedResponse;
  if (unusedResponses.length > 0) {
    selectedResponse = unusedResponses[Math.floor(Math.random() * unusedResponses.length)];
  } else {
    selectedResponse = responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Personalize response if we have user context
  if (userFinancialContext.income && topic === "budgeting") {
    const needs = userFinancialContext.income * 0.5;
    const wants = userFinancialContext.income * 0.3;
    const savings = userFinancialContext.income * 0.2;
    
    selectedResponse = `Based on your monthly income of $${userFinancialContext.income.toLocaleString()}, I'd recommend: 
    <ul>
      <li>$${needs.toLocaleString()} for needs (housing, food, utilities)</li>
      <li>$${wants.toLocaleString()} for wants (entertainment, dining out)</li>
      <li>$${savings.toLocaleString()} for savings and debt repayment</li>
    </ul>
    Remember, this is a starting point - you can adjust based on your specific situation.`;
  }
  
  if (userFinancialContext.income && userFinancialContext.expenses && topic === "saving") {
    const savingPotential = userFinancialContext.income - userFinancialContext.expenses;
    if (savingPotential > 0) {
      selectedResponse = `Great! With income of $${userFinancialContext.income.toLocaleString()} and expenses of $${userFinancialContext.expenses.toLocaleString()}, you have about $${savingPotential.toLocaleString()} available for saving each month.
      
      I'd recommend first building an emergency fund of $${(userFinancialContext.expenses * 3).toLocaleString()} to $${(userFinancialContext.expenses * 6).toLocaleString()} (3-6 months of expenses), then consider retirement accounts or other investment options.`;
    } else {
      selectedResponse = `I notice your expenses ($${userFinancialContext.expenses.toLocaleString()}) exceed your income ($${userFinancialContext.income.toLocaleString()}). Before focusing on saving, let's look at reducing expenses or increasing income to create a positive cash flow.
      
      Start by categorizing your expenses to find areas where you can cut back.`;
    }
  }
  
  return selectedResponse;
};

// Generate bot response based on message content
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");
  const userMessage = userData.message.trim();
  
  try {
    // Determine relevant financial topic
    const topic = determineFinancialTopic(userMessage);
    
    // Update user's financial context
    userFinancialContext.lastTopics.push(topic);
    if (userFinancialContext.lastTopics.length > 3) {
      userFinancialContext.lastTopics.shift();
    }
    
    // Get response from Gemini API
    const botResponse = await getGeminiResponse(userMessage);
    
    // Display the response
    messageElement.innerHTML = botResponse;
    
    // Record interaction in chat history for context
    chatHistory.push({
      role: "user",
      message: userMessage
    });
    
    chatHistory.push({
      role: "bot",
      message: botResponse,
      topic: topic
    });
    
    // Update suggestion chips based on topic
    generateSuggestions(topic);
    
  } catch (error) {
    // Handle errors gracefully
    console.error(error);
    messageElement.innerHTML = "I apologize, but I'm having trouble connecting to my financial database. Please try again in a moment.";
    messageElement.style.color = "#ff6b6b";
  } finally {
    // Clean up and scroll to bottom
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
};

// Handle outgoing user messages
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  
  if (!userData.message) return;
  
  messageInput.value = "";
  messageInput.dispatchEvent(new Event("input"));
  fileUploadWrapper.classList.remove("file-uploaded");

  // Create and display user message
  const messageContent = `<div class="message-text"></div>
                          ${userData.file.data ? <img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" /> : ""}`;

  const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
  outgoingMessageDiv.querySelector(".message-text").innerText = userData.message;
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

  // Create bot response with thinking indicator
  setTimeout(() => {
    const messageContent = `<span class="bot-avatar material-symbols-rounded">account_balance</span>
          <div class="message-text">
            <div class="thinking-indicator">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>`;

    const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    generateBotResponse(incomingMessageDiv);
  }, 600);
};

// Initialize user data
const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null,
  },
};

// Budget calculator functionality
const calculateBudget = () => {
  const income = parseFloat(document.getElementById('income').value);
  const expenses = parseFloat(document.getElementById('expenses').value);
  
  if (isNaN(income)) {
    alert('Please enter a valid income amount');
    return;
  }
  
  // Update values in UI
  document.getElementById('needs-value').textContent = $${(income * 0.5).toFixed(2)};
  document.getElementById('wants-value').textContent = $${(income * 0.3).toFixed(2)};
  document.getElementById('savings-value').textContent = $${(income * 0.2).toFixed(2)};
  
  const remaining = isNaN(expenses) ? income : income - expenses;
  document.getElementById('remaining-value').textContent = $${remaining.toFixed(2)};
  
  // Update financial context
  userFinancialContext.income = income;
  if (!isNaN(expenses)) {
    userFinancialContext.expenses = expenses;
  }
  
  // Add calculation to chat as a message
  setTimeout(() => {
    const messageContent = `<span class="bot-avatar material-symbols-rounded">account_balance</span>
      <div class="message-text">
        I've calculated your budget based on the 50/30/20 rule:
        <ul>
          <li>$${(income * 0.5).toFixed(2)} for needs (50%)</li>
          <li>$${(income * 0.3).toFixed(2)} for wants (30%)</li>
          <li>$${(income * 0.2).toFixed(2)} for savings (20%)</li>
        </ul>
        ${!isNaN(expenses) ? With your expenses of $${expenses.toFixed(2)}, you have $${remaining.toFixed(2)} remaining. : ''}
        <br>
        Would you like some tips on how to optimize your budget?
      </div>`;

    const incomingMessageDiv = createMessageElement(messageContent, "bot-message");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    
    // Close the modal after adding the message
    calculatorModal.style.display = "none";
    
    // Update suggestion chips to budgeting
    generateSuggestions("budgeting");
    
    // Add to chat history
    chatHistory.push({
      role: "bot",
      message: Budget calculation: Needs: $${(income * 0.5).toFixed(2)}, Wants: $${(income * 0.3).toFixed(2)}, Savings: $${(income * 0.2).toFixed(2)},
      topic: "budgeting"
    });
  }, 500);
};

// Toggle dark mode
const toggleTheme = () => {
  document.body.classList.toggle("dark-theme");
  const isDarkMode = document.body.classList.contains("dark-theme");
  
  // Update icon
  themeToggler.innerHTML = isDarkMode ? 
    '<span class="material-symbols-rounded">light_mode</span>' : 
    '<span class="material-symbols-rounded">dark_mode</span>';
  
  // Store preference
  localStorage.setItem("budgetbot-theme", isDarkMode ? "dark" : "light");
};

// Adjust input field height dynamically
messageInput.addEventListener("input", () => {
  messageInput.style.height = ${initialInputHeight}px;
  messageInput.style.height = ${messageInput.scrollHeight}px;
  document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "24px";
});

// Handle Enter key press for sending messages
messageInput.addEventListener("keydown", (e) => {
  const userMessage = e.target.value.trim();
  if (e.key === "Enter" && !e.shiftKey && userMessage && window.innerWidth > 768) {
    e.preventDefault();
    handleOutgoingMessage(e);
  }
});

// Handle file input change and preview the selected file
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    fileInput.value = "";
    fileUploadWrapper.querySelector("img").src = e.target.result;
    fileUploadWrapper.classList.add("file-uploaded");
    const base64String = e.target.result.split(",")[1];

    // Store file data in userData
    userData.file = {
      data: base64String,
      mime_type: file.type,
    };
  };

  reader.readAsDataURL(file);
});

// Cancel file upload
fileCancelButton.addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-uploaded");
});

// Initialize emoji picker
const picker = new EmojiMart.Picker({
  theme: "light",
  skinTonePosition: "none",
  previewPosition: "none",
  onEmojiSelect: (emoji) => {
    const { selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji.native, start, end, "end");
    messageInput.focus();
  },
  onClickOutside: (e) => {
    if (e.target.id === "emoji-picker") {
      document.body.classList.toggle("show-emoji-picker");
    } else {
      document.body.classList.remove("show-emoji-picker");
    }
  },
});

// Add emoji picker to the document
document.querySelector(".chat-form").appendChild(picker);

// Modal controls
budgetCalculator.addEventListener("click", () => {
  calculatorModal.style.display = "block";
});

closeModal.addEventListener("click", () => {
  calculatorModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === calculatorModal) {
    calculatorModal.style.display = "none";
  }
});

// Calculate budget when button is clicked
calculateBtn.addEventListener("click", calculateBudget);

// Check for saved theme preference
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("budgetbot-theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    themeToggler.innerHTML = '<span class="material-symbols-rounded">light_mode</span>';
  }
  
  // Initialize suggestion chips
  generateSuggestions();
});

// Add event listeners
document.querySelector("#emoji-picker").addEventListener("click", () => {
  document.body.classList.toggle("show-emoji-picker");
});

themeToggler.addEventListener("click", toggleTheme);
sendMessage.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));

