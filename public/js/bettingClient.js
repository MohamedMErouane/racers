// Betting client module
export class BettingClient {
  constructor(getToken, socket) {
    this.getToken = getToken;
    this.socket = socket;
    this.balance = 0;
    this.selectedRacer = null;
    this.selectedAmount = 0;
    this.racers = [];
    this.currentRaceBets = []; // Track bets for current race
    this.setupSocketListeners();
  }

  // Setup socket event listeners for betting
  setupSocketListeners() {
    if (!this.socket) return;
    
    // Listen for winning notifications
    this.socket.on('bet:win', (data) => {
      this.handleWinNotification(data);
    });
    
    // Listen for rakeback notifications
    this.socket.on('bet:rakeback', (data) => {
      this.handleRakebackNotification(data);
    });
    
    // Listen for race settled events
    this.socket.on('race:settled', (data) => {
      this.handleRaceSettled(data);
    });
    
    // Listen for new race starting to clear current race bets
    this.socket.on('race:countdown', (data) => {
      this.handleNewRace(data);
    });
    
    // Listen for real-time odds updates
    this.socket.on('odds_update', (data) => {
      this.handleOddsUpdate(data);
    });
  }
  
  // Handle new race starting
  handleNewRace(data) {
    // Clear current race bets when new race starts
    this.currentRaceBets = [];
    console.log('New race started, cleared current race bets');
    
    // Fetch initial odds for the new race
    setTimeout(() => {
      this.fetchOdds();
    }, 1000); // Small delay to ensure race is fully initialized
  }
  
  // Handle winning notification
  handleWinNotification(data) {
    // Update balance
    this.balance = parseFloat(data.newBalance);
    this.updateBalanceDisplay();
    
    // Show winning notification
    if (window.ui) {
      window.ui.showNotification(data.message, 'success', 5000);
    }
    
    console.log(`🎉 You won! Bet: ${data.betAmount} SOL, Winnings: ${data.winnings} SOL, New Balance: ${data.newBalance} SOL`);
  }
  
  // Handle rakeback notification
  handleRakebackNotification(data) {
    // Update balance
    this.balance = parseFloat(data.newBalance);
    this.updateBalanceDisplay();
    
    // Show rakeback notification
    if (window.ui) {
      window.ui.showNotification(data.message, 'info', 4000);
    }
    
    console.log(`💰 Rakeback received: ${data.rakeback} SOL, New Balance: ${data.newBalance} SOL`);
  }
  
  // Handle race settled event
  handleRaceSettled(data) {
    console.log(`Race ${data.raceId} settled. Winner: ${data.winner?.name || 'Unknown'}`);
    
    // Refresh balance after settlement to ensure accuracy
    setTimeout(() => {
      this.fetchBalance();
    }, 1000);
  }

  // Handle real-time odds updates
  handleOddsUpdate(data) {
    if (!data || !data.odds) return;
    
    console.log('📊 Odds update received:', data);
    
    // Update odds display for each racer
    Object.keys(data.odds).forEach(racerId => {
      const oddsData = data.odds[racerId];
      this.updateRacerOddsDisplay(parseInt(racerId), oddsData);
    });
    
    // Update total pot display if element exists
    const totalPotElement = document.getElementById('totalPot');
    if (totalPotElement && data.totalPot !== undefined) {
      totalPotElement.textContent = `${data.totalPot.toFixed(2)} SOL`;
    }
  }

