// Chat client module
export class ChatClient {
  constructor() {
    this.messages = [];
    this.isTyping = false;
  }

  // Fetch chat history
  async fetchChatHistory() {
    try {
      const response = await fetch('/api/chat');
      const messages = await response.json();
      this.messages = messages;
      this.renderChatMessages();
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }

  // Send chat message
  async sendMessage(message, userId, username) {
    try {
      // Get token from wallet client
      const token = window.racersApp?.walletClient?.getAccessToken();
      if (!token) {
        console.error('No authentication token available');
        return false;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          userId,
          username
        })
      });

      if (response.ok) {
        const result = await response.json();
        this.addMessage(result.message);
        
        // Emit socket event for real-time updates (with token for authentication)
        if (window.racersApp && window.racersApp.socket) {
          window.racersApp.socket.emit('chat:message', {
            message: result.message.message,
            username: result.message.username,
            token: token
          });
        }
        
        return true;
      } else {
        console.error('Failed to send message');
        return false;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  // Add message to chat
  addMessage(message) {
    this.messages.push(message);
    
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }
    
    this.renderChatMessages();
    this.scrollToBottom();
  }

  // Render chat messages
  renderChatMessages() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = '';
    
    this.messages.forEach(message => {
      const messageElement = this.createChatMessageElement(message);
      chatMessages.appendChild(messageElement);
    });
  }

  // Create chat message element
  createChatMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const username = document.createElement('div');
    username.className = 'username';
    username.textContent = message.username;
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = message.message;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date(message.timestamp).toLocaleTimeString();
    
    messageContent.appendChild(username);
    messageContent.appendChild(messageText);
    messageContent.appendChild(timestamp);
    messageDiv.appendChild(messageContent);
    
    return messageDiv;
  }

  // Scroll to bottom
  scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  // Handle chat input
  handleChatInput(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = event.target;
      const message = input.value.trim();
      
      if (message && window.userWallet) {
        this.sendMessage(message, window.userWallet, 'User');
        input.value = '';
      }
    }
  }

  // Setup chat event listeners
  setupEventListeners() {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => this.handleChatInput(e));
    }
  }

  // Setup socket event listeners
  setupSocketListeners() {
    if (window.racersApp && window.racersApp.socket) {
      window.racersApp.socket.on('chat:message', (message) => {
        this.addMessage(message);
      });
    }
  }

  // Initialize chat client
  async initialize() {
    await this.fetchChatHistory();
    this.setupEventListeners();
    this.setupSocketListeners();
  }
}
