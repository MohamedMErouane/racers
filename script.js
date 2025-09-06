/*
 * RACERS.FUN - REAL-TIME RACING PLATFORM
 * Frontend refactored for server-state driven architecture
 */

// Global configuration
const CONFIG = window.CONFIG || {
    WS_URL: 'ws://localhost:3001',
    API_URL: 'http://localhost:3001/api',
    RACE_DURATION: 12000,
    COUNTDOWN_DURATION: 10000,
    TICK_RATE: 100
};

// Global state management
let appState = {
    user: null,
    isAuthenticated: false,
    walletConnected: false,
    currentRace: null,
    raceState: null,
    isRacing: false,
    countdown: 0,
    myBet: null,
    totalPot: 0,
    bettingDistribution: {},
    chatMessages: [],
    isTyping: false,
    onlineUsers: 0,
    selectedRacer: null,
    betAmount: 0,
    chatCollapsed: false,
    soundEnabled: true,
    raceSocket: null,
    chatSocket: null,
    privy: null
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Racers.fun...');
    
    try {
        await initializePrivy();
        await initializeWebSockets();
        initializeUI();
        await startApplication();
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
});

// Privy initialization
async function initializePrivy() {
    try {
        if (typeof Privy === 'undefined') {
            throw new Error('Privy SDK not loaded');
        }
        
        appState.privy = new Privy({
    appId: 'cmermm5bm003bjo0bgsoffojs',
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
        
        await appState.privy.ready();
        
        if (appState.privy.authenticated) {
            await handlePrivyLogin();
        }
        
        appState.privy.on('login', handlePrivyLogin);
        appState.privy.on('logout', handlePrivyLogout);
        
        console.log('✅ Privy initialized');
    } catch (error) {
        console.error('❌ Privy initialization failed:', error);
        throw error;
    }
}

// Handle Privy login
async function handlePrivyLogin() {
    try {
        const user = appState.privy.user;
        const wallet = user.wallet;
        
        if (wallet) {
            appState.user = {
                id: user.id,
                email: user.email?.address,
                wallet: wallet.address,
                username: user.email?.address?.split('@')[0] || `user_${user.id.slice(0, 8)}`
            };
            
            appState.isAuthenticated = true;
            appState.walletConnected = true;
            
            updateWalletUI();
            updateUserProfile();
            
            if (appState.currentRace) {
                await joinRace(appState.currentRace.id);
            }
            
            console.log('✅ User authenticated:', appState.user);
        }
    } catch (error) {
        console.error('❌ Login failed:', error);
    }
}

// Handle Privy logout
function handlePrivyLogout() {
    appState.user = null;
    appState.isAuthenticated = false;
    appState.walletConnected = false;
    
    updateWalletUI();
    
    if (appState.currentRace) {
        leaveRace(appState.currentRace.id);
    }
    
    console.log('👋 User logged out');
}

// WebSocket initialization
async function initializeWebSockets() {
    try {
        appState.raceSocket = io(CONFIG.WS_URL, {
            auth: {
                token: await getAuthToken()
            }
        });
        
        appState.chatSocket = io(`${CONFIG.WS_URL}/chat`, {
            auth: {
                token: await getAuthToken()
            }
        });
        
        setupRaceSocketHandlers();
        setupChatSocketHandlers();
        
        console.log('✅ WebSocket connections established');
    } catch (error) {
        console.error('❌ WebSocket initialization failed:', error);
        throw error;
    }
}

// Setup race socket event handlers
function setupRaceSocketHandlers() {
    const socket = appState.raceSocket;
    
    socket.on('connect', () => {
        console.log('🔌 Connected to race server');
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Disconnected from race server');
    });
    
    socket.on('race_state', (state) => {
        updateRaceState(state);
    });
    
    socket.on('race_update', (update) => {
        updateRaceProgress(update);
    });
    
    socket.on('race_started', (data) => {
        handleRaceStart(data);
    });
    
    socket.on('race_ended', (data) => {
        handleRaceEnd(data);
    });
    
    socket.on('countdown_update', (data) => {
        updateCountdown(data.countdown);
    });
    
    socket.on('bet_placed', (data) => {
        handleBetPlaced(data);
    });
    
    socket.on('user_joined', (data) => {
        handleUserJoined(data);
    });
    
    socket.on('user_left', (data) => {
        handleUserLeft(data);
    });
    
    socket.on('error', (error) => {
        console.error('Race socket error:', error);
        showError(error.message);
    });
}

// Setup chat socket event handlers
function setupChatSocketHandlers() {
    const socket = appState.chatSocket;
    
    socket.on('connect', () => {
        console.log('💬 Connected to chat server');
    });
    
    socket.on('disconnect', () => {
        console.log('💬 Disconnected from chat server');
    });
    
    socket.on('chat_history', (data) => {
        updateChatHistory(data.messages);
    });
    
    socket.on('new_message', (data) => {
        addChatMessage(data.message);
    });
    
    socket.on('user_typing', (data) => {
        handleUserTyping(data);
    });
    
    socket.on('user_joined_chat', (data) => {
        handleUserJoinedChat(data);
    });
    
    socket.on('user_left_chat', (data) => {
        handleUserLeftChat(data);
    });
    
    socket.on('error', (error) => {
        console.error('Chat socket error:', error);
    });
}

// Get authentication token
async function getAuthToken() {
    if (appState.privy && appState.privy.authenticated) {
        return await appState.privy.getAccessToken();
    }
    return null;
}

// Join race
async function joinRace(raceId) {
    try {
        if (!appState.isAuthenticated) {
            showError('Please connect your wallet to join races');
            return;
        }
        
        appState.raceSocket.emit('join_race', { raceId });
        console.log(`🏁 Joined race: ${raceId}`);
        } catch (error) {
        console.error('❌ Failed to join race:', error);
        showError('Failed to join race');
    }
}

// Leave race
function leaveRace(raceId) {
    try {
        appState.raceSocket.emit('leave_race', { raceId });
        console.log(`🏁 Left race: ${raceId}`);
    } catch (error) {
        console.error('❌ Failed to leave race:', error);
    }
}

// Place bet
async function placeBet(racerId, amount) {
    try {
        if (!appState.isAuthenticated) {
            showError('Please connect your wallet to place bets');
        return;
    }
    
        if (!appState.currentRace) {
            showError('No active race to bet on');
            return;
        }
        
        if (appState.myBet) {
            showError('You already have a bet in this race');
            return;
        }
        
        if (amount <= 0 || amount > 100) {
            showError('Bet amount must be between 0.1 and 100 SOL');
        return;
    }
    
        appState.raceSocket.emit('place_bet', {
            raceId: appState.currentRace.id,
            racerId: racerId,
            amount: amount
        });
        
        console.log(`💰 Placing bet: ${amount} SOL on racer ${racerId}`);
    } catch (error) {
        console.error('❌ Failed to place bet:', error);
        showError('Failed to place bet');
    }
}

// Send chat message
async function sendChatMessage(message) {
    try {
        if (!appState.isAuthenticated) {
            showError('Please connect your wallet to chat');
            return;
        }
        
        if (!appState.currentRace) {
            showError('No active race to chat in');
        return;
    }
    
        if (!message.trim()) {
        return;
    }
    
        appState.chatSocket.emit('send_message', {
            raceId: appState.currentRace.id,
            message: message.trim()
        });
        
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = '';
        }
    } catch (error) {
        console.error('❌ Failed to send message:', error);
        showError('Failed to send message');
    }
}

// Update race state
function updateRaceState(state) {
    appState.currentRace = state.race;
    appState.raceState = state;
    appState.myBet = state.bets[appState.user?.id] || null;
    appState.totalPot = state.race.totalPot;
    
    updateRaceUI();
    updateBettingUI();
    updateChatUI();
    
    console.log('🏁 Race state updated:', state.race);
}

// Update race progress
function updateRaceProgress(update) {
    if (appState.raceState) {
        appState.raceState.racers = update.racers;
        appState.raceState.timeElapsed = update.timeElapsed;
        appState.raceState.timeRemaining = update.timeRemaining;
        
        updateRaceVisualization();
    }
}

// Handle race start
function handleRaceStart(data) {
    appState.isRacing = true;
    appState.countdown = 0;
    
    updateRaceUI();
    updateBettingUI();
    
    startRaceVisualization();
    
    console.log('🏁 Race started:', data);
}

// Handle race end
function handleRaceEnd(data) {
    appState.isRacing = false;
    
    updateRaceUI();
    updateBettingUI();
    
    showWinnerModal(data);
    
    console.log('🏆 Race ended:', data);
}

// Update countdown
function updateCountdown(countdown) {
    appState.countdown = countdown;
    
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
        countdownElement.textContent = countdown;
    }
    
    const nextRaceElement = document.getElementById('nextRaceTime');
    if (nextRaceElement) {
        nextRaceElement.textContent = `${countdown}s`;
    }
}

