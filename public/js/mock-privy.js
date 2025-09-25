// Mock Privy SDK for when the real SDK can't load
class MockPrivy {
  constructor(config) {
    this.config = config;
    this.authenticated = false;
    this.user = null;
    this.eventHandlers = {};
    
    console.log('🔧 Using Mock Privy (real SDK unavailable)');
  }

  async ready() {
    // Simulate async initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ Mock Privy ready');
  }

  async login() {
    console.log('🔐 Mock Privy login triggered');
    
    // Simulate user login with mock data
    this.user = {
      id: 'mock_user_' + Math.random().toString(36).substr(2, 9),
      email: { address: 'demo@example.com' },
      wallet: {
        address: 'Mock' + Math.random().toString(36).substr(2, 8).toUpperCase()
      }
    };
    
    this.authenticated = true;
    
    // Trigger login event
    if (this.eventHandlers.login) {
      this.eventHandlers.login.forEach(handler => handler());
    }
    
    return this.user;
  }

  async logout() {
    console.log('👋 Mock Privy logout');
    this.user = null;
    this.authenticated = false;
    
    // Trigger logout event
    if (this.eventHandlers.logout) {
      this.eventHandlers.logout.forEach(handler => handler());
    }
  }

  async getAccessToken() {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }
    
    // Return a mock JWT token
    return 'mock.jwt.token.' + btoa(JSON.stringify({
      sub: this.user.id,
      email: this.user.email.address,
      wallet: this.user.wallet.address,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
  }

  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }
}

// Make MockPrivy available globally
window.MockPrivy = MockPrivy;