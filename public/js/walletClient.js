// Wallet client module
export class WalletClient {
  constructor() {
    this.privy = null;
    this.user = null;
    this.isAuthenticated = false;
    this.accessToken = null;
  }

  // Wait for Privy SDK to load
  async waitForPrivySDK(maxWaitTime = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      // Check if Privy is available (real or mock)
      if (typeof Privy !== 'undefined' && window.privyLoaded) {
        const privyType = window.usingMockPrivy ? 'Mock Privy' : 'Real Privy SDK';
        console.log(`✅ ${privyType} loaded successfully`);
        return true;
      }
      
      console.log('⏳ Waiting for Privy SDK to load...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.error('❌ Privy SDK failed to load within timeout');
    console.error('Debug: Privy type:', typeof Privy);
    console.error('Debug: privyLoaded flag:', window.privyLoaded);
    console.error('Debug: usingMockPrivy flag:', window.usingMockPrivy);
    return false;
  }

  // Initialize Privy wallet
  async initWallet() {
    try {
      console.log('🔄 Initializing Privy wallet...');
      console.log('Config APP_ID:', window.CONFIG?.PRIVY_APP_ID);
      
      // Wait for Privy SDK to load
      const sdkLoaded = await this.waitForPrivySDK();
      if (!sdkLoaded) {
        throw new Error('Privy SDK failed to load - please check your internet connection and refresh the page');
      }
      
      // Check if we have a valid app ID
      if (!window.CONFIG?.PRIVY_APP_ID) {
        throw new Error('Privy App ID not configured');
      }
      
      console.log('🔧 Creating Privy instance...');
      const privyType = window.usingMockPrivy ? 'Mock' : 'Real';
      console.log(`📦 Using ${privyType} Privy SDK`);
      
      this.privy = new Privy({
        appId: window.CONFIG.PRIVY_APP_ID,
        config: {
          loginMethods: ['email', 'wallet'],
          appearance: {
            theme: 'dark',
            accentColor: '#9333ea',
            showWalletLoginFirst: true
          },
          defaultChain: 'solana',
          supportedChains: ['solana']
        }
      });
      
      console.log('⏳ Waiting for Privy to be ready...');
      await this.privy.ready();
      console.log('✅ Privy is ready');
      
      if (this.privy.authenticated) {
        console.log('🔐 User already authenticated, handling login...');
        await this.handleLogin();
      }
      
      this.privy.on('login', () => {
        console.log('🎉 Login event received');
        this.handleLogin();
      });
      this.privy.on('logout', () => {
        console.log('👋 Logout event received');
        this.handleLogout();
      });
      
      console.log('✅ Privy wallet initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Privy wallet initialization failed:', error);
      alert('Wallet connection failed; running in guest mode.');
      return false;
    }
  }

  // Handle login
  async handleLogin() {
    try {
      const user = this.privy.user;
      const wallet = user.wallet;
      
      if (wallet) {
        // Get access token for backend authentication
        const accessToken = await this.privy.getAccessToken();
        
        this.user = {
          id: user.id,
          email: user.email?.address,
          wallet: wallet.address,
          username: user.email?.address?.split('@')[0] || `user_${user.id.slice(0, 8)}`
        };
        
        this.isAuthenticated = true;
        this.accessToken = accessToken;
        
        // Dispatch wallet connected event (without exposing token)
        window.dispatchEvent(new CustomEvent('wallet:connected', {
          detail: { wallet: wallet.address }
        }));
        
        this.updateWalletUI();
        
        // Enable chat input after successful authentication
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
          chatInput.disabled = false;
          chatInput.placeholder = 'Type your message...';
        }
        
        console.log('✅ User authenticated:', this.user);
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
    }
  }

  // Handle logout
  handleLogout() {
    this.user = null;
    this.isAuthenticated = false;
    this.accessToken = null;
    
    // Disable chat input after logout
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.disabled = true;
      chatInput.placeholder = 'Connect wallet to chat...';
    }
    
    // Dispatch wallet disconnected event
    window.dispatchEvent(new CustomEvent('wallet:disconnected'));
    
    this.updateWalletUI();
    console.log('👋 User logged out');
  }

  // Get access token
  getAccessToken() {
    return this.accessToken;
  }

  // Get wallet address
  getWalletAddress() {
    return this.user?.wallet || null;
  }

  // Connect wallet
  async connectWallet() {
    try {
      console.log('🔄 Attempting to connect wallet...');
      
      if (!this.privy) {
        console.error('❌ Privy not initialized');
        // Try to initialize again
        const initialized = await this.initWallet();
        if (!initialized) {
          throw new Error('Privy not initialized and failed to initialize');
        }
      }
      
      console.log('🔗 Calling Privy login...');
      await this.privy.login();
      console.log('✅ Privy login completed');
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      alert(`Failed to connect wallet: ${error.message}`);
    }
  }

  // Update wallet UI
  updateWalletUI() {
    const walletBtn = document.getElementById('walletBtn');
    const walletActions = document.getElementById('walletActions');
    
    if (this.isAuthenticated && this.user) {
      if (walletBtn) {
        walletBtn.textContent = `${this.user.wallet.slice(0, 6)}...${this.user.wallet.slice(-4)}`;
      }
      if (walletActions) {
        walletActions.style.display = 'flex';
      }
    } else {
      if (walletBtn) {
        walletBtn.textContent = 'Connect';
      }
      if (walletActions) {
        walletActions.style.display = 'none';
      }
    }
  }

  // Setup wallet event listeners
  setupEventListeners() {
    const walletBtn = document.getElementById('walletBtn');
    if (walletBtn) {
      walletBtn.addEventListener('click', async () => {
        console.log('💰 Wallet button clicked');
        
        // Show loading state
        const originalText = walletBtn.textContent;
        walletBtn.textContent = 'Connecting...';
        walletBtn.disabled = true;
        
        try {
          await this.connectWallet();
        } finally {
          // Reset button state if connection failed
          if (!this.isAuthenticated) {
            walletBtn.textContent = originalText;
            walletBtn.disabled = false;
          }
        }
      });
      console.log('🎯 Wallet button event listener attached');
    } else {
      console.error('❌ Wallet button not found in DOM');
    }
  }

  // Initialize wallet client
  async initialize() {
    console.log('🚀 Starting wallet client initialization...');
    
    // Wait longer for the DOM and external scripts to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = await this.initWallet();
    if (success) {
      this.setupEventListeners();
      console.log('✅ Wallet client fully initialized');
    } else {
      console.log('⚠️ Wallet client initialized in fallback mode');
      // Still setup event listeners for retry functionality
      this.setupEventListeners();
    }
    return success;
  }
}