// Handle bet placed
function handleBetPlaced(data) {
    updateBettingDistribution(data);
    
    appState.totalPot = data.totalPot;
    updateTotalPotDisplay();
    
    console.log('💰 Bet placed:', data);
}

// Handle user joined
function handleUserJoined(data) {
    appState.onlineUsers++;
    updateOnlineUsersDisplay();
    
    console.log('👤 User joined:', data);
}

// Handle user left
function handleUserLeft(data) {
    appState.onlineUsers = Math.max(0, appState.onlineUsers - 1);
    updateOnlineUsersDisplay();
    
    console.log('👤 User left:', data);
}

// Update chat history
function updateChatHistory(messages) {
    appState.chatMessages = messages;
    renderChatMessages();
}

// Add chat message
function addChatMessage(message) {
    appState.chatMessages.push(message);
    
    if (appState.chatMessages.length > 100) {
        appState.chatMessages = appState.chatMessages.slice(-100);
    }
    
    renderChatMessages();
    
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Handle user typing
function handleUserTyping(data) {
    updateTypingIndicators(data);
}

// Handle user joined chat
function handleUserJoinedChat(data) {
    addChatMessage({
        id: `system_${Date.now()}`,
        userId: 'system',
        username: 'System',
        message: `${data.username} joined the chat`,
        type: 'system',
        timestamp: Date.now()
    });
}

// Handle user left chat
function handleUserLeftChat(data) {
    addChatMessage({
        id: `system_${Date.now()}`,
        userId: 'system',
        username: 'System',
        message: `${data.username} left the chat`,
        type: 'system',
        timestamp: Date.now()
    });
}

// Initialize UI
function initializeUI() {
    setupEventListeners();
    initializeRaceVisualization();
    initializeBettingUI();
    initializeChatUI();
    initializeWalletUI();
    
    console.log('✅ UI initialized');
}

// Setup event listeners
function setupEventListeners() {
    const walletBtn = document.getElementById('walletBtn');
    if (walletBtn) {
        walletBtn.addEventListener('click', connectWallet);
    }
    
    const depositBtn = document.getElementById('depositBtn');
    if (depositBtn) {
        depositBtn.addEventListener('click', showDepositModal);
    }
    
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', showWithdrawModal);
    }
    
    const chatCollapseBtn = document.getElementById('chatCollapseBtn');
    if (chatCollapseBtn) {
        chatCollapseBtn.addEventListener('click', toggleChatCollapse);
    }
    
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', handleChatInput);
        chatInput.addEventListener('input', handleChatTyping);
    }
    
    setupBettingEventListeners();
    setupCharacterSelection();
    
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', toggleSound);
    }
}

