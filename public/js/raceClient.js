// Race client module
export class RaceClient {
  constructor(socket) {
    this.socket = socket;
    this.currentRace = null;
    this.raceState = null;
    this.isRacing = false;
    this.countdown = 0;
  }

  // Listen for race events
  setupEventHandlers() {
    this.socket.on('race:state', (state) => {
      this.updateRaceState(state);
    });

    this.socket.on('race:update', (update) => {
      this.updateRaceProgress(update);
    });

    this.socket.on('race:start', (data) => {
      this.handleRaceStart(data);
    });

    this.socket.on('race:countdown', (data) => {
      this.handleCountdown(data);
    });

    this.socket.on('race:end', (data) => {
      this.handleRaceEnd(data);
    });

    this.socket.on('bet:placed', (data) => {
      this.handleBetPlaced(data);
    });

    // Request current race state after connection is established
    this.socket.on('connect', () => {
      this.requestRaceState();
    });
  }

  // Update race state
  updateRaceState(state) {
    this.currentRace = state;
    this.raceState = state;
    this.updateRaceUI();
    
    // Initialize HUD elements from current race state
    this.updatePotStatistics({
      totalPot: state.totalPot || 0,
      totalBets: state.totalBets || 0,
      raceId: state.roundId
    });
  }

  // Update race progress
  updateRaceProgress(update) {
    if (this.raceState) {
      this.raceState.racers = update.racers;
      this.raceState.timeElapsed = update.timeElapsed;
      this.raceState.timeRemaining = update.timeRemaining;
      this.updateRaceVisualization();
    }
  }

  // Handle race start
  handleRaceStart(data) {
    // Update current race state with new data
    this.currentRace = data;
    
    if (data.status === 'countdown') {
      // Show countdown UI without starting animations
      this.isRacing = false;
      this.countdown = data.countdown;
      this.updateRaceUI();
      this.showCountdownUI();
      console.log('⏰ Race countdown started:', data);
    } else if (data.status === 'racing') {
      // Begin race visualization
      this.isRacing = true;
      this.countdown = 0;
      this.updateRaceUI();
      this.startRaceVisualization();
      console.log('🏁 Race started:', data);
    }
  }

  // Handle race end
  handleRaceEnd(data) {
    this.isRacing = false;
    this.updateRaceUI();
    this.showWinnerModal(data);
    console.log('🏆 Race ended:', data);
  }

  // Update race UI
  updateRaceUI() {
    if (!this.currentRace) return;
    
    const raceNumber = document.getElementById('raceNumber');
    if (raceNumber) {
      raceNumber.textContent = this.currentRace.roundId || '--';
    }
    
    this.updateCountdown(this.currentRace.countdown || 0);
  }

  // Update countdown
  updateCountdown(countdown) {
    this.countdown = countdown;
    
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
      countdownElement.textContent = countdown;
    }
    
