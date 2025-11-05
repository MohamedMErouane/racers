// UI helper module
export class UI {
  constructor() {
    this.modals = new Map();
    this.notifications = [];
    this.initializeEventListeners();
  }

  // Initialize event listeners
  initializeEventListeners() {
    // Close winner modal when close button is clicked
    const closeWinnerBtn = document.getElementById('closeWinnerBtn');
    if (closeWinnerBtn) {
      closeWinnerBtn.addEventListener('click', () => {
        this.hideWinnerModal();
      });
    }

    // Close winner modal when clicking outside
    const winnerModal = document.getElementById('winnerModal');
    if (winnerModal) {
      winnerModal.addEventListener('click', (e) => {
        if (e.target === winnerModal) {
          this.hideWinnerModal();
        }
      });
    }

    // Initialize button functionality
    this.initializeButtons();
  }

  // Initialize button functionality
  initializeButtons() {
    // Voice/Mute button
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
      this.isMuted = false;
      voiceBtn.addEventListener('click', () => {
        this.toggleSound();
      });
    }

    // FAQ button
    const faqBtn = document.getElementById('faqBtn');
    if (faqBtn) {
      faqBtn.addEventListener('click', () => {
        this.showFAQModal();
      });
    }

    // Provably Fair button
    const fairBtn = document.getElementById('fairBtn');
    if (fairBtn) {
      fairBtn.addEventListener('click', () => {
        this.showFairModal();
      });
    }

    // Theme toggle button
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      // Initialize theme from localStorage or default to dark
      this.currentTheme = localStorage.getItem('theme') || 'dark';
      this.applyTheme(this.currentTheme);
      
      themeBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Modal close buttons
    const faqClose = document.getElementById('faqClose');
    if (faqClose) {
      faqClose.addEventListener('click', () => {
        this.hideFAQModal();
      });
    }

    const fairClose = document.getElementById('fairClose');
    if (fairClose) {
      fairClose.addEventListener('click', () => {
        this.hideFairModal();
      });
    }

    // Close modals when clicking outside
    const faqModal = document.getElementById('faqModal');
    if (faqModal) {
      faqModal.addEventListener('click', (e) => {
        if (e.target === faqModal) {
          this.hideFAQModal();
        }
      });
    }