// Setup betting event listeners
function setupBettingEventListeners() {
    document.querySelectorAll('.quick-bet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const amount = parseFloat(e.target.dataset.amount);
            setBetAmount(amount);
        });
    });
    
    const customBetInput = document.getElementById('customBetAmount');
    if (customBetInput) {
        customBetInput.addEventListener('input', (e) => {
            const amount = parseFloat(e.target.value) || 0;
            setBetAmount(amount);
        });
    }
    
    const placeBetBtn = document.getElementById('placeBetBtn');
    if (placeBetBtn) {
        placeBetBtn.addEventListener('click', placeSelectedBet);
    }
}

// Setup character selection
function setupCharacterSelection() {
    document.querySelectorAll('.character-grid-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const racerId = parseInt(e.currentTarget.dataset.racerId);
            selectRacer(racerId);
        });
    });
}

// Connect wallet
async function connectWallet() {
    try {
        if (!appState.privy) {
            throw new Error('Privy not initialized');
        }
        
        await appState.privy.login();
    } catch (error) {
        console.error('❌ Wallet connection failed:', error);
        showError('Failed to connect wallet');
    }
}

// Set bet amount
function setBetAmount(amount) {
    appState.betAmount = amount;
    
    const placeBetBtn = document.getElementById('placeBetBtn');
    if (placeBetBtn) {
        placeBetBtn.textContent = `Place Bet - ${amount.toFixed(1)} SOL`;
        placeBetBtn.disabled = !appState.selectedRacer || amount <= 0;
    }
}

