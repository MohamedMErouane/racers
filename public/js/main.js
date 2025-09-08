// Main application module
import { RaceClient } from './raceClient.js';
import { ChatClient } from './chatClient.js';
import { WalletClient } from './walletClient.js';
import { UI } from './ui.js';

class RacersApp {
  constructor() {
    this.socket = null;
    this.raceClient = null;
    this.chatClient = null;
    this.walletClient = null;
    this.ui = null;
    this.isInitialized = false;
  }

  // Initialize the application
  async initialize() {
    try {
      console.log('🚀 Initializing Racers.fun...');
      
      // Initialize UI
      this.ui = new UI();
      
      // Make UI globally available for debugging (development only)
      if ((typeof process !== 'undefined' && process.env.NODE_ENV === 'development') || window.location.hostname === 'localhost') {
        window.ui = this.ui;
      }
      
      // Initialize Socket.IO
      await this.initializeSocket();
      
      // Initialize clients
      this.raceClient = new RaceClient(this.socket);
      this.chatClient = new ChatClient(this.socket, () => this.walletClient?.getAccessToken());
      this.walletClient = new WalletClient();
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Initialize all clients
      await Promise.all([
        this.raceClient.setupEventHandlers(),
        this.chatClient.initialize(),
        this.walletClient.initialize()
      ]);
      
      this.isInitialized = true;
      console.log('✅ Racers.fun initialized successfully!');
      
      // Show welcome notification
      this.ui.showNotification('Welcome to Racers.fun!', 'success');
      
    } catch (error) {
      console.error('❌ Failed to initialize Racers.fun:', error);
      this.ui.showNotification('Failed to initialize application', 'error');
    }
  }

  // Initialize Socket.IO connection
  async initializeSocket() {
    return new Promise((resolve, reject) => {
      try {
        // Socket.IO is already loaded via script tag in index.html
        this.socket = io();
        
        this.socket.on('connect', () => {
          console.log('✅ Connected to server');
          resolve();
        });
        
        this.socket.on('disconnect', () => {
          console.log('❌ Disconnected from server');
          this.ui.showNotification('Connection lost', 'error');
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('❌ Connection error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Setup global event handlers
  setupEventHandlers() {
    // Bet placement
    window.addEventListener('bet:place', (event) => {
      this.handleBetPlacement(event.detail);
    });
    
    // Wallet events
    window.addEventListener('wallet:connected', (event) => {
      this.handleWalletConnected(event.detail);
    });
  }

  // Handle bet placement
  async handleBetPlacement(betData) {
    try {
      // Get token from wallet client
      const token = this.walletClient?.getAccessToken();
      if (!token) {
        this.ui.showNotification('Please connect your wallet first', 'error');
        return;
      }
      
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(betData)
      });
      
      if (response.ok) {
        this.ui.showNotification('Bet placed successfully!', 'success');
      } else {
        this.ui.showNotification('Failed to place bet', 'error');
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      this.ui.showNotification('Error placing bet', 'error');
    }
  }

  // Handle wallet connected
  handleWalletConnected(walletData) {
    this.ui.showNotification('Wallet connected successfully!', 'success');
  }

  // Start the application
  start() {
    if (!this.isInitialized) {
      this.initialize();
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new RacersApp();
  app.start();
  
  // Make app globally available for debugging (development only)
  if ((typeof process !== 'undefined' && process.env.NODE_ENV === 'development') || window.location.hostname === 'localhost') {
    window.racersApp = app;
  }
});

// Export for module usage
export default RacersApp;
