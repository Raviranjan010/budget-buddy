document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const elements = {
      chatbotContainer: document.getElementById('chatbot-container'),
      chatbotToggle: document.getElementById('chatbot-toggle'),
      minimizeChatbot: document.getElementById('minimize-chatbot'),
      closeChatbot: document.getElementById('close-chatbot'),
      chatbotMessages: document.getElementById('chatbot-messages'),
      chatbotUserInput: document.getElementById('chatbot-user-input'),
      sendMessage: document.getElementById('send-message'),
      dashboardLink: document.getElementById('dashboard-link'),
      reportsLink: document.getElementById('reports-link'),
      settingsLink: document.getElementById('settings-link'),
      transactionForm: document.getElementById('transaction-form'),
      transactionType: document.getElementById('transaction-type'),
      transactionCategory: document.getElementById('transaction-category'),
      transactionAmount: document.getElementById('transaction-amount'),
      transactionDate: document.getElementById('transaction-date'),
      transactionsList: document.getElementById('transactions-list'),
      filterType: document.getElementById('filter-type'),
      filterCategory: document.getElementById('filter-category'),
      monthlyIncome: document.getElementById('monthly-income'),
      monthlyExpense: document.getElementById('monthly-expense'),
      monthlySavings: document.getElementById('monthly-savings'),
      incomeCategoriesList: document.getElementById('income-categories-list'),
      expenseCategoriesList: document.getElementById('expense-categories-list'),
      addIncomeCategory: document.getElementById('add-income-category'),
      addExpenseCategory: document.getElementById('add-expense-category'),
      newIncomeCategory: document.getElementById('new-income-category'),
      newExpenseCategory: document.getElementById('new-expense-category'),
      incomeExpenseChart: document.getElementById('income-expense-chart').getContext('2d'),
      expenseCategoriesChart: document.getElementById('expense-categories-chart').getContext('2d'),
  };

  // State
  
  let state = {
      isChatbotOpen: false,
      isChatbotMinimized: false,
      transactions: JSON.parse(localStorage.getItem('transactions')) || [],
      categories: JSON.parse(localStorage.getItem('categories')) || {
          income: ['Salary', 'Freelance', 'Investments', 'Gifts'],
          expense: ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping']
      },
      charts: {}
  };

  // Initialize
  initApp();

  // Event Listeners
  setupEventListeners();

  function initApp() {
      updateCategories();
      updateSummary();
      updateTransactionsList();
      updateFilterCategories();
      initCharts();
      loadChatbotMessages();
  }

  function setupEventListeners() {
      elements.chatbotToggle.addEventListener('click', toggleChatbot);
      elements.minimizeChatbot.addEventListener('click', minimizeChatbot);
      elements.closeChatbot.addEventListener('click', closeChatbot);
      elements.sendMessage.addEventListener('click', sendUserMessage);
      elements.chatbotUserInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendUserMessage());
      elements.transactionForm.addEventListener('submit', handleTransactionSubmit);
      elements.transactionType.addEventListener('change', updateCategoryOptions);
      elements.filterType.addEventListener('change', updateTransactionsList);
      elements.filterCategory.addEventListener('change', updateTransactionsList);
      elements.addIncomeCategory.addEventListener('click', () => addCategory('income'));
      elements.addExpenseCategory.addEventListener('click', () => addCategory('expense'));
      [elements.dashboardLink, elements.reportsLink, elements.settingsLink].forEach(link => 
          link.addEventListener('click', handleNavigation)
      );
  }

  function handleNavigation(e) {
      e.preventDefault();
      document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
      document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
      document.getElementById(e.target.id.replace('-link', '')).classList.add('active');
      e.target.classList.add('active');
  }

  function updateCategories() {
      updateCategoryList(elements.incomeCategoriesList, state.categories.income, 'income');
      updateCategoryList(elements.expenseCategoriesList, state.categories.expense, 'expense');
      updateCategoryOptions();
  }

  function updateCategoryList(listElement, categories, type) {
      listElement.innerHTML = categories.map(category => `
          <li>
              <span>${category}</span>
              <button onclick="deleteCategory('${type}', '${category}')">Delete</button>
          </li>
      `).join('');
  }

  function updateCategoryOptions() {
      const type = elements.transactionType.value;
      const categories = type === 'income' ? state.categories.income : 
                       type === 'expense' ? state.categories.expense : [];
      elements.transactionCategory.innerHTML = '<option value="">Select Category</option>' + 
          categories.map(category => `<option value="${category}">${category}</option>`).join('');
  }

  function addCategory(type) {
      const input = type === 'income' ? elements.newIncomeCategory : elements.newExpenseCategory;
      const category = input.value.trim();
      if (category && !state.categories[type].includes(category)) {
          state.categories[type].push(category);
          localStorage.setItem('categories', JSON.stringify(state.categories));
          input.value = '';
          updateCategories();
          updateFilterCategories();
      }
  }

  window.deleteCategory = function(type, category) {
      state.categories[type] = state.categories[type].filter(cat => cat !== category);
      localStorage.setItem('categories', JSON.stringify(state.categories));
      updateCategories();
      updateFilterCategories();
  };

  function updateFilterCategories() {
      const allCategories = [...state.categories.income, ...state.categories.expense];
      elements.filterCategory.innerHTML = '<option value="all">All Categories</option>' + 
          allCategories.map(category => `<option value="${category}">${category}</option>`).join('');
  }

  function handleTransactionSubmit(e) {
      e.preventDefault();
      if (!elements.transactionType.value || !elements.transactionCategory.value || 
          !elements.transactionAmount.value || !elements.transactionDate.value) {
          alert('Please fill all required fields');
          return;
      }

      const transaction = {
          type: elements.transactionType.value,
          category: elements.transactionCategory.value,
          amount: parseFloat(elements.transactionAmount.value),
          date: elements.transactionDate.value,
          description: elements.transactionDescription.value
      };
      
      state.transactions.push(transaction);
      localStorage.setItem('transactions', JSON.stringify(state.transactions));
      elements.transactionForm.reset();
      elements.transactionCategory.innerHTML = '<option value="">Select Category</option>';
      updateSummary();
      updateTransactionsList();
      updateCharts();
  }

  function updateSummary() {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyTransactions = state.transactions.filter(t => t.date.startsWith(currentMonth));
      const income = monthlyTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
      const expense = monthlyTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
      elements.monthlyIncome.textContent = `$${income.toFixed(2)}`;
      elements.monthlyExpense.textContent = `$${expense.toFixed(2)}`;
      elements.monthlySavings.textContent = `$${(income - expense).toFixed(2)}`;
  }

  function updateTransactionsList() {
      const typeFilter = elements.filterType.value;
      const categoryFilter = elements.filterCategory.value;
      const filtered = state.transactions.filter(t => 
          (typeFilter === 'all' || t.type === typeFilter) &&
          (categoryFilter === 'all' || t.category === categoryFilter)
      );
      
      elements.transactionsList.innerHTML = filtered.length === 0 ? 
          '<p class="empty-message">No transactions match your filters.</p>' :
          filtered.map(t => `
              <div class="transaction-item">
                  <div class="transaction-info">
                      <div class="transaction-icon ${t.type}">
                          <i class="fas fa-${t.type === 'income' ? 'plus' : 'minus'}-circle"></i>
                      </div>
                      <div class="transaction-details">
                          <h4>${t.category}</h4>
                          <p>${t.description || 'No description'} - ${new Date(t.date).toLocaleDateString()}</p>
                      </div>
                  </div>
                  <div class="transaction-amount ${t.type}">
                      ${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}
                  </div>
              </div>
          `).join('');
  }

  function initCharts() {
      state.charts.incomeExpense = new Chart(elements.incomeExpenseChart, {
          type: 'bar',
          data: {
              labels: ['Income', 'Expenses'],
              datasets: [{
                  data: [0, 0],
                  backgroundColor: ['#34d399', '#f87171']
              }]
          },
          options: {
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
          }
      });

      state.charts.expenseCategories = new Chart(elements.expenseCategoriesChart, {
          type: 'pie',
          data: {
              labels: [],
              datasets: [{
                  data: [],
                  backgroundColor: ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa']
              }]
          },
          options: {
              plugins: { legend: { position: 'bottom' } }
          }
      });
  }

  function updateCharts() {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyTransactions = state.transactions.filter(t => t.date.startsWith(currentMonth));
      
      const income = monthlyTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
      const expense = monthlyTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
      state.charts.incomeExpense.data.datasets[0].data = [income, expense];
      state.charts.incomeExpense.update();

      const expenseData = state.categories.expense.reduce((acc, category) => {
          const amount = monthlyTransactions
              .filter(t => t.type === 'expense' && t.category === category)
              .reduce((sum, t) => sum + t.amount, 0);
          acc[category] = amount;
          return acc;
      }, {});
      state.charts.expenseCategories.data.labels = Object.keys(expenseData);
      state.charts.expenseCategories.data.datasets[0].data = Object.values(expenseData);
      state.charts.expenseCategories.update();
  }

  function toggleChatbot() {
      if (state.isChatbotOpen) {
          state.isChatbotMinimized ? unminimizeChatbot() : minimizeChatbot();
      } else {
          openChatbot();
      }
  }

  function openChatbot() {
      elements.chatbotContainer.classList.add('active');
      state.isChatbotOpen = true;
      state.isChatbotMinimized = false;
      elements.chatbotToggle.innerHTML = '<i class="fas fa-minus"></i>';
  }

  function minimizeChatbot() {
      elements.chatbotContainer.classList.remove('active');
      state.isChatbotMinimized = true;
      elements.chatbotToggle.innerHTML = '<i class="fas fa-robot"></i>';
  }

  function unminimizeChatbot() {
      elements.chatbotContainer.classList.add('active');
      state.isChatbotMinimized = false;
      elements.chatbotToggle.innerHTML = '<i class="fas fa-minus"></i>';
  }

  function closeChatbot() {
      elements.chatbotContainer.classList.remove('active');
      state.isChatbotOpen = false;
      state.isChatbotMinimized = false;
      elements.chatbotToggle.innerHTML = '<i class="fas fa-robot"></i>';
  }

  function loadChatbotMessages() {
      const savedMessages = localStorage.getItem('chatbotMessages');
      if (savedMessages) {
          elements.chatbotMessages.innerHTML = savedMessages;
      } else {
          addMessageToChat("Hello! I'm your Budget Bot. Ask me about budgeting or expenses!", 'bot');
          localStorage.setItem('chatbotMessages', elements.chatbotMessages.innerHTML);
      }
  }

  function sendUserMessage() {
      const message = elements.chatbotUserInput.value.trim();
      if (!message) return;

      addMessageToChat(message, 'user');
      elements.chatbotUserInput.value = '';
      const typingIndicator = addTypingIndicator();

      setTimeout(() => {
          elements.chatbotMessages.removeChild(typingIndicator);
          const response = processUserMessage(message);
          addMessageToChat(response, 'bot');
          localStorage.setItem('chatbotMessages', elements.chatbotMessages.innerHTML);
      }, 1000);
  }

  function addMessageToChat(message, sender) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `${sender}-message`;
      messageDiv.innerHTML = `<div class="message-content"><p>${message}</p></div>`;
      elements.chatbotMessages.appendChild(messageDiv);
      elements.chatbotMessages.scrollTop = elements.chatbotMessages.scrollHeight;
  }

  function addTypingIndicator() {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'bot-message';
      typingDiv.innerHTML = '<div class="message-content"><p><i class="fas fa-ellipsis-h"></i></p></div>';
      elements.chatbotMessages.appendChild(typingDiv);
      elements.chatbotMessages.scrollTop = elements.chatbotMessages.scrollHeight;
      return typingDiv;
  }

  function processUserMessage(message) {
      const financialData = getFinancialData();
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('budget')) {
          const budget = financialData.totalIncome * 0.5;
          return `Based on your $${financialData.totalIncome.toFixed(2)} income, aim to spend no more than $${budget.toFixed(2)} (50%) on essentials. Save 20% ($${financialData.totalIncome * 0.2}) and use 30% for wants.`;
      } else if (lowerMessage.includes('savings')) {
          return `You're saving $${financialData.totalSavings.toFixed(2)} this month. Try to save at least 20% of your income ($${financialData.totalIncome * 0.2}) for future goals.`;
      } else if (lowerMessage.includes('expense') || lowerMessage.includes('spending')) {
          return `Your expenses are $${financialData.totalExpense.toFixed(2)}. Focus on cutting back in high-spend categories like ${financialData.expenseCategories[0] || 'unknown'}.`;
      } else {
          return "I can help with budgeting, savings, or expense tracking. What would you like to know?";
      }
  }

  function getFinancialData() {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyTransactions = state.transactions.filter(t => t.date.startsWith(currentMonth));
      const totalIncome = monthlyTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = monthlyTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
      return {
          totalIncome,
          totalExpense,
          totalSavings: totalIncome - totalExpense,
          incomeCategories: state.categories.income,
          expenseCategories: state.categories.expense,
          recentTransactions: monthlyTransactions.slice(0, 5)
      };
  }

});