// Select racer
function selectRacer(racerId) {
    appState.selectedRacer = racerId;
    
    updateCharacterSelection();
    updatePlaceBetButton();
}

// Place selected bet
async function placeSelectedBet() {
    if (!appState.selectedRacer || appState.betAmount <= 0) {
        showError('Please select a racer and bet amount');
        return;
    }
    
    await placeBet(appState.selectedRacer, appState.betAmount);
}

// Toggle chat collapse
function toggleChatCollapse() {
    appState.chatCollapsed = !appState.chatCollapsed;
    
    const chatPanel = document.getElementById('chatPanel');
    const collapseIcon = document.querySelector('.collapse-icon');
    
    if (appState.chatCollapsed) {
        chatPanel.classList.add('collapsed');
        collapseIcon.textContent = '▶';
        } else {
        chatPanel.classList.remove('collapsed');
        collapseIcon.textContent = '◀';
    }
}

// Handle chat input
function handleChatInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage(e.target.value);
    }
}

// Handle chat typing
function handleChatTyping(e) {
    if (!appState.isTyping && e.target.value.length > 0) {
        appState.isTyping = true;
        appState.chatSocket.emit('typing_start', { 
            raceId: appState.currentRace?.id 
        });
    } else if (appState.isTyping && e.target.value.length === 0) {
        appState.isTyping = false;
        appState.chatSocket.emit('typing_stop', { 
            raceId: appState.currentRace?.id 
        });
    }
}

// Toggle sound
function toggleSound() {
    appState.soundEnabled = !appState.soundEnabled;
    
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.textContent = appState.soundEnabled ? '🔊' : '🔇';
    }
}

// Start application
async function startApplication() {
    try {
        await fetchCurrentRace();
        
        if (appState.isAuthenticated && appState.currentRace) {
            await joinRace(appState.currentRace.id);
        }
        
        if (appState.isAuthenticated && appState.currentRace) {
            appState.chatSocket.emit('join_race_chat', { 
                raceId: appState.currentRace.id 
            });
        }
        
        console.log('✅ Application started');
    } catch (error) {
        console.error('❌ Failed to start application:', error);
        throw error;
    }
}

