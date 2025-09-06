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

    this.socket.on('race:end', (data) => {
      this.handleRaceEnd(data);
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
    this.isRacing = true;
    this.countdown = 0;
    this.updateRaceUI();
    this.startRaceVisualization();
    console.log('🏁 Race started:', data);
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
    // Implementation for winner modal
    console.log('Winner:', data.winner);
  }

  // Request race state
  requestRaceState() {
    this.socket.emit('race:state');
  }
}
