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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    const chatMessages = document.getElementById('chat-messages');
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
    
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="username">${message.username}</div>
        <div class="message-text">${message.message}</div>
        <div class="timestamp">${timestamp}</div>
      </div>
    `;
    
    return messageDiv;
  }

  // Scroll to bottom
  scrollToBottom() {
    const chatMessages = document.getElementById('chat-messages');
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
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => this.handleChatInput(e));
    }
  }

  // Initialize chat client
  async initialize() {
    await this.fetchChatHistory();
    this.setupEventListeners();
  }
}