// Fetch current race
async function fetchCurrentRace() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/race/current`);
        const data = await response.json();
        
        if (data.race) {
            updateRaceState(data);
        }
    } catch (error) {
        console.error('❌ Failed to fetch current race:', error);
    }
}

// Update wallet UI
function updateWalletUI() {
    const walletBtn = document.getElementById('walletBtn');
    const walletActions = document.getElementById('walletActions');
    
    if (appState.walletConnected && appState.user) {
        walletBtn.textContent = `${appState.user.wallet.slice(0, 6)}...${appState.user.wallet.slice(-4)}`;
        walletActions.style.display = 'flex';
        } else {
        walletBtn.textContent = 'Connect';
        walletActions.style.display = 'none';
    }
}

// Update user profile
function updateUserProfile() {
    const usernameElements = document.querySelectorAll('.username');
    usernameElements.forEach(el => {
        el.textContent = appState.user?.username || 'Guest';
    });
}

// Update race UI
function updateRaceUI() {
    if (!appState.currentRace) return;
    
    const raceNumber = document.getElementById('raceNumber');
    if (raceNumber) {
        raceNumber.textContent = appState.currentRace.roundId;
    }
    
    updateCountdown(appState.currentRace.countdown || 0);
    updateTotalPotDisplay();
    
    const totalBets = document.getElementById('totalBets');
    if (totalBets) {
        totalBets.textContent = appState.currentRace.totalBets || 0;
    }
    
    const myBets = document.getElementById('myBets');
    if (myBets) {
        const myBetAmount = appState.myBet ? appState.myBet.amount : 0;
        myBets.textContent = `${myBetAmount.toFixed(1)} SOL`;
    }
}

// Update betting UI
function updateBettingUI() {
        const bettingPanel = document.querySelector('.betting-panel');
        if (bettingPanel) {
        if (appState.isRacing) {
            bettingPanel.classList.add('race-active');
        } else {
            bettingPanel.classList.remove('race-active');
        }
    }
    
    updatePlaceBetButton();
}

// Update place bet button
function updatePlaceBetButton() {
    const placeBetBtn = document.getElementById('placeBetBtn');
    if (placeBetBtn) {
        const disabled = !appState.selectedRacer || 
                        appState.betAmount <= 0 || 
                        appState.isRacing || 
                        appState.myBet;
        
        placeBetBtn.disabled = disabled;
        
        if (appState.myBet) {
            placeBetBtn.textContent = `Bet Placed - ${appState.myBet.amount.toFixed(1)} SOL`;
    } else {
            placeBetBtn.textContent = `Place Bet - ${appState.betAmount.toFixed(1)} SOL`;
        }
    }
}

// Update total pot display
function updateTotalPotDisplay() {
    const totalPot = document.getElementById('totalPot');
    if (totalPot) {
        totalPot.textContent = `${appState.totalPot.toFixed(1)} SOL`;
    }
}

// Update online users display
function updateOnlineUsersDisplay() {
    const onlineCount = document.getElementById('onlineCount');
    if (onlineCount) {
        onlineCount.textContent = appState.onlineUsers;
    }
}

// Update character selection
function updateCharacterSelection() {
    document.querySelectorAll('.character-grid-item').forEach(item => {
        const racerId = parseInt(item.dataset.racerId);
        if (racerId === appState.selectedRacer) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Update betting distribution
function updateBettingDistribution(data) {
    updatePieChart(data);
    updateFavoriteCharacter(data);
}

// Update pie chart
function updatePieChart(data) {
    // Implementation for pie chart update
}

// Update favorite character
function updateFavoriteCharacter(data) {
    const favoriteCharacter = document.getElementById('favoriteCharacter');
    const favoritePercentage = document.getElementById('favoritePercentage');
    
    if (favoriteCharacter && favoritePercentage) {
        // Calculate favorite from betting distribution
    }
}

// Update chat UI
function updateChatUI() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.disabled = !appState.isAuthenticated;
        chatInput.placeholder = appState.isAuthenticated 
            ? 'Type your message...' 
            : 'Connect wallet to chat...';
    }
}

// Render chat messages
function renderChatMessages() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = '';
    
    appState.chatMessages.forEach(message => {
        const messageElement = createChatMessageElement(message);
        chatMessages.appendChild(messageElement);
    });
}

// Create chat message element
function createChatMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type === 'system' ? 'system' : ''}`;
    
    if (message.type === 'system') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${message.message}</div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="username">${message.username}</div>
                <div class="message-text">${message.message}</div>
            </div>
        `;
    }
    
    return messageDiv;
}

// Initialize race visualization
function initializeRaceVisualization() {
    const canvas = document.getElementById('raceCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        // Set up canvas for race visualization
    }
}

// Start race visualization
function startRaceVisualization() {
    animateRace();
}

// Update race visualization
function updateRaceVisualization() {
    const canvas = document.getElementById('raceCanvas');
    if (canvas && appState.raceState) {
        const ctx = canvas.getContext('2d');
        drawRacers(ctx, appState.raceState.racers);
    }
}

// Draw racers on canvas
function drawRacers(ctx, racers) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    racers.forEach((racer, index) => {
        const x = (racer.x / 1000) * ctx.canvas.width;
        const y = 100 + (index * 80);
        
        ctx.fillStyle = racer.color;
        ctx.fillRect(x, y, 50, 50);
        
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(racer.name, x, y - 10);
    });
}

// Animate race
function animateRace() {
    if (appState.isRacing) {
        updateRaceVisualization();
        requestAnimationFrame(animateRace);
    }
}

// Show winner modal
function showWinnerModal(data) {
    // Implementation for winner modal
}

// Show error message
function showError(message) {
    console.error('Error:', message);
    // Could show a toast notification or modal
}

// Show deposit modal
function showDepositModal() {
    // Implementation for deposit modal
}

// Show withdraw modal
function showWithdrawModal() {
    // Implementation for withdraw modal
}

// Update typing indicators
function updateTypingIndicators(data) {
    // Implementation for typing indicators
}

// Initialize betting UI
function initializeBettingUI() {
    // Initialize betting components
}

// Initialize chat UI
function initializeChatUI() {
    // Initialize chat components
}

// Initialize wallet UI
function initializeWalletUI() {
    // Initialize wallet components
}

// Export functions for global access
window.racersApp = {
    appState,
    placeBet,
    sendChatMessage,
    connectWallet,
    toggleChatCollapse,
    toggleSound
};
