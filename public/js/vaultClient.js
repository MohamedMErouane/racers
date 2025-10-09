// Vault client module for Solana deposits and withdrawals
export class VaultClient {
  constructor(getToken, walletClient) {
    this.getToken = getToken;
    this.walletClient = walletClient;
    this.isProcessing = false;
    
    // Bind methods
    this.handleDeposit = this.handleDeposit.bind(this);
    this.handleWithdraw = this.handleWithdraw.bind(this);
    this.showDepositModal = this.showDepositModal.bind(this);
    this.showWithdrawModal = this.showWithdrawModal.bind(this);
    
    this.setupEventListeners();
  }

  // Setup event listeners for deposit/withdraw modals
  setupEventListeners() {
    // Deposit button
    const depositBtn = document.getElementById('depositBtn');
    if (depositBtn) {
      depositBtn.addEventListener('click', this.showDepositModal);
    }

    // Withdraw button  
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
      withdrawBtn.addEventListener('click', this.showWithdrawModal);
    }

    // Deposit modal events
    const depositModal = document.getElementById('depositModal');
    const closeDepositModal = document.getElementById('closeDepositModal');
    const confirmDepositBtn = document.getElementById('confirmDepositBtn');

    if (closeDepositModal) {
      closeDepositModal.addEventListener('click', () => {
        depositModal.style.display = 'none';
      });
    }

    if (confirmDepositBtn) {
      confirmDepositBtn.addEventListener('click', this.handleDeposit);
    }

    // Withdraw modal events
    const withdrawModal = document.getElementById('withdrawModal');
    const closeWithdrawModal = document.getElementById('closeWithdrawModal');
    const confirmWithdrawBtn = document.getElementById('confirmWithdrawBtn');

    if (closeWithdrawModal) {
      closeWithdrawModal.addEventListener('click', () => {
        withdrawModal.style.display = 'none';
      });
    }