  // Update odds display for a specific racer
  updateRacerOddsDisplay(racerId, oddsData) {
    const characterItem = document.querySelector(`[data-racer-id="${racerId}"]`);
    if (!characterItem) return;
    
    // Find or create odds display element
    let oddsElement = characterItem.querySelector('.racer-odds');
    if (!oddsElement) {
      oddsElement = document.createElement('div');
      oddsElement.className = 'racer-odds';
      oddsElement.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        z-index: 10;
      `;
      characterItem.style.position = 'relative';
      characterItem.appendChild(oddsElement);
    }
    
    // Update odds text with payout multiplier
    oddsElement.textContent = `${oddsData.odds}x`;
    
    // Color code based on odds (green = good odds, red = poor odds)
    if (oddsData.odds >= 3.0) {
      oddsElement.style.backgroundColor = 'rgba(34, 197, 94, 0.9)'; // Green for high odds
    } else if (oddsData.odds >= 2.0) {
      oddsElement.style.backgroundColor = 'rgba(234, 179, 8, 0.9)'; // Yellow for medium odds
    } else {
      oddsElement.style.backgroundColor = 'rgba(239, 68, 68, 0.9)'; // Red for low odds
    }
  }

  // Load racer data and populate character grid
  async loadRacers() {
    try {
      const response = await fetch('/js/animeRacers.json');
      this.racers = await response.json();
      this.populateCharacterGrid();
    } catch (error) {
      console.error('Error loading racers:', error);
    }
  }

  // Populate character grid for selection
  populateCharacterGrid() {
    const characterGrid = document.getElementById('characterGrid');
    if (!characterGrid || !this.racers.length) return;

    characterGrid.innerHTML = '';
    
    this.racers.forEach(racer => {
      const characterCard = document.createElement('div');
      characterCard.className = 'character-grid-item';
      characterCard.dataset.racerId = racer.id;
      
      characterCard.innerHTML = `
        <img src="${racer.avatar}" alt="${racer.name}" class="character-avatar">
        <div class="character-name">${racer.name}</div>
        <div class="character-stats">
          <div class="stat">Speed: ${racer.speed}</div>
          <div class="stat">Acc: ${racer.acceleration}</div>
        </div>
      `;
      
      characterCard.addEventListener('click', () => {
        this.selectRacer(racer.id, racer.name);
      });
      
      characterGrid.appendChild(characterCard);
    });
  }

  // Select a racer for betting
  selectRacer(racerId, racerName) {
    this.selectedRacer = racerId;
    
    // Update selected character display
    const selectedCharacterName = document.getElementById('selectedCharacterName');
    if (selectedCharacterName) {
      selectedCharacterName.textContent = racerName;
    }
    
    // Remove previous selection
    document.querySelectorAll('.character-grid-item.selected').forEach(card => {
      card.classList.remove('selected');
    });
    
    // Add selection to clicked character
    const selectedCard = document.querySelector(`[data-racer-id="${racerId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }
    
    this.updatePlaceBetButton();
    console.log(`Selected racer: ${racerName} (ID: ${racerId})`);
  }

  // Get user balance
  async fetchBalance() {
    try {
      const token = await this.getToken();
      if (!token) {
        console.log('No token available for balance fetch');
        return;
      }

      const response = await fetch('/api/balance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.balance = parseFloat(data.balance);
        this.updateBalanceDisplay();
        return this.balance;
      } else {
        console.error('Failed to fetch balance:', response.status);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }

  // Get current race odds
  async fetchOdds() {
    try {
      const response = await fetch('/api/odds');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.odds) {
          // Handle successful odds data
          this.handleOddsUpdate(data);
          return data;
        } else {
          console.log('No active race for odds');
          return null;
        }
      } else {
        console.error('Failed to fetch odds:', response.status);
      }
    } catch (error) {
      console.error('Error fetching odds:', error);
    }
  }

  // Update balance display in UI
  updateBalanceDisplay() {
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
      balanceElement.textContent = `${this.balance.toFixed(1)} SOL`;
    }
  }

  // Set selected racer
  setSelectedRacer(racerId) {
    this.selectedRacer = racerId;
    this.updatePlaceBetButton();
  }

  // Set bet amount
  setBetAmount(amount) {
    this.selectedAmount = parseFloat(amount) || 0;
    this.updatePlaceBetButton();
  }

  // Update place bet button text
  updatePlaceBetButton() {
    const placeBetBtn = document.getElementById('placeBetBtn');
    if (placeBetBtn) {
      if (this.selectedAmount > 0 && this.selectedRacer) {
        placeBetBtn.textContent = `Place Bet - ${this.selectedAmount} SOL`;
        placeBetBtn.disabled = this.selectedAmount > this.balance;
        
        if (this.selectedAmount > this.balance) {
          placeBetBtn.classList.add('insufficient-balance');
        } else {
          placeBetBtn.classList.remove('insufficient-balance');
        }
      } else {
        placeBetBtn.textContent = 'Place Bet - 0.0 SOL';
        placeBetBtn.disabled = true;
      }
    }
  }

  // Place a bet
  async placeBet() {
    try {
      if (!this.selectedRacer || this.selectedAmount <= 0) {
        throw new Error('Please select a racer and bet amount');
      }

      if (this.selectedAmount > this.balance) {
        throw new Error('Insufficient balance');
      }

      const token = await this.getToken();
      if (!token) {
        throw new Error('Please connect your wallet to place bets');
      }

      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          racerId: this.selectedRacer,
          amount: this.selectedAmount
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local balance
        this.balance = parseFloat(result.newBalance);
        this.updateBalanceDisplay();
        
        // Track this bet for the current race
        this.currentRaceBets.push({
          racerId: this.selectedRacer,
          amount: this.selectedAmount,
          timestamp: Date.now()
        });
        
        // Reset bet selection
        this.selectedAmount = 0;
        this.updatePlaceBetButton();
        
        // Clear custom bet input
        const customBetInput = document.getElementById('customBetAmount');
        if (customBetInput) {
          customBetInput.value = '';
        }
        
        // Show success notification
        if (window.ui) {
          window.ui.showNotification(`Bet placed successfully! ${this.selectedAmount} SOL on racer ${this.selectedRacer}`, 'success');
        }
        
        return result;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to place bet');
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      if (window.ui) {
        window.ui.showNotification(error.message, 'error');
      }
      throw error;
    }
  }

  // Get bet history
  async fetchBetHistory() {
    try {
      const token = await this.getToken();
      if (!token) {
        console.log('No token available for bet history');
        return [];
      }

      const response = await fetch('/api/bet-history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const betHistory = await response.json();
        return betHistory;
      } else {
        console.error('Failed to fetch bet history:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching bet history:', error);
      return [];
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Quick bet buttons
    document.querySelectorAll('.quick-bet-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amount = e.target.dataset.amount;
        this.setBetAmount(amount);
        
        // Update custom input
        const customBetInput = document.getElementById('customBetAmount');
        if (customBetInput) {
          customBetInput.value = amount;
        }
      });
    });

    // Custom bet amount input
    const customBetInput = document.getElementById('customBetAmount');
    if (customBetInput) {
      customBetInput.addEventListener('input', (e) => {
        this.setBetAmount(e.target.value);
      });
    }

    // Place bet button
    const placeBetBtn = document.getElementById('placeBetBtn');
    if (placeBetBtn) {
      placeBetBtn.addEventListener('click', async () => {
        try {
          await this.placeBet();
        } catch (error) {
          // Error already handled in placeBet method
        }
      });
    }

    // Racer selection (need to add this when race is displayed)
    this.setupRacerSelection();
  }

  // Setup racer selection listeners (legacy - now handled in selectRacer method)
  setupRacerSelection() {
    // Racer selection is now handled by character grid clicks
    // This method kept for compatibility
  }

  // Get current race bets (for race results modal)
  getCurrentRaceBets() {
    return this.currentRaceBets;
  }
  
  // Get total bet amount for current race
  getCurrentRaceBetTotal() {
    return this.currentRaceBets.reduce((sum, bet) => sum + bet.amount, 0);
  }

  // Initialize betting client
  async initialize() {
    this.setupEventListeners();
    await this.loadRacers(); // Load racers and populate character grid
    // Try to fetch balance if user is already connected
    await this.fetchBalance();
  }
}