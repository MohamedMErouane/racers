// Wallet client module
export class WalletClient {
  constructor() {
    this.privy = null;
    this.user = null;
    this.isAuthenticated = false;
  }

  // Initialize Privy wallet
  async initWallet() {
    try {
      if (typeof Privy === 'undefined') {
        throw new Error('Privy SDK not loaded');
      }
      
      this.privy = new Privy({
        appId: '<YOUR_PRIVY_APP_ID>',
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
      
      await this.privy.ready();
      
      if (this.privy.authenticated) {
        await this.handleLogin();
      }
      
      this.privy.on('login', () => this.handleLogin());
      this.privy.on('logout', () => this.handleLogout());
      
      console.log('✅ Privy wallet initialized');
      return true;
    } catch (error) {
      console.error('❌ Privy wallet initialization failed:', error);
      alert('Wallet connection failed; running in guest mode.');
      window.userWallet = null;
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
        window.userWallet = wallet.address;
        window.privyToken = accessToken;
        
        // Dispatch wallet connected event
        window.dispatchEvent(new CustomEvent('wallet:connected', {
          detail: { token: accessToken, wallet: wallet.address }
        }));
        
        this.updateWalletUI();
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
    window.userWallet = null;
    
    this.updateWalletUI();
    console.log('👋 User logged out');
  }

  // Connect wallet
  async connectWallet() {
    try {
      if (!this.privy) {
        throw new Error('Privy not initialized');
      }
      
      await this.privy.login();
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      alert('Failed to connect wallet');
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
      walletBtn.addEventListener('click', () => this.connectWallet());
    }
  }

  // Initialize wallet client
  async initialize() {
    const success = await this.initWallet();
    if (success) {
      this.setupEventListeners();
    }
    return success;
  }
}
