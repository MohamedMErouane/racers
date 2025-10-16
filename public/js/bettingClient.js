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
    
    // Listen for betting distribution updates
    this.socket.on('betting_distribution', (data) => {
      this.updateBettingDistribution(data);
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
    if (!characterGrid || !this.racers) return;
    
    characterGrid.innerHTML = '';
    
    this.racers.forEach(racer => {
      if (!racer.name) return;
      
      const racerElement = document.createElement('div');
      racerElement.className = 'character-grid-item';
      racerElement.dataset.racerId = racer.id;
      
      // Create image element
      const img = document.createElement('img');
      img.className = 'character-avatar';
      img.alt = racer.name;
      img.src = racer.avatar || `images/characters/${racer.name.toLowerCase()}-face.png`;
      
      // Handle image load success
      img.onload = () => {
        console.log(`✅ Loaded image for ${racer.name}`);
      };
      
      // Handle image load error
      img.onerror = () => {
        console.warn(`❌ Failed to load image for ${racer.name}: ${img.src}`);
        
        // Create fallback
        const fallback = document.createElement('div');
        fallback.className = 'character-fallback';
        fallback.style.background = racer.color || '#ff69b4';
        fallback.textContent = racer.name.charAt(0).toUpperCase();
        
        // Replace image with fallback
        img.style.display = 'none';
        racerElement.appendChild(fallback);
      };
      
      // Add click handler
      racerElement.addEventListener('click', () => {
        // Remove selected class from others
        document.querySelectorAll('.character-grid-item').forEach(el => {
          el.classList.remove('selected');
        });
        
        // Add selected class to clicked item
        racerElement.classList.add('selected');
        
        // Call the select racer method
        this.selectRacer(racer.id, racer.name);
      });
      
      racerElement.appendChild(img);
      characterGrid.appendChild(racerElement);
    });
    
    console.log(`✅ Character grid populated with ${this.racers.length} racers`);
    
    // Add keyboard navigation for horizontal scrolling
    characterGrid.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        characterGrid.scrollBy({ left: -120, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        characterGrid.scrollBy({ left: 120, behavior: 'smooth' });
      }
    });
    
    // Make it focusable for keyboard navigation
    characterGrid.setAttribute('tabindex', '0');
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

  // Update pie chart with betting distribution data
  updateBettingDistribution(distributionData) {
    console.log('📊 Updating betting distribution:', distributionData);
    
    // Update pie chart visual
    this.updatePieChart(distributionData);
    
    // Update favorite character in center
    this.updateFavoriteCharacter(distributionData);
    
    // Update distribution legend
    this.updateDistributionLegend(distributionData);
  }

  // Update the pie chart visual
  updatePieChart(data) {
    const pieChart = document.querySelector('.pie-chart-visual');
    if (!pieChart) return;
    
    // Create SVG pie chart
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '200');
    svg.setAttribute('viewBox', '0 0 200 200');
    
    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    
    let currentAngle = 0;
    
    // Clear existing content
    pieChart.innerHTML = '';
    
    // Create pie slices for each character with bets
    Object.entries(data).forEach(([racerId, raceData]) => {
      if (raceData.percentage > 0) {
        const racer = this.racers.find(r => r.id == racerId);
        if (!racer) return;
        
        const sliceAngle = (raceData.percentage / 100) * 360;
        const endAngle = currentAngle + sliceAngle;
        
        // Create pie slice path
        const path = this.createPieSlice(centerX, centerY, radius, currentAngle, endAngle, racer.color || '#ff69b4');
        svg.appendChild(path);
        
        currentAngle = endAngle;
      }
    });
    
    pieChart.appendChild(svg);
  }

  // Create a pie slice SVG path
  createPieSlice(centerX, centerY, radius, startAngle, endAngle, color) {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', color);
    path.setAttribute('stroke', '#2a2a3a');
    path.setAttribute('stroke-width', '2');
    
    return path;
  }

  // Update favorite character in pie chart center
  updateFavoriteCharacter(data) {
    // Find character with highest percentage
    let favoriteRacerId = null;
    let highestPercentage = 0;
    
    Object.entries(data).forEach(([racerId, raceData]) => {
      if (raceData.percentage > highestPercentage) {
        highestPercentage = raceData.percentage;
        favoriteRacerId = racerId;
      }
    });
    
    const favoriteCharacter = this.racers.find(r => r.id == favoriteRacerId);
    if (!favoriteCharacter) return;
    
    // Update pie chart center with favorite character
    const pieChartCenter = document.querySelector('.pie-chart-center');
    if (pieChartCenter) {
      pieChartCenter.innerHTML = '';
      
      const img = document.createElement('img');
      img.src = favoriteCharacter.avatar || `images/characters/${favoriteCharacter.name.toLowerCase()}-face.png`;
      img.alt = favoriteCharacter.name;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      `;
      
      img.onerror = () => {
        // Fallback
        const fallback = document.createElement('div');
        fallback.style.cssText = `
          width: 100%;
          height: 100%;
          background: ${favoriteCharacter.color || '#ff69b4'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 20px;
        `;
        fallback.textContent = favoriteCharacter.name.charAt(0).toUpperCase();
        pieChartCenter.appendChild(fallback);
      };
      
      img.onload = () => {
        console.log(`✅ Updated favorite character: ${favoriteCharacter.name}`);
      };
      
      pieChartCenter.appendChild(img);
    }
    
    // Update favorite text
    const favoriteInfo = document.querySelector('.favorite-text');
    if (favoriteInfo) {
      favoriteInfo.innerHTML = `Favorite: <span style="color: ${favoriteCharacter.color || '#ff69b4'}">${favoriteCharacter.name}</span> (${highestPercentage}%)`;
    }
  }

  // Update distribution legend with character images and percentages
  updateDistributionLegend(data) {
    const distributionLegend = document.querySelector('.distribution-legend');
    if (!distributionLegend) {
      console.warn('Distribution legend element not found');
      return;
    }
    
    distributionLegend.innerHTML = '';
    
    // Sort by percentage (highest first) and filter out 0%
    const sortedData = Object.entries(data)
      .filter(([racerId, raceData]) => raceData.percentage > 0)
      .sort(([,a], [,b]) => b.percentage - a.percentage)
      .slice(0, 6); // Show top 6
    
    sortedData.forEach(([racerId, raceData]) => {
      const racer = this.racers.find(r => r.id == racerId);
      if (!racer) return;
      
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(30, 30, 40, 0.8);
        margin-bottom: 6px;
        border-left: 4px solid ${racer.color || '#ff69b4'};
        transition: all 0.3s ease;
      `;
      
      // Left side: Color indicator + Character image + Name
      const leftSide = document.createElement('div');
      leftSide.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      `;
      
      // Color indicator
      const colorDot = document.createElement('div');
      colorDot.style.cssText = `
        width: 12px;
        height: 12px;
        background: ${racer.color || '#ff69b4'};
        border-radius: 50%;
        flex-shrink: 0;
      `;
      
      // Character image
      const img = document.createElement('img');
      img.src = racer.avatar || `images/characters/${racer.name.toLowerCase()}-face.png`;
      img.alt = racer.name;
      img.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid ${racer.color || '#ff69b4'};
        flex-shrink: 0;
      `;
      
      img.onerror = () => {
        const fallback = document.createElement('div');
        fallback.style.cssText = `
          width: 24px;
          height: 24px;
          background: ${racer.color || '#ff69b4'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          border: 2px solid ${racer.color || '#ff69b4'};
          flex-shrink: 0;
        `;
        fallback.textContent = racer.name.charAt(0).toUpperCase();
        leftSide.replaceChild(fallback, img);
      };
      
      // Character name
      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = `
        color: white;
        font-size: 14px;
        font-weight: bold;
        flex: 1;
      `;
      nameSpan.textContent = racer.name;
      
      // Right side: Percentage
      const percentSpan = document.createElement('span');
      percentSpan.style.cssText = `
        color: ${racer.color || '#ff69b4'};
        font-size: 14px;
        font-weight: bold;
        min-width: 45px;
        text-align: right;
      `;
      percentSpan.textContent = `${raceData.percentage.toFixed(1)}%`;
      
      // Assemble the legend item
      leftSide.appendChild(colorDot);
      leftSide.appendChild(img);
      leftSide.appendChild(nameSpan);
      
      legendItem.appendChild(leftSide);
      legendItem.appendChild(percentSpan);
      
      // Add hover effect
      legendItem.addEventListener('mouseenter', () => {
        legendItem.style.background = 'rgba(40, 40, 50, 0.9)';
        legendItem.style.transform = 'translateY(-1px)';
      });
      
      legendItem.addEventListener('mouseleave', () => {
        legendItem.style.background = 'rgba(30, 30, 40, 0.8)';
        legendItem.style.transform = 'translateY(0)';
      });
      
      distributionLegend.appendChild(legendItem);
    });
    
    console.log(`✅ Updated distribution legend with ${sortedData.length} items`);
  }

  // Listen for betting distribution updates from server
  setupBettingDistributionListener() {
    if (!this.socket) return;
    
    this.socket.on('betting_distribution', (data) => {
      console.log('📊 Betting distribution update:', data);
      this.updateBettingDistribution(data);
    });
  }

  // Fetch current betting distribution (now generates random data)
  async fetchBettingDistribution() {
    try {
      // Generate random betting distribution data
      const distributionData = this.generateRandomBettingDistribution();
      this.updateBettingDistribution(distributionData);
      return distributionData;
    } catch (error) {
      console.error('Error generating betting distribution:', error);
      this.showDefaultDistribution();
    }
  }

  // Generate random betting distribution for testing
  generateRandomBettingDistribution() {
    if (!this.racers || this.racers.length === 0) {
      return {};
    }
    
    const distributionData = {};
    let totalPercentage = 0;
    
    // Randomly select 3-5 characters to have bets
    const numBettedCharacters = Math.floor(Math.random() * 3) + 3; // 3-5 characters
    const selectedRacers = [...this.racers]
      .sort(() => Math.random() - 0.5) // Shuffle array
      .slice(0, numBettedCharacters);
    
    // Generate random percentages that add up to 100%
    const randomPercentages = [];
    for (let i = 0; i < selectedRacers.length; i++) {
      if (i === selectedRacers.length - 1) {
        // Last character gets remaining percentage
        randomPercentages.push(100 - totalPercentage);
      } else {
        // Random percentage between 5% and 40%
        const percentage = Math.floor(Math.random() * 35) + 5;
        randomPercentages.push(Math.min(percentage, 100 - totalPercentage - (selectedRacers.length - i - 1) * 5));
        totalPercentage += randomPercentages[i];
      }
    }
    
    // Assign data to selected racers
    selectedRacers.forEach((racer, index) => {
      distributionData[racer.id] = {
        percentage: randomPercentages[index],
        totalBets: Math.floor(Math.random() * 50) + 10, // 10-60 total bets
        totalAmount: (randomPercentages[index] * 0.1 * Math.random() + 0.5).toFixed(2) // Random SOL amount
      };
    });
    
    console.log('🎲 Generated random betting distribution:', distributionData);
    return distributionData;
  }

  // Add a method to refresh betting distribution periodically
  startRandomDistributionUpdates() {
    // Update every 10-15 seconds with new random data
    setInterval(() => {
      const newDistribution = this.generateRandomBettingDistribution();
      this.updateBettingDistribution(newDistribution);
    }, Math.random() * 5000 + 10000); // 10-15 seconds
  }

  // Update your initialize method
  async initialize() {
    this.setupEventListeners();
    await this.loadRacers(); // Load racers and populate character grid
    
    // Setup betting distribution with random data
    this.setupBettingDistributionListener();
    await this.fetchBettingDistribution();
    
    // Start periodic random updates
    this.startRandomDistributionUpdates();
    
    // Try to fetch balance if user is already connected
    await this.fetchBalance();
  }
}