    if (confirmWithdrawBtn) {
      confirmWithdrawBtn.addEventListener('click', this.handleWithdraw);
    }

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === depositModal) {
        depositModal.style.display = 'none';
      }
      if (event.target === withdrawModal) {
        withdrawModal.style.display = 'none';
      }
    });
  }

  // Show deposit modal
  async showDepositModal() {
    if (!this.walletClient.isAuthenticated) {
      await this.walletClient.connectWallet();
      return;
    }

    const modal = document.getElementById('depositModal');
    if (modal) {
      modal.style.display = 'flex';
      
      // Update wallet balance display
      await this.updateWalletBalance();
    }
  }

  // Show withdraw modal
  async showWithdrawModal() {
    if (!this.walletClient.isAuthenticated) {
      await this.walletClient.connectWallet();
      return;
    }

    const modal = document.getElementById('withdrawModal');
    if (modal) {
      modal.style.display = 'flex';
      
      // Update platform balance display
      await this.updatePlatformBalance();
    }
  }

  // Update wallet balance display
  async updateWalletBalance() {
    try {
      if (!this.walletClient.isAuthenticated) return;

      // Get SOL balance from wallet (try different global variable names)
      const SolanaWeb3 = window.solanaWeb3 || window.solana || window.Solana;
      if (!SolanaWeb3) {
        console.warn('Solana Web3 library not loaded, using mock balance');
        const mockBalance = 0.0;
        const balanceElement = document.getElementById('walletBalance');
        if (balanceElement) {
          balanceElement.textContent = `Balance: ${mockBalance.toFixed(3)} SOL`;
        }
        
        // Update USD value
        const usdElement = document.getElementById('walletBalanceUSD');
        if (usdElement) {
          usdElement.textContent = `≈ $0.00 USD`;
        }
        return;
      }
      
      const connection = new SolanaWeb3.Connection('https://api.devnet.solana.com');
      const walletAddress = this.walletClient.getWalletAddress();
      
      // Check if wallet address is valid Solana format (mock addresses start with 'Mock')
      if (!walletAddress || walletAddress.startsWith('Mock') || walletAddress.length < 32) {
        console.warn('Mock or invalid wallet address detected, using demo balance');
        const mockBalance = 0.0;
        const balanceElement = document.getElementById('walletBalance');
        if (balanceElement) {
          balanceElement.textContent = `Balance: ${mockBalance.toFixed(3)} SOL`;
        }
        
        // Update USD value
        const usdElement = document.getElementById('walletBalanceUSD');
        if (usdElement) {
          usdElement.textContent = `≈ $0.00 USD`;
        }
        return;
      }
      
      const balance = await connection.getBalance(new SolanaWeb3.PublicKey(walletAddress));
      const solBalance = balance / 1e9; // Convert lamports to SOL

      const balanceElement = document.getElementById('walletBalance');
      if (balanceElement) {
        balanceElement.textContent = `Balance: ${solBalance.toFixed(3)} SOL`;
      }

      // Update USD value (using mock price for now)
      const solPrice = 20; // Mock SOL price
      const usdValue = solBalance * solPrice;
      const usdElement = document.getElementById('walletBalanceUSD');
      if (usdElement) {
        usdElement.textContent = `≈ $${usdValue.toFixed(2)} USD`;
      }
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      
      // Fallback to mock balance on any error (including base58 decode errors)
      const mockBalance = 0.0;
      const balanceElement = document.getElementById('walletBalance');
      if (balanceElement) {
        balanceElement.textContent = `Balance: ${mockBalance.toFixed(3)} SOL`;
      }
      
      // Update USD value
      const usdElement = document.getElementById('walletBalanceUSD');
      if (usdElement) {
        usdElement.textContent = `≈ $0.00 USD`;
      }
    }
  }

  // Update platform balance display
  async updatePlatformBalance() {
    try {
      if (!this.walletClient.isAuthenticated) return;

      const token = await this.getToken();
      const response = await fetch('/api/balance', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const balance = parseFloat(data.balance);

        const balanceElement = document.getElementById('platformBalance');
        if (balanceElement) {
          balanceElement.textContent = `Platform Balance: ${balance.toFixed(3)} SOL`;
        }

        // Update USD value (using mock price for now)
        const solPrice = 20; // Mock SOL price
        const usdValue = balance * solPrice;
        const usdElement = document.getElementById('platformBalanceUSD');
        if (usdElement) {
          usdElement.textContent = `≈ $${usdValue.toFixed(2)} USD`;
        }
      }
    } catch (error) {
      console.error('Error updating platform balance:', error);
    }
  }

  // Refresh both wallet and platform balances
  async refreshBalance() {
    try {
      await Promise.all([
        this.updateWalletBalance(),
        this.updatePlatformBalance()
      ]);
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  }

  // Handle deposit transaction
  async handleDeposit() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      const confirmBtn = document.getElementById('confirmDepositBtn');
      const originalText = confirmBtn.textContent;
      confirmBtn.textContent = 'Processing...';
      confirmBtn.disabled = true;

      // Get deposit amount
      const amountInput = document.getElementById('depositAmount');
      const amount = parseFloat(amountInput.value);

      if (!amount || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const token = await this.getToken();
      if (!token) {
        throw new Error('Please connect your wallet');
      }

      // Step 1: Initialize vault if needed
      await this.ensureVaultInitialized();

      // Step 2: Build deposit transaction
      console.log('Building deposit transaction...');
      const buildResponse = await fetch('/api/vault/deposit/build', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      const buildResult = await buildResponse.json();
      if (!buildResult.success) {
        throw new Error(buildResult.error || 'Failed to build transaction');
      }

      // Check if we're in demo mode
      if (buildResult.demoMode) {
        console.log('🎭 Demo mode detected - simulating deposit');
        confirmBtn.textContent = 'Processing Demo...';
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In demo mode, simulate the deposit by calling the API with a mock transaction
        console.log('🎭 Simulating deposit API call...');
        confirmBtn.textContent = 'Updating Balance...';
        
        try {
          const mockProcessResponse = await fetch('/api/vault/deposit/process', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              amount, 
              signedTransaction: 'demo_mock_transaction_' + Date.now()
            })
          });
          
          const processResult = await mockProcessResponse.json();
          console.log('🎭 Demo deposit API result:', processResult);
        } catch (apiError) {
          console.warn('🎭 Demo API call failed, continuing with local simulation:', apiError);
        }
        
        confirmBtn.textContent = 'Demo Success!';
        
        // Show success message
        this.showSuccess(`Demo: Successfully deposited ${amount} SOL! In production, this would be a real blockchain transaction.`);
        this.refreshBalance();
        return;
      }

      // Step 3: Sign transaction with wallet (production mode)
      console.log('Signing transaction...');
      confirmBtn.textContent = 'Sign Transaction...';
      
      const signedTx = await this.signTransaction(buildResult.transaction);
      if (!signedTx) {
        throw new Error('Transaction signing was cancelled');
      }

      // Step 4: Process signed transaction
      console.log('Processing transaction...');
      confirmBtn.textContent = 'Confirming...';
      
      const processResponse = await fetch('/api/vault/deposit/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          signedTransaction: signedTx,
          amount 
        })
      });

      const processResult = await processResponse.json();
      if (!processResult.success) {
        throw new Error(processResult.error || 'Transaction failed');
      }

      // Success!
      console.log('Deposit successful!', processResult);
      alert(`Deposit successful! Transaction: ${processResult.signature}`);
      
      // Close modal and reset form
      document.getElementById('depositModal').style.display = 'none';
      amountInput.value = '';

      // Update balance display
      this.updateBalanceDisplays();

    } catch (error) {
      console.error('Deposit failed:', error);
      alert(`Deposit failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
      const confirmBtn = document.getElementById('confirmDepositBtn');
      confirmBtn.textContent = 'DEPOSIT NOW';
      confirmBtn.disabled = false;
    }
  }

  // Handle withdraw transaction
  async handleWithdraw() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      const confirmBtn = document.getElementById('confirmWithdrawBtn');
      const originalText = confirmBtn.textContent;
      confirmBtn.textContent = 'Processing...';
      confirmBtn.disabled = true;

      // Get withdraw amount
      const amountInput = document.getElementById('withdrawAmount');
      const amount = parseFloat(amountInput.value);

      if (!amount || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const token = await this.getToken();
      if (!token) {
        throw new Error('Please connect your wallet');
      }

      // Step 1: Build withdraw transaction
      console.log('Building withdraw transaction...');
      const buildResponse = await fetch('/api/vault/withdraw/build', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      const buildResult = await buildResponse.json();
      if (!buildResult.success) {
        throw new Error(buildResult.error || 'Failed to build transaction');
      }

      // Check if we're in demo mode
      if (buildResult.demoMode) {
        console.log('🎭 Demo mode detected - simulating withdraw');
        confirmBtn.textContent = 'Processing Demo...';
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In demo mode, simulate the withdraw by calling the API with a mock transaction
        console.log('🎭 Simulating withdraw API call...');
        confirmBtn.textContent = 'Updating Balance...';
        
        try {
          const mockProcessResponse = await fetch('/api/vault/withdraw/process', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              amount, 
              signedTransaction: 'demo_mock_transaction_' + Date.now()
            })
          });
          
          const processResult = await mockProcessResponse.json();
          console.log('🎭 Demo withdraw API result:', processResult);
        } catch (apiError) {
          console.warn('🎭 Demo API call failed, continuing with local simulation:', apiError);
        }
        
        confirmBtn.textContent = 'Demo Success!';
        
        // Show success message
        this.showSuccess(`Demo: Successfully withdrew ${amount} SOL! In production, this would be a real blockchain transaction.`);
        this.refreshBalance();
        return;
      }

      // Step 2: Sign transaction with wallet (production mode)
      console.log('Signing transaction...');
      confirmBtn.textContent = 'Sign Transaction...';
      
      const signedTx = await this.signTransaction(buildResult.transaction);
      if (!signedTx) {
        throw new Error('Transaction signing was cancelled');
      }

      // Step 3: Process signed transaction
      console.log('Processing transaction...');
      confirmBtn.textContent = 'Confirming...';
      
      const processResponse = await fetch('/api/vault/withdraw/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          signedTransaction: signedTx,
          amount 
        })
      });

      const processResult = await processResponse.json();
      if (!processResult.success) {
        throw new Error(processResult.error || 'Transaction failed');
      }

      // Success!
      console.log('Withdraw successful!', processResult);
      alert(`Withdraw successful! Transaction: ${processResult.signature}`);
      
      // Close modal and reset form
      document.getElementById('withdrawModal').style.display = 'none';
      amountInput.value = '';

      // Update balance display
      this.updateBalanceDisplays();

    } catch (error) {
      console.error('Withdraw failed:', error);
      alert(`Withdraw failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
      const confirmBtn = document.getElementById('confirmWithdrawBtn');
      confirmBtn.textContent = 'WITHDRAW NOW';
      confirmBtn.disabled = false;
    }
  }

  // Ensure vault is initialized
  async ensureVaultInitialized() {
    try {
      const token = await this.getToken();
      
      // Try to build an init transaction
      const response = await fetch('/api/vault/initialize/build', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      // If vault already exists, we're good
      if (result.alreadyExists) {
        console.log('Vault already initialized');
        return;
      }

      // If we got a transaction, we need to initialize
      if (result.success && result.transaction) {
        console.log('Initializing vault...');
        
        const signedTx = await this.signTransaction(result.transaction);
        if (!signedTx) {
          throw new Error('Vault initialization cancelled');
        }

        const processResponse = await fetch('/api/vault/initialize/process', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ signedTransaction: signedTx })
        });

        const processResult = await processResponse.json();
        if (!processResult.success) {
          throw new Error('Vault initialization failed');
        }

        console.log('Vault initialized successfully');
      }
    } catch (error) {
      console.error('Vault initialization error:', error);
      throw error;
    }
  }

  // Sign transaction using connected wallet
  async signTransaction(transaction) {
    try {
      // Convert base64 to Uint8Array
      const txBuffer = Uint8Array.from(atob(transaction), c => c.charCodeAt(0));
      const tx = solanaWeb3.Transaction.from(txBuffer);
      
      // First try to connect to Phantom if not connected
      if (!window.solana || !window.solana.isConnected) {
        if (window.solana && window.solana.isPhantom) {
          await window.solana.connect();
        } else {
          throw new Error('Phantom wallet not found. Please install Phantom wallet.');
        }
      }
      
      // Sign the transaction
      const signedTx = await window.solana.signTransaction(tx);
      
      // Return as base64 string
      return btoa(String.fromCharCode(...signedTx.serialize()));
      
    } catch (error) {
      console.error('Transaction signing failed:', error);
      
      // Handle user rejection
      if (error.code === 4001 || error.message.includes('User rejected')) {
        throw new Error('Transaction was cancelled by user');
      }
      
      // Handle connection issues
      if (error.message.includes('not connected')) {
        throw new Error('Please connect your Phantom wallet first');
      }
      
      throw new Error(`Signing failed: ${error.message}`);
    }
  }

  // Update all balance displays
  async updateBalanceDisplays() {
    await this.updateWalletBalance();
    await this.updatePlatformBalance();
    
    // Also update the main balance display
    window.dispatchEvent(new CustomEvent('balance:update'));
  }

  // Show success message to user
  showSuccess(message) {
    console.log('✅ Success:', message);
    
    // Create and show a success notification
    this.showNotification(message, 'success');
  }

  // Show error message to user
  showError(message) {
    console.error('❌ Error:', message);
    
    // Create and show an error notification
    this.showNotification(message, 'error');
  }

  // Show notification to user
  showNotification(message, type = 'success') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to body (will appear on left due to CSS)
    document.body.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 50);
    
    // Auto remove after 3 seconds (changed from 4000 to 3000)
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 200); // Wait for slide-out animation
    }, 3000); // Changed from 4000ms to 3000ms (3 seconds)
  }
}