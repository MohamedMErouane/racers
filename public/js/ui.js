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
  showModal(id, content) {
    const modal = this.createModal(id, content);
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
  createModal(id, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = `modal-${id}`;
    
    modal.innerHTML = `
      <div class="modal-content">
        <span class="modal-close" onclick="window.ui.hideModal('${id}')">&times;</span>
        ${content}
      </div>
    `;
    
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
    const content = `
      <h2>🏆 Race Winner!</h2>
      <div class="winner-info">
        <div class="winner-name">${winner.name}</div>
        <div class="winner-time">${winner.finishTime ? new Date(winner.finishTime).toLocaleTimeString() : 'N/A'}</div>
      </div>
    `;
    
    this.showModal('winner', content);
  }

  // Show bet modal
  showBetModal(racers) {
    const racerOptions = racers.map(racer => 
      `<option value="${racer.id}">${racer.name}</option>`
    ).join('');
    
    const content = `
      <h2>💰 Place Bet</h2>
      <form id="betForm">
        <div class="form-group">
          <label for="racerSelect">Select Racer:</label>
          <select id="racerSelect" required>
            ${racerOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="betAmount">Amount (SOL):</label>
          <input type="number" id="betAmount" min="0.01" max="100" step="0.01" required>
        </div>
        <button type="submit">Place Bet</button>
      </form>
    `;
    
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