    const nextRaceElement = document.getElementById('nextRaceTime');
    if (nextRaceElement) {
      nextRaceElement.textContent = `${countdown}s`;
    }
  }

  // Show countdown UI
  showCountdownUI() {
    // Update countdown display
    this.updateCountdown(this.countdown);
    
    // Show countdown message
    const countdownElement = document.getElementById('countdownMessage');
    if (countdownElement) {
      countdownElement.textContent = `Race starting in ${this.countdown} seconds...`;
      countdownElement.style.display = 'block';
    }
  }

  // Handle countdown updates
  handleCountdown(data) {
    this.countdown = data.countdown;
    this.updateCountdown(this.countdown);
    console.log('⏰ Countdown update:', this.countdown);
  }

  // Update race visualization
  updateRaceVisualization() {
    const canvas = document.getElementById('raceCanvas');
    if (canvas && this.raceState) {
      const ctx = canvas.getContext('2d');
      this.drawRacers(ctx, this.raceState.racers);
    }
  }

  // Draw racers on canvas
  drawRacers(ctx, racers) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    racers.forEach((racer, index) => {
      const x = (racer.x / 1000) * ctx.canvas.width;
      const y = 100 + (index * 80);
      
      ctx.fillStyle = racer.color || '#ff69b4';
      ctx.fillRect(x, y, 50, 50);
      
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.fillText(racer.name, x, y - 10);
    });
  }

  // Start race visualization
  startRaceVisualization() {
    // Hide countdown message when race starts
    const countdownElement = document.getElementById('countdownMessage');
    if (countdownElement) {
      countdownElement.style.display = 'none';
    }
    
    this.animateRace();
  }

  // Animate race
  animateRace() {
    if (this.isRacing) {
      this.updateRaceVisualization();
      requestAnimationFrame(() => this.animateRace());
    }
  }

  // Helper function to get CSS class for racer color
  getRacerColorClass(color) {
    const colorMap = {
      '#ff4757': 'racer-red',
      '#3742fa': 'racer-blue', 
      '#2ed573': 'racer-green',
      '#ffa502': 'racer-yellow',
      '#a55eea': 'racer-purple',
      '#ff6b9d': 'racer-pink',
      '#ff6348': 'racer-orange',
      '#17a2b8': 'racer-cyan'
    };
    return colorMap[color] || 'racer-red'; // Default to red if color not found
  }

  // Show winner modal
  showWinnerModal(data) {
    console.log('🏆 Race ended:', data);
    
    // Populate winner display
    const winnerDisplay = document.getElementById('winnerDisplay');
    if (winnerDisplay && data.winner) {
      // Clear existing content
      winnerDisplay.innerHTML = '';
      
      // Create winner racer container
      const winnerRacer = document.createElement('div');
      winnerRacer.className = 'winner-racer';
      
      // Create racer icon
      const racerIcon = document.createElement('div');
      const colorClass = this.getRacerColorClass(data.winner.color);
      racerIcon.className = `racer-icon ${colorClass}`;
      racerIcon.textContent = data.winner.name;
      
      // Create winner name
      const winnerName = document.createElement('div');
      winnerName.className = 'winner-name';
      winnerName.textContent = data.winner.name;
      
      // Create winner time
      const winnerTime = document.createElement('div');
      winnerTime.className = 'winner-time';
      // Compute elapsed time using startTime
      let timeText = '0.00s';
      if (data.startTime) {
        const elapsedMs = data.endTime - data.startTime;
        timeText = (elapsedMs / 1000).toFixed(2) + 's';
      }
      winnerTime.textContent = timeText;
      
      // Assemble the winner display
      winnerRacer.appendChild(racerIcon);
      winnerRacer.appendChild(winnerName);
      winnerRacer.appendChild(winnerTime);
      winnerDisplay.appendChild(winnerRacer);
    }
    
    // Populate pot summary
    const potSummary = document.getElementById('potSummary');
    if (potSummary) {
      // Use race state totals if available, otherwise show placeholder data
      const totalPot = data.totalPot || 0;
      const totalParticipants = data.totalBets || 0;
      
      // Clear existing content
      potSummary.innerHTML = '';
      
      // Create pot stats container
      const potStats = document.createElement('div');
      potStats.className = 'pot-stats';
      
      // Create Total Pot stat
      const totalPotItem = document.createElement('div');
      totalPotItem.className = 'stat-item';
      const totalPotLabel = document.createElement('span');
      totalPotLabel.className = 'stat-label';
      totalPotLabel.textContent = 'Total Pot:';
      const totalPotValue = document.createElement('span');
      totalPotValue.className = 'stat-value';
      totalPotValue.textContent = `${totalPot.toFixed(4)} SOL`;
      totalPotItem.appendChild(totalPotLabel);
      totalPotItem.appendChild(totalPotValue);
      
      // Create Participants stat
      const participantsItem = document.createElement('div');
      participantsItem.className = 'stat-item';
      const participantsLabel = document.createElement('span');
      participantsLabel.className = 'stat-label';
      participantsLabel.textContent = 'Participants:';
      const participantsValue = document.createElement('span');
      participantsValue.className = 'stat-value';
      participantsValue.textContent = totalParticipants.toString();
      participantsItem.appendChild(participantsLabel);
      participantsItem.appendChild(participantsValue);
      
      // Create Race ID stat
      const raceIdItem = document.createElement('div');
      raceIdItem.className = 'stat-item';
      const raceIdLabel = document.createElement('span');
      raceIdLabel.className = 'stat-label';
      raceIdLabel.textContent = 'Race ID:';
      const raceIdValue = document.createElement('span');
      raceIdValue.className = 'stat-value';
      raceIdValue.textContent = `#${data.roundId}`;
      raceIdItem.appendChild(raceIdLabel);
      raceIdItem.appendChild(raceIdValue);
      
      // Assemble pot stats
      potStats.appendChild(totalPotItem);
      potStats.appendChild(participantsItem);
      potStats.appendChild(raceIdItem);
      potSummary.appendChild(potStats);
    }
    
    // Populate top winners
    const topWinners = document.getElementById('topWinners');
    if (topWinners && data.results) {
      // Show race results without bet data since it's not available
      const winners = data.results.slice(0, 5);
      
      // Clear existing content
      topWinners.innerHTML = '';
      
      // Create winner items using DOM API
      winners.forEach((racer, index) => {
        const winnerItem = document.createElement('div');
        winnerItem.className = 'winner-item';
        
        const winnerInfo = document.createElement('div');
        winnerInfo.className = 'winner-info';
        
        const racerIcon = document.createElement('div');
        const colorClass = this.getRacerColorClass(racer.color);
        racerIcon.className = `racer-icon-small ${colorClass}`;
        racerIcon.textContent = racer.name;
        
        const winnerName = document.createElement('span');
        winnerName.className = 'winner-name';
        winnerName.textContent = racer.name;
        
        const winnerAmount = document.createElement('div');
        winnerAmount.className = 'winner-amount';
        winnerAmount.textContent = `Position: ${index + 1}`;
        
        // Assemble winner item
        winnerInfo.appendChild(racerIcon);
        winnerInfo.appendChild(winnerName);
        winnerItem.appendChild(winnerInfo);
        winnerItem.appendChild(winnerAmount);
        topWinners.appendChild(winnerItem);
      });
    }
    
    // Populate user results (placeholder - would need user bet data)
    const yourResults = document.getElementById('yourResults');
    if (yourResults) {
      // Clear existing content
      yourResults.innerHTML = '';
      
      // Create user stats container
      const userStats = document.createElement('div');
      userStats.className = 'user-stats';
      
      // Create Your Bets stat
      const yourBetsItem = document.createElement('div');
      yourBetsItem.className = 'stat-item';
      const yourBetsLabel = document.createElement('span');
      yourBetsLabel.className = 'stat-label';
      yourBetsLabel.textContent = 'Your Bets:';
      const yourBetsValue = document.createElement('span');
      yourBetsValue.className = 'stat-value';
      yourBetsValue.textContent = '0.0000 SOL';
      yourBetsItem.appendChild(yourBetsLabel);
      yourBetsItem.appendChild(yourBetsValue);
      
      // Create Result stat
      const resultItem = document.createElement('div');
      resultItem.className = 'stat-item';
      const resultLabel = document.createElement('span');
      resultLabel.className = 'stat-label';
      resultLabel.textContent = 'Result:';
      const resultValue = document.createElement('span');
      resultValue.className = 'stat-value';
      resultValue.textContent = 'No bets placed';
      resultItem.appendChild(resultLabel);
      resultItem.appendChild(resultValue);
      
      // Assemble user stats
      userStats.appendChild(yourBetsItem);
      userStats.appendChild(resultItem);
      yourResults.appendChild(userStats);
    }
    
    // Show the modal
    const modal = document.getElementById('winnerModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.hideWinnerModal();
      }, 5000);
    }
  }
  
  // Hide winner modal
  hideWinnerModal() {
    const modal = document.getElementById('winnerModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300); // Match CSS transition duration
    }
  }

  // Handle bet placed event for live updates
  handleBetPlaced(data) {
    // Update pot statistics in real-time
    this.updatePotStatistics(data);
    
    // Show notification for new bet
    if (window.ui) {
      window.ui.showNotification(
        `New bet placed: ${data.bet.amount} SOL on Racer ${data.bet.racerId}`,
        'info',
        3000
      );
    }
  }

  // Update pot statistics display
  updatePotStatistics(data) {
    // Update HUD total pot display
    const hudTotalPotElement = document.getElementById('totalPot');
    if (hudTotalPotElement && typeof data.totalPot === 'number') {
      hudTotalPotElement.textContent = `${data.totalPot.toFixed(4)} SOL`;
    } else if (hudTotalPotElement) {
      hudTotalPotElement.textContent = '0.0000 SOL';
    }
    
    // Update HUD total bets count
    const hudTotalBetsElement = document.getElementById('totalBets');
    if (hudTotalBetsElement && typeof data.totalBets === 'number') {
      hudTotalBetsElement.textContent = data.totalBets.toString();
    } else if (hudTotalBetsElement) {
      hudTotalBetsElement.textContent = '0';
    }
    
    // Update modal total pot display using specific ID
    const totalPotElement = document.getElementById('modalTotalPot');
    if (totalPotElement && typeof data.totalPot === 'number') {
      totalPotElement.textContent = `${data.totalPot.toFixed(4)} SOL`;
    } else if (totalPotElement) {
      totalPotElement.textContent = '0.0000 SOL';
    }
    
    // Update modal total bets count using specific ID
    const totalBetsElement = document.getElementById('modalTotalBets');
    if (totalBetsElement && typeof data.totalBets === 'number') {
      totalBetsElement.textContent = data.totalBets.toString();
    } else if (totalBetsElement) {
      totalBetsElement.textContent = '0';
    }
    
    // Update race ID if available
    const raceIdElement = document.getElementById('modalRaceId');
    if (raceIdElement && data.raceId) {
      raceIdElement.textContent = `#${data.raceId}`;
    }
  }

  // Request race state
  requestRaceState() {
    this.socket.emit('race:state');
  }
}
