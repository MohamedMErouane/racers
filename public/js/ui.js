// UI helper module
export class UI {
  constructor() {
    this.modals = new Map();
    this.notifications = [];
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
    // Create modal content using safe DOM API
    const content = document.createElement('div');
    
    // Create title
    const title = document.createElement('h2');
    title.textContent = '🏆 Race Winner!';
    
    // Create winner info container
    const winnerInfo = document.createElement('div');
    winnerInfo.className = 'winner-info';
    
    // Create winner name
    const winnerName = document.createElement('div');
    winnerName.className = 'winner-name';
    winnerName.textContent = winner.name;
    
    // Create winner time
    const winnerTime = document.createElement('div');
    winnerTime.className = 'winner-time';
    winnerTime.textContent = winner.finishTime ? new Date(winner.finishTime).toLocaleTimeString() : 'N/A';
    
    // Assemble content
    winnerInfo.appendChild(winnerName);
    winnerInfo.appendChild(winnerTime);
    content.appendChild(title);
    content.appendChild(winnerInfo);
    
    this.showModal('winner', content);
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
}