    const fairModal = document.getElementById('fairModal');
    if (fairModal) {
      fairModal.addEventListener('click', (e) => {
        if (e.target === fairModal) {
          this.hideFairModal();
        }
      });
    }
  }

  // Toggle sound/mute
  toggleSound() {
    this.isMuted = !this.isMuted;
    const voiceBtn = document.getElementById('voiceBtn');
    
    if (this.isMuted) {
      voiceBtn.textContent = '🔇';
      voiceBtn.classList.add('muted');
      voiceBtn.title = 'Unmute Sound';
      // TODO: Implement actual audio muting logic here
      console.log('🔇 Sound muted');
    } else {
      voiceBtn.textContent = '🔊';
      voiceBtn.classList.remove('muted');
      voiceBtn.title = 'Mute Sound';
      // TODO: Implement actual audio unmuting logic here
      console.log('🔊 Sound unmuted');
    }
  }

  // Show FAQ Modal
  showFAQModal() {
    const modal = document.getElementById('faqModal');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  // Hide FAQ Modal
  hideFAQModal() {
    const modal = document.getElementById('faqModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  // Show Provably Fair Modal
  showFairModal() {
    const modal = document.getElementById('fairModal');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
      this.updateFairModalData();
    }
  }

  // Hide Provably Fair Modal
  hideFairModal() {
    const modal = document.getElementById('fairModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  // Update Provably Fair modal with current data
  updateFairModalData() {
    // Update current round info
    const gameStatus = document.getElementById('gameStatus');
    const currentRoundId = document.getElementById('currentRoundId');
    const currentRandomness = document.getElementById('currentRandomness');

    if (gameStatus) gameStatus.textContent = 'Active'; // TODO: Get from game state
    if (currentRoundId) currentRoundId.textContent = '1'; // TODO: Get from game state
    if (currentRandomness) currentRandomness.textContent = 'Hash: 0x...' // TODO: Get from game state

    // TODO: Update recent rounds data from API/game state
    const recentRounds = document.getElementById('recentRounds');
    if (recentRounds) {
      // This would be populated with actual round data
      recentRounds.innerHTML = `
        <div class="round-item">
          <p><strong>Round ID:</strong> Previous round data will appear here</p>
          <p><strong>Randomness:</strong> Will show actual VRF values or revealed seeds</p>
          <p><strong>Winner:</strong> Character index (0-7)</p>
          <p><strong>Settlement Tx:</strong> <a href="#" target="_blank">View on Explorer</a></p>
        </div>
      `;
    }
  }

  // Hide winner modal
  hideWinnerModal() {
    const modal = document.getElementById('winnerModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
    
    // Stop confetti animation when modal is closed
    this.stopConfettiAnimation();
  }

  // Test function to show winner modal (for debugging)
  testWinnerModal() {
    const testWinner = {
      name: 'Hana',
      image: 'images/characters/hana-face.png',
      totalPot: '20.00 SOL ($3305.60)',
      yourBet: '5.00 SOL ($825.00)',
      winnings: '+15.00 SOL ($2475.00)',
      netResult: '+10.00 SOL ($1650.00)'
    };
    this.showWinnerModal(testWinner);
  }

  // Show notification
  showNotification(message, type = 'info', duration = 3000) {
    const notification = {
      id: Date.now(),
      message,
      type,
      duration
    };
    
    this.notifications.push(notification);
    this.renderNotification(notification);
    
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, duration);
  }

  // Render notification
  renderNotification(notification) {
    const container = document.getElementById('notifications') || this.createNotificationContainer();
    
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification notification-${notification.type}`;
    notificationElement.id = `notification-${notification.id}`;
    notificationElement.textContent = notification.message;
    
    container.appendChild(notificationElement);
    
    // Animate in
    setTimeout(() => {
      notificationElement.classList.add('show');
    }, 100);
  }

  // Remove notification
  removeNotification(id) {
    const element = document.getElementById(`notification-${id}`);
    if (element) {
      element.classList.remove('show');
      setTimeout(() => {
        element.remove();
      }, 300);
    }
    
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  // Create notification container
  createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notifications';
    container.className = 'notifications-container';
    document.body.appendChild(container);
    return container;
  }

  // Show modal
  showModal(id, contentElement) {
    const modal = this.createModal(id, contentElement);
    document.body.appendChild(modal);
    this.modals.set(id, modal);
    
    // Animate in
    setTimeout(() => {
      modal.classList.add('show');
    }, 100);
  }

  // Hide modal
  hideModal(id) {
    const modal = this.modals.get(id);
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
        this.modals.delete(id);
      }, 300);
    }
  }

  // Create modal
  createModal(id, contentElement) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = `modal-${id}`;
    
    // Create modal content container
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Create close button
    const closeButton = document.createElement('span');
    closeButton.className = 'modal-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
      this.hideModal(id);
    });
    
    // Assemble modal structure
    modalContent.appendChild(closeButton);
    if (contentElement) {
      modalContent.appendChild(contentElement);
    }
    modal.appendChild(modalContent);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideModal(id);
      }
    });
    
    return modal;
  }

  // Update countdown display
  updateCountdown(seconds) {
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
      countdownElement.textContent = seconds;
    }
  }

  // Update race number
  updateRaceNumber(raceNumber) {
    const raceNumberElement = document.getElementById('raceNumber');
    if (raceNumberElement) {
      raceNumberElement.textContent = raceNumber;
    }
  }

  // Update next race time
  updateNextRaceTime(seconds) {
    const nextRaceElement = document.getElementById('nextRaceTime');
    if (nextRaceElement) {
      nextRaceElement.textContent = `${seconds}s`;
    }
  }

  // Show winner modal
  showWinnerModal(winner) {
    const modal = document.getElementById('winnerModal');
    const winnerAvatar = document.getElementById('winnerAvatar');
    const winnerName = document.getElementById('winnerName');
    const modalWinnerName = document.getElementById('modalWinnerName');
    const modalTotalPot = document.getElementById('modalTotalPot');
    const modalYourBet = document.getElementById('modalYourBet');
    const modalYourWinnings = document.getElementById('modalYourWinnings');
    const modalNetResult = document.getElementById('modalNetResult');
    
    if (modal) {
      // Update winner information
      if (winnerAvatar && winner.image) {
        winnerAvatar.src = winner.image;
        winnerAvatar.alt = winner.name;
      }
      
      if (winnerName) {
        winnerName.textContent = winner.name || 'Unknown';
      }
      
      if (modalWinnerName) {
        modalWinnerName.textContent = winner.name || 'Unknown';
      }
      
      // Update pot and betting information (you can customize these values)
      if (modalTotalPot) {
        modalTotalPot.textContent = winner.totalPot || '0.00 SOL';
      }
      
      if (modalYourBet) {
        modalYourBet.textContent = winner.yourBet || '0.00 SOL ($0.00)';
      }
      
      if (modalYourWinnings) {
        modalYourWinnings.textContent = winner.winnings || '+0.00 SOL ($0.00)';
      }
      
      if (modalNetResult) {
        modalNetResult.textContent = winner.netResult || '+0.00 SOL ($0.00)';
      }
      
      // Show the modal
      modal.classList.add('show');
      modal.style.display = 'flex';
      
      // Start confetti animation
      this.startConfettiAnimation();
    }
  }

  // Confetti Animation System
  startConfettiAnimation() {
    // Create confetti container if it doesn't exist
    let confettiContainer = document.getElementById('confettiContainer');
    if (!confettiContainer) {
      confettiContainer = document.createElement('div');
      confettiContainer.id = 'confettiContainer';
      confettiContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10000;
        overflow: hidden;
      `;
      document.body.appendChild(confettiContainer);
    }

    // Clear any existing confetti
    confettiContainer.innerHTML = '';

    // Create confetti particles
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', 
      '#ff9ff3', '#54a0ff', '#5f27cd', '#ff7675', '#74b9ff',
      '#fd79a8', '#fdcb6e', '#00b894', '#e17055', '#a29bfe',
      '#6c5ce7', '#fd79a8', '#55a3ff', '#00cec9', '#ffb8b8'
    ];
    const particleCount = 200;

    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        this.createConfettiParticle(confettiContainer, colors);
      }, i * 30); // Faster stagger for more density
    }

    // Add some special sparkle effects
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        this.createSparkleParticle(confettiContainer);
      }, i * 100);
    }

    // Stop confetti after 6 seconds
    setTimeout(() => {
      this.stopConfettiAnimation();
    }, 6000);
  }

  createConfettiParticle(container, colors) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 3; // 3-13px
    const startX = Math.random() * window.innerWidth;
    const duration = Math.random() * 4000 + 2000; // 2-6 seconds
    const rotation = Math.random() * 360;
    const rotationSpeed = (Math.random() - 0.5) * 1080; // More rotation variation

    // Different particle shapes
    const shapes = ['circle', 'square', 'triangle', 'star'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    let particleStyle = `
      position: absolute;
      top: -10px;
      left: ${startX}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      transform: rotate(${rotation}deg);
      opacity: 0.9;
      pointer-events: none;
      box-shadow: 0 0 6px ${color}40;
    `;

    // Apply different shapes
    switch(shape) {
      case 'circle':
        particleStyle += 'border-radius: 50%;';
        break;
      case 'square':
        particleStyle += 'border-radius: 2px;';
        break;
      case 'triangle':
        particleStyle += `
          width: 0;
          height: 0;
          background: transparent;
          border-left: ${size/2}px solid transparent;
          border-right: ${size/2}px solid transparent;
          border-bottom: ${size}px solid ${color};
        `;
        break;
      case 'star':
        particle.innerHTML = '★';
        particleStyle += `
          border-radius: 2px;
          color: ${color};
          background: transparent;
          font-size: ${size}px;
          text-align: center;
          line-height: ${size}px;
        `;
        break;
    }

    particle.style.cssText = particleStyle;
    container.appendChild(particle);

    // More dynamic animation with sway effect
    const swayAmount = (Math.random() - 0.5) * 400;
    const animation = particle.animate([
      {
        transform: `translateY(0) translateX(0) rotate(${rotation}deg) scale(1)`,
        opacity: 0.9
      },
      {
        transform: `translateY(${window.innerHeight/2}px) translateX(${swayAmount/2}px) rotate(${rotation + rotationSpeed/2}deg) scale(0.8)`,
        opacity: 0.7
      },
      {
        transform: `translateY(${window.innerHeight + 20}px) translateX(${swayAmount}px) rotate(${rotation + rotationSpeed}deg) scale(0.5)`,
        opacity: 0
      }
    ], {
      duration: duration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });

    // Remove particle when animation completes
    animation.addEventListener('finish', () => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    });
  }

  createSparkleParticle(container) {
    const sparkle = document.createElement('div');
    const size = Math.random() * 4 + 2; // 2-6px
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;
    const duration = Math.random() * 2000 + 1000; // 1-3 seconds

    sparkle.style.cssText = `
      position: absolute;
      top: ${startY}px;
      left: ${startX}px;
      width: ${size}px;
      height: ${size}px;
      background: radial-gradient(circle, #ffffff 0%, #ffff00 50%, transparent 70%);
      border-radius: 50%;
      opacity: 1;
      pointer-events: none;
      box-shadow: 0 0 10px #ffffff, 0 0 20px #ffff00, 0 0 30px #ffff00;
    `;

    container.appendChild(sparkle);

    // Sparkle animation with twinkle effect
    const animation = sparkle.animate([
      {
        transform: 'scale(0) rotate(0deg)',
        opacity: 0
      },
      {
        transform: 'scale(1.5) rotate(180deg)',
        opacity: 1
      },
      {
        transform: 'scale(0.5) rotate(360deg)',
        opacity: 0.8
      },
      {
        transform: 'scale(0) rotate(540deg)',
        opacity: 0
      }
    ], {
      duration: duration,
      easing: 'ease-in-out'
    });

    // Remove sparkle when animation completes
    animation.addEventListener('finish', () => {
      if (sparkle.parentNode) {
        sparkle.parentNode.removeChild(sparkle);
      }
    });
  }

  stopConfettiAnimation() {
    const confettiContainer = document.getElementById('confettiContainer');
    if (confettiContainer) {
      // Fade out the container
      confettiContainer.style.transition = 'opacity 1s ease-out';
      confettiContainer.style.opacity = '0';
      
      setTimeout(() => {
        if (confettiContainer.parentNode) {
          confettiContainer.parentNode.removeChild(confettiContainer);
        }
      }, 1000);
    }
  }

  // Show bet modal
  showBetModal(racers) {
    // Create modal content using safe DOM API
    const content = document.createElement('div');
    
    // Create title
    const title = document.createElement('h2');
    title.textContent = '💰 Place Bet';
    
    // Create form
    const form = document.createElement('form');
    form.id = 'betForm';
    
    // Create racer selection group
    const racerGroup = document.createElement('div');
    racerGroup.className = 'form-group';
    
    const racerLabel = document.createElement('label');
    racerLabel.setAttribute('for', 'racerSelect');
    racerLabel.textContent = 'Select Racer:';
    
    const racerSelect = document.createElement('select');
    racerSelect.id = 'racerSelect';
    racerSelect.required = true;
    
    // Add racer options safely
    racers.forEach(racer => {
      const option = document.createElement('option');
      option.value = racer.id;
      option.textContent = racer.name;
      racerSelect.appendChild(option);
    });
    
    racerGroup.appendChild(racerLabel);
    racerGroup.appendChild(racerSelect);
    
    // Create amount group
    const amountGroup = document.createElement('div');
    amountGroup.className = 'form-group';
    
    const amountLabel = document.createElement('label');
    amountLabel.setAttribute('for', 'betAmount');
    amountLabel.textContent = 'Amount (SOL):';
    
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.id = 'betAmount';
    amountInput.min = '0.01';
    amountInput.max = '100';
    amountInput.step = '0.01';
    amountInput.required = true;
    
    amountGroup.appendChild(amountLabel);
    amountGroup.appendChild(amountInput);
    
    // Create submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Place Bet';
    
    // Assemble form
    form.appendChild(racerGroup);
    form.appendChild(amountGroup);
    form.appendChild(submitButton);
    
    // Assemble content
    content.appendChild(title);
    content.appendChild(form);
    
    this.showModal('bet', content);
    
    // Handle bet form submission
    const betForm = document.getElementById('betForm');
    if (betForm) {
      betForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const racerId = document.getElementById('racerSelect').value;
        const amount = document.getElementById('betAmount').value;
        
        // Emit bet event
        window.dispatchEvent(new CustomEvent('bet:place', {
          detail: { racerId: parseInt(racerId), amount: parseFloat(amount) }
        }));
        
        this.hideModal('bet');
      });
    }
  }

  // Update balance display
  updateBalance(balance) {
    const balanceElement = document.getElementById('balance');
    if (balanceElement) {
      balanceElement.textContent = `${balance} SOL`;
    }
  }

  // Show loading state
  showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('loading');
    }
  }

  // Hide loading state
  hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.remove('loading');
    }
  }

  // Toggle between light and dark theme
  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
  }

  // Apply theme to the body
  applyTheme(theme) {
    const body = document.body;
    
    if (theme === 'light') {
      body.classList.add('light-theme');
    } else {
      body.classList.remove('light-theme');
    }
    
    // Notify other components about theme change
    window.dispatchEvent(new CustomEvent('theme:changed', {
      detail: { theme: theme }
    }));
  }

  // Get current theme
  getCurrentTheme() {
    return this.currentTheme || 'dark';
  }
}
