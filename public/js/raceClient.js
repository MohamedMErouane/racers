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

  // Show winner modal
  showWinnerModal(data) {
    console.log('🏆 Race ended:', data);
    
    // Populate winner display
    const winnerDisplay = document.getElementById('winnerDisplay');
    if (winnerDisplay && data.winner) {
      winnerDisplay.innerHTML = `
        <div class="winner-racer">
          <div class="racer-icon" style="background-color: ${data.winner.color}">${data.winner.name}</div>
          <div class="winner-name">${data.winner.name}</div>
          <div class="winner-time">${data.winner.finalPosition?.toFixed(2) || '0.00'}s</div>
        </div>
      `;
    }
    
    // Populate pot summary
    const potSummary = document.getElementById('potSummary');
    if (potSummary) {
      const totalBets = data.results?.reduce((sum, racer) => sum + (racer.bets || 0), 0) || 0;
      const totalWinners = data.results?.filter(racer => racer.bets > 0).length || 0;
      potSummary.innerHTML = `
        <div class="pot-stats">
          <div class="stat-item">
            <span class="stat-label">Total Pot:</span>
            <span class="stat-value">${totalBets.toFixed(4)} SOL</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Participants:</span>
            <span class="stat-value">${totalWinners}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Race ID:</span>
            <span class="stat-value">#${data.roundId}</span>
          </div>
        </div>
      `;
    }
    
    // Populate top winners
    const topWinners = document.getElementById('topWinners');
    if (topWinners && data.results) {
      const winners = data.results
        .filter(racer => racer.bets > 0)
        .sort((a, b) => b.bets - a.bets)
        .slice(0, 5);
      
      topWinners.innerHTML = winners.map(racer => `
        <div class="winner-item">
          <div class="winner-info">
            <div class="racer-icon-small" style="background-color: ${racer.color}">${racer.name}</div>
            <span class="winner-name">${racer.name}</span>
          </div>
          <div class="winner-amount">${racer.bets.toFixed(4)} SOL</div>
        </div>
      `).join('');
    }
    
    // Populate user results (placeholder - would need user bet data)
    const yourResults = document.getElementById('yourResults');
    if (yourResults) {
      yourResults.innerHTML = `
        <div class="user-stats">
          <div class="stat-item">
            <span class="stat-label">Your Bets:</span>
            <span class="stat-value">0.0000 SOL</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Result:</span>
            <span class="stat-value">No bets placed</span>
          </div>
        </div>
      `;
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

  // Request race state
  requestRaceState() {
    this.socket.emit('race:state');
  }
}
