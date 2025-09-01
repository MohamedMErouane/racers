/*
 * PRIVY WALLET INTEGRATION SETUP
 * 
 * ✅ CONFIGURED FOR LOCALHOST
 * 
 * App ID: cmermm5bm003bjo0bgsoffojs
 * Domain: localhost (for development)
 * 
 * To enable Privy wallet connection:
 * 
 * 1. Go to https://privy.io/dashboard
 * 2. Find your app with ID: cmermm5bm003bjo0bgsoffojs
 * 3. In the dashboard, add these to "Allowed Origins":
 *    - http://localhost
 *    - http://localhost:3000
 *    - http://localhost:8080
 *    - http://127.0.0.1
 *    - http://127.0.0.1:3000
 * 4. Enable Solana as a supported chain
 * 5. Configure login methods (email, wallet, etc.)
 * 
 * The integration includes:
 * - Real wallet connection via Privy
 * - Automatic balance fetching
 * - Fallback to demo wallet if Privy fails
 * - Support for multiple login methods
 * - Dark theme matching your game's aesthetic
 */


// Anime Racer Data
const animeRacers = [
    {
        name: "Sakura",
        title: "Cherry Blossom Princess",
            avatar: "images/characters/sakura-face.png",
    avatar2: "images/characters/sakura-frame2.png", // Add second image
        color: "#ff69b4",
        speed: 4.5,
        acceleration: 0.15,
        special: "Speed Burst",
        rarity: "legendary"
    },
    {
        name: "Yuki",
        title: "Ice Queen",
            avatar: "images/characters/yuki-face.png",
    avatar2: "images/characters/yuki-frame2.png",
        color: "#00bfff",
        speed: 4.2,
        acceleration: 0.18,
        special: "Freeze Time",
        rarity: "epic"
    },
    {
        name: "Akane",
        title: "Fire Dancer",
            avatar: "images/characters/akane-face.png",
    avatar2: "images/characters/akane-frame41.png", // Add second image
        color: "#ff4500",
        speed: 4.8,
        acceleration: 0.12,
        special: "Blazing Trail",
        rarity: "legendary"
    },
    {
        name: "Luna",
        title: "Moon Guardian",
            avatar: "images/characters/luna-face.png",
    avatar2: "images/characters/luna-frame21.png", // Add second image
        color: "#9370db",
        speed: 4.3,
        acceleration: 0.16,
        special: "Lunar Shield",
        rarity: "epic"
    },
    {
        name: "Miku",
        title: "Digital Diva",
            avatar: "images/characters/miku-face.png",
    avatar2: "images/characters/miku-frame2.png", // Add second image
        color: "#00ced1",
        speed: 4.6,
        acceleration: 0.14,
        special: "Sonic Wave",
        rarity: "rare"
    },
    {
        name: "Neko",
        title: "Cat Ninja",
            avatar: "images/characters/neko-face.png",
    avatar2: "images/characters/neko-frame2.png", // Add second image
        color: "#ffd700",
        speed: 4.7,
        acceleration: 0.13,
        special: "Shadow Step",
        rarity: "epic"
    },
    {
        name: "Hana",
        title: "Flower Mage",
            avatar: "images/characters/hana-face.png",
    avatar2: "images/characters/hana-frame2.png", // Add second image
        color: "#ff1493",
        speed: 4.1,
        acceleration: 0.17,
        special: "Nature's Blessing",
        rarity: "rare"
    },
    {
        name: "Kira",
        title: "Star Warrior",
            avatar: "images/characters/kira-face.png",
    avatar2: "images/characters/kira-frame2.png", // Add second image
        color: "#ffa500",
        speed: 4.4,
        acceleration: 0.15,
        special: "Stellar Rush",
        rarity: "legendary"
    }
];

// Color interpolation function for smooth transitions
function interpolateColor(color1, color2, factor) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Game Configuration
const GAME_CONFIG = {
    enableSoundToggle: false, // Set to false to completely disable sound toggle functionality
    enableRaceBackgrounds: true, // Set to false to disable race background changes
    enableBettingPanelGreying: true // Set to true to enable betting panel greying during races
};

// Privy Configuration
const PRIVY_CONFIG = {
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
};

// Game State
let gameState = {
    raceNumber: 1,
    isRacing: false,
    raceEnded: false, // Flag to prevent multiple races
    countdown: 10, // Changed to 10 seconds as requested
    racers: [],
    bets: {},
    totalPot: 0,
    myBets: {},
    soundEnabled: true,
    walletConnected: false,
    walletAddress: null,
    privy: null,
    solPrice: 165.28, // Updated SOL price to $165.28
    onlineUsers: 1337,
    particles: [],
    chatCooldown: 0, // Chat cooldown timer
    animationFrame: 0, // Animation frame counter for image flipping
    lastMessageTime: 0, // Track last message time for cooldown
    raceStartTime: null, // Track race start time for dynamic speed calculation
    cachedImages: {}, // Cache for preloaded images
    lastFrameTime: 0, // Track last frame time for delta calculations
    targetFPS: 60, // Target 60 FPS for consistent timing
    frameTimeAccumulator: 0, // Accumulator for consistent frame switching
    lastTrackUpdate: 0, // Track last track animation update for consistent movement
    backgroundImages: [], // Array to hold race background image data
    currentBackgroundIndex: 0, // Index of the currently selected background
    lastBackgroundIndex: -1, // Index of the last background (to prevent repeats)
    currentBackground: 0, // Current background variant (0, 1, or 2)
    backgroundLocked: false // Whether background is locked during race
};

// Privy Initialization
async function initializePrivy() {
    try {
        // Check if Privy is available
        if (typeof Privy === 'undefined') {
            console.error('Privy SDK not loaded');
            return;
        }
        
        console.log('Initializing Privy with config:', PRIVY_CONFIG);
        
        // Initialize Privy with newer API
        gameState.privy = new Privy({
            appId: PRIVY_CONFIG.appId,
            config: PRIVY_CONFIG.config
        });
        
        // Wait for Privy to be ready
        await gameState.privy.ready();
        
        // Check if user is already authenticated
        if (gameState.privy.authenticated) {
            console.log('User already authenticated with Privy');
            await handlePrivyLogin();
        }
        
        // Listen for authentication events
        gameState.privy.on('login', handlePrivyLogin);
        gameState.privy.on('logout', handlePrivyLogout);
        
        console.log('Privy initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Privy:', error);
        // Fallback to demo wallet if Privy fails
        console.log('Falling back to demo wallet functionality');
    }
}

async function handlePrivyLogin() {
    try {
        const user = gameState.privy.user;
        const wallet = user.wallet;
        
        if (wallet) {
            gameState.walletConnected = true;
            gameState.walletAddress = wallet.address;
            
            // Update UI
            document.getElementById('walletBtn').textContent = 
                wallet.address.substring(0, 6) + '...' + wallet.address.substring(wallet.address.length - 4);
            document.getElementById('walletActions').style.display = 'flex';
            
            // Check if user has already set a name
            const savedName = localStorage.getItem('userName');
            if (!savedName) {
                showNameSelection();
            } else {
                gameState.userName = savedName;
                enableChat();
            }
            
            playSound('connect');
            console.log('Privy wallet connected:', wallet.address);
        }
    } catch (error) {
        console.error('Error handling Privy login:', error);
    }
}

function handlePrivyLogout() {
    gameState.walletConnected = false;
    gameState.walletAddress = null;
    
    // Update UI
    document.getElementById('walletBtn').textContent = 'Connect';
    document.getElementById('walletActions').style.display = 'none';
    
    // Disable chat
    const chatInput = document.getElementById('chatInput');
    chatInput.disabled = true;
    chatInput.placeholder = 'Connect wallet to chat...';
    
    // Clear user data
    gameState.userName = null;
    gameState.myBets = {};
    
    playSound('connect');
    console.log('Privy wallet disconnected');
}

// Helper function to format SOL amounts with USD equivalent
function formatSOLWithUSD(solAmount) {
    const usdAmount = solAmount * gameState.solPrice;
    return `${solAmount.toFixed(2)} SOL ($${usdAmount.toFixed(2)})`;
}

// Track animation variables
let trackOffset = 0;
let trackSpeed = 0;

// Initialize Game
document.addEventListener('DOMContentLoaded', () => {
    // Check if Privy loaded
    setTimeout(() => {
        if (typeof Privy === 'undefined') {
            console.error('❌ Privy SDK failed to load');
        } else {
            console.log('✅ Privy SDK loaded successfully');
        }
    }, 1000);
    
    initializeGame();
});

async function initializeGame() {
    // Initialize Privy
    await initializePrivy();
    
    // Initialize racers
    initializeRacers();
    
    // Preload images for racers with image URLs
    preloadImages();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize chat
    initializeChat();
    
    // Start game loop
    startGameLoop();
    
    // Start background animation
    animateBackground();
    
    // Initialize background
    setBackground(gameState.currentBackground);
    
    // Hide sound toggle if feature is disabled
    if (!GAME_CONFIG.enableSoundToggle) {
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.classList.add('hidden');
        }
    }
    
    // Update UI
    updateBetDisplay();
    updateBettingPanel();
    updateLeaderboard();
    
    // Initialize Solana price tracking
    initializeSolanaPrice();
    
    // Initialize pie chart hover functionality will be done when pie chart is first drawn
    
    // Hide loading screen after initialization
    setTimeout(() => {
        document.querySelector('.loading-screen').style.opacity = '0';
        setTimeout(() => {
            document.querySelector('.loading-screen').style.display = 'none';
            document.body.classList.add('loaded');
        }, 500);
    }, 1000);
}

function loadBackgroundImage(index) {
    const background = gameState.backgroundImages[index];
    if (!background) return;
    
    const backgroundImg = new Image();
    backgroundImg.onload = () => {
        gameState.cachedImages['background'] = backgroundImg;
        console.log(`Background image "${background.name}" loaded successfully`);
    };
    backgroundImg.onerror = (e) => {
        console.error(`Failed to load background image "${background.name}":`, e);
        // Try fallback URL if available
        if (background.fallback) {
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
                gameState.cachedImages['background'] = fallbackImg;
                console.log(`Fallback background image loaded for "${background.name}"`);
            };
            fallbackImg.onerror = () => {
                console.error(`Fallback background URL also failed for "${background.name}"`);
            };
            fallbackImg.src = background.fallback;
        }
    };
    backgroundImg.src = background.url;
}



function addRaceBackground(name, url, fallback = null) {
    gameState.backgroundImages.push({
        name: name,
        url: url,
        fallback: fallback
    });
    
    // Update selector if it exists
    const bgSelector = document.querySelector('.race-background-selector');
    if (bgSelector) {
        const option = document.createElement('option');
        option.value = gameState.backgroundImages.length - 1;
        option.textContent = name;
        bgSelector.appendChild(option);
    }
}

function startBackgroundShuffling() {
    console.log('startBackgroundShuffling called');
    // Don't auto-shuffle backgrounds - only change between races
    // Background will be changed manually when races end
}

function shuffleBackground() {
    console.log('shuffleBackground called');
    
    // Don't change background during a race
    if (gameState.isRacing) {
        console.log('Race in progress - background change blocked');
        return;
    }
    
    console.log('Current backgrounds:', gameState.backgroundImages);
    console.log('Current index:', gameState.currentBackgroundIndex);
    
    const totalBackgrounds = gameState.backgroundImages.length;
    console.log('Total backgrounds:', totalBackgrounds);
    
    if (totalBackgrounds < 2) {
        console.log('Not enough backgrounds to cycle');
        return; // Need at least 2 backgrounds to cycle
    }
    
    // Cycle to next background sequentially
    let newIndex = (gameState.currentBackgroundIndex + 1) % totalBackgrounds;
    console.log('Cycling to next background index:', newIndex);
    
    // Update current background index
    gameState.currentBackgroundIndex = newIndex;
    
    // Save to localStorage
    localStorage.setItem('currentBackgroundIndex', newIndex);
    
    // Load new background
    loadBackgroundImage(newIndex);
    
    console.log(`Background cycled to: ${gameState.backgroundImages[newIndex].name}`);
}

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = particle.style.height = Math.random() * 5 + 3 + 'px';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = Math.random() * 20 + 20 + 's';
        particlesContainer.appendChild(particle);
    }
}

function initializeRacers() {
    gameState.racers = animeRacers.map((racer, index) => ({
        ...racer,
        id: index + 1,
        x: 50,
        y: 50 + index * 80,
        currentSpeed: 0,
        finished: false,
        finishTime: 0,
        powerLevel: Math.random() * 50 + 50,
        winProbability: 12.5,
        // Add individual characteristics for much more dramatic separation
        baseAcceleration: racer.acceleration * (0.6 + Math.random() * 0.8), // 40% variation
        maxSpeed: racer.speed * (0.7 + Math.random() * 0.6) // 30% variation
    }));
}

function createRacerCards() {
    const racersGrid = document.getElementById('racersGrid');
    racersGrid.innerHTML = '';
    
    gameState.racers.forEach(racer => {
        const racerCard = document.createElement('div');
        racerCard.className = 'racer-card';
        racerCard.setAttribute('data-racer-id', racer.id);
        
        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = 'racer-avatar';
        
        if (racer.avatar.includes('http')) {
            const img = document.createElement('img');
            // Use frontal image for Sakura's card if available
            img.src = (racer.name === "Sakura" && racer.frontalImage) ? racer.frontalImage : racer.avatar;
            img.className = 'racer-image';
            avatar.appendChild(img);
        } else {
            avatar.textContent = racer.avatar;
            avatar.style.fontSize = '24px';
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
        }
        
        // Create name and title
        const name = document.createElement('div');
        name.className = 'racer-name';
        name.textContent = racer.name;
        
        const title = document.createElement('div');
        title.className = 'racer-title';
        title.textContent = racer.title;
        
        // Create power bar
        const powerBar = document.createElement('div');
        powerBar.className = 'power-bar';
        const powerFill = document.createElement('div');
        powerFill.className = 'power-fill';
        powerFill.style.width = racer.powerLevel + '%';
        powerBar.appendChild(powerFill);
        
        // Create bet controls
        const betControls = document.createElement('div');
        betControls.className = 'bet-controls';
        
        // Quick bet buttons
        const quickBetRow = document.createElement('div');
        quickBetRow.className = 'quick-bet-row';
        
        [0.1, 0.5, 1].forEach(amount => {
            const betBtn = document.createElement('button');
            betBtn.className = 'bet-btn';
            betBtn.textContent = amount + ' SOL';
            betBtn.onclick = () => placeBet(racer.id, amount);
            quickBetRow.appendChild(betBtn);
        });
        
        // Custom bet input
        const customBetInput = document.createElement('input');
        customBetInput.type = 'number';
        customBetInput.className = 'custom-bet-input';
        customBetInput.placeholder = 'Custom amount';
        customBetInput.min = '0.1';
        customBetInput.step = '0.1';
        customBetInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                placeCustomBet(racer.id);
            }
        };
        
        betControls.appendChild(quickBetRow);
        betControls.appendChild(customBetInput);
        
        racerCard.appendChild(avatar);
        racerCard.appendChild(name);
        racerCard.appendChild(title);
        racerCard.appendChild(powerBar);
        racerCard.appendChild(betControls);
        racersGrid.appendChild(racerCard);
    });
}



function setupEventListeners() {
    document.getElementById('walletBtn').addEventListener('click', connectWallet);
    document.getElementById('depositBtn').addEventListener('click', handleDeposit);
    document.getElementById('withdrawBtn').addEventListener('click', handleWithdraw);
    
    // Deposit modal event listeners
    document.getElementById('closeDepositModal').addEventListener('click', hideDepositModal);
    document.getElementById('confirmDepositBtn').addEventListener('click', confirmDeposit);
    document.getElementById('depositAmount').addEventListener('input', updateDepositUSD);
    
    // Close modal when clicking outside
    document.getElementById('depositModal').addEventListener('click', (e) => {
        if (e.target.id === 'depositModal') {
            hideDepositModal();
        }
    });
    
    // Safe sound toggle setup - only add listener if element exists and feature is enabled
    if (GAME_CONFIG.enableSoundToggle) {
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', toggleSound);
        }
    }
    
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Name selection functionality
    document.getElementById('confirmNameBtn').addEventListener('click', confirmName);
    document.getElementById('nameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmName();
        }
    });
    
    // Chat collapse functionality
    document.getElementById('chatCollapseBtn').addEventListener('click', toggleChatPanel);
    
    // New betting interface event listeners
    document.querySelectorAll('.quick-bet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const amount = parseFloat(e.target.dataset.amount);
            if (gameState.selectedCharacter) {
                placeBet(gameState.selectedCharacter.id, amount);
            }
        });
    });
    
    document.getElementById('placeBetBtn').addEventListener('click', () => {
        if (gameState.selectedCharacter) {
            const amount = parseFloat(document.getElementById('customBetAmount').value);
            if (amount > 0) {
                placeBet(gameState.selectedCharacter.id, amount);
            }
        }
    });
    
    document.getElementById('customBetAmount').addEventListener('input', updatePlaceBetButton);
    
    startChatCooldownTimer();
}

function confirmName() {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value.trim();
    
    if (name.length < 3) {
        alert('Username must be at least 3 characters long!');
        return;
    }
    
    if (name.length > 20) {
        alert('Username must be 20 characters or less!');
        return;
    }
    
    // Save name to localStorage and gameState
    localStorage.setItem('userName', name);
    gameState.userName = name;
    
    // Enable chat and hide name selection
    enableChat();
    
    // Add welcome message
    addChatMessage('System', `Welcome ${name}! 🎉`, 'legendary');
    
    playSound('connect');
}

async function connectWallet() {
    if (!gameState.walletConnected) {
        try {
            console.log('Attempting to connect wallet...');
            console.log('Privy available:', !!gameState.privy);
            
            if (gameState.privy) {
                console.log('Using Privy for wallet connection');
                // Use Privy for wallet connection
                await gameState.privy.login();
            } else {
                console.log('Privy not available, using demo wallet');
                // Fallback to demo wallet if Privy is not available
                gameState.walletConnected = true;
                gameState.walletAddress = generateDemoWalletAddress();
                document.getElementById('walletBtn').textContent = gameState.walletAddress.substring(0, 6) + '...' + gameState.walletAddress.substring(gameState.walletAddress.length - 4);
                
                // Show wallet actions (deposit/withdraw buttons)
                document.getElementById('walletActions').style.display = 'flex';
                
                // Check if user has already set a name
                const savedName = localStorage.getItem('userName');
                if (!savedName) {
                    showNameSelection();
                } else {
                    gameState.userName = savedName;
                    enableChat();
                }
                
                playSound('connect');
            }
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            alert('Failed to connect wallet. Please try again.');
        }
    } else {
        // Disconnect wallet
        await disconnectWallet();
    }
}

function generateDemoWalletAddress() {
    // Generate a demo Solana wallet address
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 44; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function disconnectWallet() {
    try {
        if (gameState.privy) {
            // Use Privy for logout
            await gameState.privy.logout();
        } else {
            // Fallback to demo wallet disconnect
            gameState.walletConnected = false;
            gameState.walletAddress = null;
            document.getElementById('walletBtn').textContent = 'Connect';
            
            // Hide wallet actions
            document.getElementById('walletActions').style.display = 'none';
            
            // Disable chat
            const chatInput = document.getElementById('chatInput');
            chatInput.disabled = true;
            chatInput.placeholder = 'Connect wallet to chat...';
            
            // Clear user data
            gameState.userName = null;
            gameState.myBets = {};
            
            playSound('connect');
        }
    } catch (error) {
        console.error('Failed to disconnect wallet:', error);
    }
}

function handleDeposit() {
    if (!gameState.walletConnected) {
        alert('Please connect your wallet first!');
        return;
    }
    
    // Show deposit modal
    showDepositModal();
}

async function showDepositModal() {
    const modal = document.getElementById('depositModal');
    modal.style.display = 'flex';
    
    // Focus on amount input
    document.getElementById('depositAmount').focus();
    
    // Update USD conversion on input
    updateDepositUSD();
    
    // Fetch and display wallet balance
    await updateWalletBalance();
}

function hideDepositModal() {
    const modal = document.getElementById('depositModal');
    modal.style.display = 'none';
    
    // Clear input
    document.getElementById('depositAmount').value = '';
    updateDepositUSD();
}

function updateDepositUSD() {
    const amount = parseFloat(document.getElementById('depositAmount').value) || 0;
    const usdValue = amount * 165.28; // SOL to USD conversion
    document.querySelector('.amount-usd').textContent = `= $${usdValue.toFixed(2)}`;
}

function handleQuickAdd(amount) {
    const input = document.getElementById('depositAmount');
    const currentValue = parseFloat(input.value) || 0;
    input.value = (currentValue + amount).toFixed(2);
    updateDepositUSD();
}

async function updateWalletBalance() {
    if (!gameState.walletConnected || !gameState.walletAddress) {
        document.getElementById('walletBalance').textContent = 'Balance: 0.000 SOL';
        document.getElementById('walletBalanceUSD').textContent = '≈ $0.00 USD';
        return;
    }
    
    try {
        // In a real implementation, this would fetch from Solana RPC
        // For demo purposes, we'll simulate a balance fetch
        const balance = await fetchWalletBalance(gameState.walletAddress);
        const usdValue = balance * 165.28; // SOL to USD conversion
        
        document.getElementById('walletBalance').textContent = `Balance: ${balance.toFixed(3)} SOL`;
        document.getElementById('walletBalanceUSD').textContent = `≈ $${usdValue.toFixed(2)} USD`;
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        document.getElementById('walletBalance').textContent = 'Balance: Error';
        document.getElementById('walletBalanceUSD').textContent = '≈ $0.00 USD';
    }
}

async function fetchWalletBalance(walletAddress) {
    try {
        if (gameState.privy && gameState.privy.authenticated) {
            // Use Privy to get real wallet balance
            const user = gameState.privy.user;
            const wallet = user.wallet;
            
            if (wallet && wallet.provider) {
                // Get balance from the connected wallet
                const balance = await wallet.provider.getBalance(walletAddress);
                return balance / 1e9; // Convert lamports to SOL
            }
        }
        
        // Fallback to demo implementation
        await new Promise(resolve => setTimeout(resolve, 500));
        return Math.random() * 1.9 + 0.1;
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        // Return demo balance on error
        return Math.random() * 1.9 + 0.1;
    }
}

function confirmDeposit() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount to deposit.');
        return;
    }
    
    // Check if user has sufficient balance
    const currentBalance = parseFloat(document.getElementById('walletBalance').textContent.split(' ')[1]);
    if (amount > currentBalance) {
        alert('Insufficient balance in your wallet.');
        return;
    }
    
    // Here you would integrate with actual Solana wallet for deposit
    alert(`Deposit request: ${amount} SOL ($${(amount * 165.28).toFixed(2)})\n\nThis is a demo - in a real implementation, this would connect to your Solana wallet.`);
    console.log(`Deposit requested: ${amount} SOL`);
    
    // Hide modal after deposit
    hideDepositModal();
}

function handleWithdraw() {
    if (!gameState.walletConnected) {
        alert('Please connect your wallet first!');
        return;
    }
    
    const amount = prompt('Enter amount to withdraw (SOL):');
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        const withdrawAmount = parseFloat(amount);
        // Here you would integrate with actual Solana wallet for withdrawal
        alert(`Withdraw request: ${withdrawAmount} SOL\n\nThis is a demo - in a real implementation, this would connect to your Solana wallet.`);
        console.log(`Withdraw requested: ${withdrawAmount} SOL`);
    }
}

function showNameSelection() {
    // Hide chat rules and show name selection
    document.getElementById('chatRules').style.display = 'none';
    document.getElementById('nameSelection').style.display = 'flex';
    
    // Hide chat input container
    document.querySelector('.chat-input-container').style.display = 'none';
    
    // Focus on name input
    document.getElementById('nameInput').focus();
}

function enableChat() {
    // Hide name selection and show chat rules
    document.getElementById('nameSelection').style.display = 'none';
    document.getElementById('chatRules').style.display = 'flex';
    
    // Show chat input container
    document.querySelector('.chat-input-container').style.display = 'flex';
    
    // Enable chat input
    const chatInput = document.getElementById('chatInput');
    chatInput.disabled = false;
    chatInput.placeholder = 'Type your message...';
}

function toggleSound() {
    if (!GAME_CONFIG.enableSoundToggle) return;
    
    gameState.soundEnabled = !gameState.soundEnabled;
    
    // Safe sound icon update - only update if element exists
    const soundIcon = document.querySelector('.sound-icon');
    if (soundIcon) {
        soundIcon.textContent = gameState.soundEnabled ? '🔊' : '🔇';
    }
}

function toggleChatPanel() {
    const chatPanel = document.getElementById('chatPanel');
    const mainContainer = document.querySelector('.main-container');
    const isCollapsed = chatPanel.classList.contains('collapsed');
    
    if (isCollapsed) {
        chatPanel.classList.remove('collapsed');
        mainContainer.classList.remove('chat-collapsed');
        playSound('connect');
        // Clear notification when expanding
        updateNotificationBadge(0);
    } else {
        chatPanel.classList.add('collapsed');
        mainContainer.classList.add('chat-collapsed');
        playSound('connect');
    }
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function placeBet(racerId, amount) {
    if (!gameState.walletConnected) {
        alert('Please connect your wallet first!');
        return;
    }
    
    if (gameState.isRacing) {
        alert('Race in progress! Wait for the next race.');
        return;
    }
    
    // Add bet
    if (!gameState.myBets[racerId]) {
        gameState.myBets[racerId] = 0;
    }
    gameState.myBets[racerId] += amount;
    gameState.totalPot += amount;
    
    // Update UI
    updateBetDisplay();
    updateBettingPanel();
    
    // Highlight card
    document.querySelector(`[data-racer-id="${racerId}"]`).classList.add('selected');
    
    // Add chat message
    const racer = gameState.racers.find(r => r.id === racerId);
    addChatMessage('You', `Placed ${formatSOLWithUSD(amount)} on ${racer.name}! 🎯`, 'rare');
    
    playSound('bet');
}

function placeCustomBet(racerId) {
    const input = document.getElementById(`custom-${racerId}`);
    const amount = parseFloat(input.value);
    if (amount > 0) {
        placeBet(racerId, amount);
        input.value = '';
    }
}

function updateBetDisplay() {
    document.getElementById('totalPot').textContent = formatSOLWithUSD(gameState.totalPot);
    const myTotal = Object.values(gameState.myBets).reduce((sum, bet) => sum + bet, 0);
    document.getElementById('myBets').textContent = formatSOLWithUSD(myTotal);
    document.getElementById('totalBets').textContent = Object.keys(gameState.bets).length + Object.keys(gameState.myBets).length;
}

function updateBettingPanel() {
    // Update character grid
    updateCharacterGrid();
    
    // Update betting distribution
    updateBettingDistribution();
    
    // Update place bet button
    updatePlaceBetButton();
}

function updateCharacterGrid() {
    const characterGrid = document.getElementById('characterGrid');
    characterGrid.innerHTML = '';
    
    gameState.racers.forEach(racer => {
        const gridItem = document.createElement('div');
        gridItem.className = 'character-grid-item';
        gridItem.dataset.racerId = racer.id;
        
        // Check if avatar is an image URL or emoji
        const isImageUrl = racer.avatar.includes('http') || racer.avatar.includes('images/');
        if (isImageUrl) {
            const img = document.createElement('img');
            img.src = racer.avatar;
            img.alt = racer.name;
            
            // Add error handling for image loading
            img.onerror = () => {
                console.error(`Failed to load image for ${racer.name}:`, racer.avatar);
                // Fallback to character name if image fails to load
                gridItem.innerHTML = `<div style="font-size: 7px; display: flex; align-items: center; justify-content: center; height: 100%; color: white;">${racer.name}</div>`;
            };
            
            img.onload = () => {
                console.log(`Successfully loaded image for ${racer.name}`);
            };
            
            gridItem.appendChild(img);
        } else {
            gridItem.innerHTML = `<div style="font-size: 7px; display: flex; align-items: center; justify-content: center; height: 100%; color: white;">${racer.name}</div>`;
        }
        
        // Add click handler
        gridItem.addEventListener('click', () => {
            selectCharacter(racer);
        });
        
        characterGrid.appendChild(gridItem);
    });
    
    // Add mouse wheel scrolling to character grid
    characterGrid.addEventListener('wheel', (e) => {
        e.preventDefault();
        characterGrid.scrollLeft += e.deltaY;
    });
    
    // Add scroll event to handle fade effects
    characterGrid.addEventListener('scroll', updateCharacterFadeEffects);
    
    // Only select first character by default if no character is currently selected
    if (gameState.racers.length > 0 && !gameState.selectedCharacter) {
        selectCharacter(gameState.racers[0]);
    }
    
    // Initial fade effect update
    updateCharacterFadeEffects();
}

function selectCharacter(racer) {
    // Update selected character display
    const selectedCharacterName = document.getElementById('selectedCharacterName');
    
    selectedCharacterName.textContent = racer.name;
    
    // Update character grid selection
    document.querySelectorAll('.character-grid-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedGridItem = document.querySelector(`[data-racer-id="${racer.id}"]`);
    if (selectedGridItem) {
        selectedGridItem.classList.add('selected');
    }
    
    // Store selected character
    gameState.selectedCharacter = racer;
    
    // Update place bet button
    updatePlaceBetButton();
}

function updateCharacterFadeEffects() {
    const characterGrid = document.getElementById('characterGrid');
    const gridItems = characterGrid.querySelectorAll('.character-grid-item');
    
    gridItems.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        const gridRect = characterGrid.getBoundingClientRect();
        
        // Remove existing fade classes
        item.classList.remove('fade-left', 'fade-right');
        
        // Get the character name from the data attribute or image alt
        const racerId = item.dataset.racerId;
        const racer = gameState.racers.find(r => r.id == racerId);
        const isSelected = item.classList.contains('selected');
        
        // Skip fade effects for selected Sakura or Kira
        if (isSelected && racer && (racer.name === 'Sakura' || racer.name === 'Kira')) {
            return;
        }
        
        // Check if item is partially off-screen to the left
        if (itemRect.left < gridRect.left + 20) {
            item.classList.add('fade-left');
        }
        
        // Check if item is partially off-screen to the right
        if (itemRect.right > gridRect.right - 20) {
            item.classList.add('fade-right');
        }
    });
}

function updateBettingDistribution() {
    // Calculate betting distribution with real-time updates
    const racerBets = gameState.racers.map(racer => {
        const racerBetAmount = (gameState.myBets[racer.id] || 0) + 
                              Object.values(gameState.bets)
                                    .filter(bet => bet.racerId === racer.id)
                                    .reduce((sum, bet) => sum + bet.amount, 0);
        
        return {
            racer,
            amount: racerBetAmount
        };
    }).sort((a, b) => b.amount - a.amount);
    
    // Calculate total bets correctly
    const totalBets = racerBets.reduce((sum, item) => sum + item.amount, 0);
    
    // Update gameState.totalPot to match the actual total
    gameState.totalPot = totalBets;
    
    // Calculate percentages correctly (should never exceed 100%)
    if (totalBets > 0) {
        racerBets.forEach(item => {
            item.percentage = (item.amount / totalBets) * 100;
            // Ensure percentage never exceeds 100%
            if (item.percentage > 100) {
                console.warn(`Warning: ${item.racer.name} percentage was ${item.percentage.toFixed(2)}%, capping at 100%`);
                item.percentage = 100;
            }
        });
    } else {
        racerBets.forEach(item => {
            item.percentage = 0;
        });
    }
    
    // Update favorite character with smooth transitions
    const favorite = racerBets[0];
    const favoriteCharacter = document.getElementById('favoriteCharacter');
    const favoritePercentage = document.getElementById('favoritePercentage');
    
    if (gameState.totalPot > 0) {
        let percentage = (favorite.amount / gameState.totalPot * 100);
        
        // Ensure percentage never exceeds 100%
        if (percentage > 100) {
            console.warn(`Warning: Favorite percentage was ${percentage.toFixed(1)}%, capping at 100%`);
            percentage = 100;
        }
        
        const percentageText = percentage.toFixed(1);
        
        // Add visual feedback when favorite changes
        if (favoriteCharacter.textContent !== favorite.racer.name) {
            favoriteCharacter.style.color = '#fbbf24';
            favoriteCharacter.style.textShadow = '0 0 10px #fbbf24';
            setTimeout(() => {
                favoriteCharacter.style.color = '';
                favoriteCharacter.style.textShadow = '';
            }, 1000);
        }
        
        favoriteCharacter.textContent = favorite.racer.name;
        favoritePercentage.textContent = `(${percentageText}%)`;
    } else {
        favoriteCharacter.textContent = 'None';
        favoritePercentage.textContent = '(0%)';
    }
    
    // Draw pie chart with enhanced animations
    drawPieChart(racerBets);
    
    // Update legend with smooth transitions
    updateDistributionLegend(racerBets);
    
    // Add visual pulse effect to the betting panel when new bets come in
    if (gameState.totalPot > 0 && !gameState.isRacing) {
        const bettingPanel = document.querySelector('.betting-panel');
        if (bettingPanel) {
            bettingPanel.style.boxShadow = '0 0 20px rgba(147, 51, 234, 0.6)';
            setTimeout(() => {
                bettingPanel.style.boxShadow = '';
            }, 300);
        }
        
        // Add subtle animation to the total pot display
        const totalPotElement = document.getElementById('totalPot');
        if (totalPotElement) {
            totalPotElement.style.transform = 'scale(1.05)';
            totalPotElement.style.color = '#fbbf24';
            setTimeout(() => {
                totalPotElement.style.transform = 'scale(1)';
                totalPotElement.style.color = '';
            }, 200);
        }
    }
}

// Store current pie chart state for incremental updates
let currentPieData = [];
let animationFrame = null;
let isAnimating = false;



function drawPieChart(racerBets) {
    const canvas = document.getElementById('pieChart');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 125; // Increased radius for larger chart (250/2)
    
    // Define colors for each racer
    const colors = [
        '#ec4899', // Pink
        '#06b6d4', // Cyan
        '#f97316', // Orange
        '#8b5cf6', // Purple
        '#10b981', // Green
        '#f59e0b', // Yellow
        '#ef4444', // Red
        '#3b82f6'  // Blue
    ];
    
    const totalBets = gameState.totalPot > 0 ? gameState.totalPot : 1;
    
    // Prepare new data based on actual bets with normalized percentages
    const newData = racerBets.map((item, index) => ({
        amount: item.amount,
        angle: (item.percentage / 100) * 2 * Math.PI, // Use normalized percentage
        color: colors[index % colors.length],
        racer: item.racer
    })).filter(item => item.amount > 0);
    
    // If no current data, draw immediately
    if (currentPieData.length === 0) {
        drawPieSlices(ctx, centerX, centerY, radius, newData);
        currentPieData = newData;
        updateCenterCharacter(racerBets);
        return;
    }
    
    // If already animating, queue the update
    if (isAnimating) {
        return;
    }
    
    // Check if data actually changed
    const hasChanged = hasDataChanged(currentPieData, newData);
    if (!hasChanged) {
        return;
    }
    
    // Animate from current to new data with enhanced responsiveness
    isAnimating = true;
    let progress = 0;
    const animationDuration = 300; // Even faster animation for real-time feel
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        progress = Math.min(elapsed / animationDuration, 1);
        
        // Enhanced easing function for more dynamic feel
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out for snappier feel
        
        // Interpolate between current and new data
        const interpolatedData = newData.map((newItem, index) => {
            const currentItem = currentPieData[index] || { amount: 0, angle: 0 };
            return {
                amount: currentItem.amount + (newItem.amount - currentItem.amount) * easeProgress,
                angle: currentItem.angle + (newItem.angle - currentItem.angle) * easeProgress,
                color: newItem.color,
                racer: newItem.racer
            };
        });
        
        // Clear canvas and draw interpolated slices
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPieSlices(ctx, centerX, centerY, radius, interpolatedData);
        
        if (progress < 1) {
            animationFrame = requestAnimationFrame(animate);
        } else {
            currentPieData = newData;
            isAnimating = false;
            updateCenterCharacter(racerBets);
            
            // Add a subtle pulse effect when the chart updates
            canvas.style.transform = 'scale(1.02)';
            setTimeout(() => {
                canvas.style.transform = 'scale(1)';
            }, 150);
        }
    }
    
    animationFrame = requestAnimationFrame(animate);
}



// Check if pie chart data has actually changed
function hasDataChanged(currentData, newData) {
    if (currentData.length !== newData.length) {
        return true;
    }
    
    for (let i = 0; i < currentData.length; i++) {
        const current = currentData[i];
        const newItem = newData[i];
        
        if (Math.abs(current.amount - newItem.amount) > 0.01) {
            return true;
        }
    }
    
    return false;
}

function drawPieSlices(ctx, centerX, centerY, radius, data) {
    let currentAngle = -Math.PI / 2; // Start from top
    const totalBets = gameState.totalPot > 0 ? gameState.totalPot : 1;
    
    // Check if we're in the initial state (no bets yet)

    
    data.forEach((item, index) => {
        if (item.amount > 0) {
            const startAngle = currentAngle;
            const endAngle = currentAngle + item.angle;
            
            // Make the largest slice slightly bigger for emphasis
            const sliceRadius = index === 0 ? radius * 1.08 : radius; // 8% bigger for the largest slice
            
            // Draw pie slice with smooth edges
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, sliceRadius, startAngle, endAngle);
            ctx.closePath();
            
            // Create gradient for each slice
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, sliceRadius);
            gradient.addColorStop(0, item.color);
            gradient.addColorStop(1, adjustBrightness(item.color, -20));
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Add subtle stroke for definition
            ctx.strokeStyle = adjustBrightness(item.color, -40);
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Add percentage text for top 3 slices
            if (index < 3) {
                const percentage = (item.amount / totalBets * 100).toFixed(1);
                
                const midAngle = startAngle + item.angle / 2;
                
                // Calculate text position (inside the slice)
                const textRadius = radius * 0.65; // Position text at 65% of radius
                const textX = centerX + Math.cos(midAngle) * textRadius;
                const textY = centerY + Math.sin(midAngle) * textRadius;
                
                // Set text properties
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Add text shadow for better visibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                
                // Draw percentage text
                ctx.fillStyle = 'white';
                ctx.fillText(`${percentage}%`, textX, textY);
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
            
            currentAngle += item.angle;
        }
    });
    
    // Draw center circle with glow effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    
    // Create gradient for center circle
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
    centerGradient.addColorStop(0, 'rgba(30, 30, 40, 0.95)');
    centerGradient.addColorStop(1, 'rgba(20, 20, 30, 0.9)');
    
    ctx.fillStyle = centerGradient;
    ctx.fill();
    
    // Add glow effect
    ctx.shadowColor = 'rgba(147, 51, 234, 0.6)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowBlur = 0;
}

function updateCenterCharacter(racerBets) {
    const centerImg = document.getElementById('centerCharacterImg');
    const centerContainer = document.querySelector('.pie-chart-center');
    
    if (racerBets.length > 0) {
        const favorite = racerBets[0]; // First one is the favorite
        let avatarUrl = favorite.racer.avatar;
        
        // Get favorite character's color for glow effect
        const colors = [
            '#ec4899', // Pink - Sakura
            '#06b6d4', // Cyan - Yuki
            '#f97316', // Orange - Akane
            '#8b5cf6', // Purple - Luna
            '#10b981', // Green - Miku
            '#f59e0b', // Yellow - Neko
            '#ef4444', // Red - Hana
            '#3b82f6'  // Blue - Kira
        ];
        
        let favoriteColor = colors[0]; // Default
        
        // Use face image for center display and get color
        if (favorite.racer.name === "Sakura") {
            avatarUrl = "images/characters/sakura-face.png";
            favoriteColor = colors[0];
        } else if (favorite.racer.name === "Yuki") {
            avatarUrl = "images/characters/yuki-face.png";
            favoriteColor = colors[1];
        } else if (favorite.racer.name === "Akane") {
            avatarUrl = "images/characters/akane-face.png";
            favoriteColor = colors[2];
        } else if (favorite.racer.name === "Luna") {
            avatarUrl = "images/characters/luna-face.png";
            favoriteColor = colors[3];
        } else if (favorite.racer.name === "Miku") {
            avatarUrl = "images/characters/miku-face.png";
            favoriteColor = colors[4];
        } else if (favorite.racer.name === "Neko") {
            avatarUrl = "images/characters/neko-face.png";
            favoriteColor = colors[5];
        } else if (favorite.racer.name === "Hana") {
            avatarUrl = "images/characters/hana-face.png";
            favoriteColor = colors[6];
        } else if (favorite.racer.name === "Kira") {
            avatarUrl = "images/characters/kira-face.png";
            favoriteColor = colors[7];
        }
        
        const isImageUrl = avatarUrl.includes('http') || avatarUrl.includes('images/');
        if (isImageUrl) {
            centerImg.src = avatarUrl;
            centerImg.style.display = 'block';
            
            // Update center container with favorite character's color glow
            centerContainer.style.borderColor = `${favoriteColor}80`;
            centerContainer.style.boxShadow = `0 0 20px ${favoriteColor}60`;
            centerContainer.style.setProperty('--favorite-color', favoriteColor);
            centerContainer.classList.add('favorite-glow');
        } else {
            centerImg.style.display = 'none';
        }
    } else {
        centerImg.style.display = 'none';
        // Reset to default purple glow
        centerContainer.style.borderColor = 'rgba(147, 51, 234, 0.8)';
        centerContainer.style.boxShadow = '0 0 20px rgba(147, 51, 234, 0.4)';
        centerContainer.classList.remove('favorite-glow');
    }
}



// Helper function to adjust color brightness
function adjustBrightness(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function updateDistributionLegend(racerBets) {
    const legend = document.getElementById('distributionLegend');
    legend.innerHTML = '';
    
    const colors = [
        '#ec4899', '#06b6d4', '#f97316', '#8b5cf6',
        '#10b981', '#f59e0b', '#ef4444', '#3b82f6'
    ];
    
    const totalBets = gameState.totalPot > 0 ? gameState.totalPot : 1;
    
    // Only show top 4 odds to prevent scroll bar
    racerBets.slice(0, 4).forEach((item, index) => {
        let percentage = (item.amount / totalBets * 100);
        
        // Ensure percentage never exceeds 100%
        if (percentage > 100) {
            console.warn(`Warning: Legend percentage for ${item.racer.name} was ${percentage.toFixed(1)}%, capping at 100%`);
            percentage = 100;
        }
        
        const percentageText = percentage.toFixed(1);
        const color = colors[index % colors.length];
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${color};"></div>
            <div class="legend-name">${item.racer.name}</div>
            <div class="legend-percentage">${percentageText}%</div>
        `;
        
        legend.appendChild(legendItem);
    });
}

function updatePlaceBetButton() {
    const placeBetBtn = document.getElementById('placeBetBtn');
    const customBetAmount = document.getElementById('customBetAmount');
    
    if (gameState.selectedCharacter) {
        const amount = parseFloat(customBetAmount.value) || 0;
        placeBetBtn.textContent = `Place Bet - ${amount.toFixed(1)} SOL`;
        placeBetBtn.disabled = !gameState.walletConnected || amount <= 0;
    } else {
        placeBetBtn.textContent = 'Place Bet - 0.0 SOL';
        placeBetBtn.disabled = true;
    }
}

function startGameLoop() {
    let lastTime = Date.now();
    let readyAnnounced = false;
    let setAnnounced = false;
    let goAnnounced = false;
    let currentDisplayWord = '';
    let flashInterval = null;
    
    // Dynamic countdown with continuous milliseconds from 10.00 to 0.01
    setInterval(() => {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        
        if (!gameState.isRacing) {
            // Update countdown every second
            if (deltaTime >= 1000) {
                gameState.countdown--;
                lastTime = currentTime;
                
                // Reset announcement flags when countdown resets to 10
                if (gameState.countdown === 10) {
                    console.log('🏁 Countdown reached 10 - starting betting system');
                    readyAnnounced = false;
                    setAnnounced = false;
                    goAnnounced = false;
                    currentDisplayWord = '';
                    if (flashInterval) {
                        clearInterval(flashInterval);
                        flashInterval = null;
                    }
                    
                    // Start betting system when countdown reaches 10
                    // startAutomaticBetting();
                }
            }
            
            // Calculate dynamic milliseconds (0-99)
            const elapsedInSecond = deltaTime % 1000;
            const milliseconds = Math.floor((1000 - elapsedInSecond) / 10);
            let displayText = `${gameState.countdown}.${milliseconds.toString().padStart(2, '0')}`;
                
            // Show "Ready", "Set", "Go" on top of countdown with flashing colors
            if (gameState.countdown === 5 && !readyAnnounced) {
                displayText = `${gameState.countdown}.${milliseconds.toString().padStart(2, '0')}`;
                currentDisplayWord = 'READY!';
                readyAnnounced = true;
                playSound('countdown');
                
                // Start flashing red
                if (flashInterval) clearInterval(flashInterval);
                let flashState = true;
                flashInterval = setInterval(() => {
                    const countdownElement = document.getElementById('countdown');
                    countdownElement.style.color = flashState ? '#ff0000' : '#ff6666';
                    flashState = !flashState;
                }, 200);
                
            } else if (gameState.countdown === 3 && !setAnnounced) {
                displayText = `${gameState.countdown}.${milliseconds.toString().padStart(2, '0')}`;
                currentDisplayWord = 'SET!';
                setAnnounced = true;
                playSound('countdown');
                
                // Start flashing yellow
                if (flashInterval) clearInterval(flashInterval);
                let flashState = true;
                flashInterval = setInterval(() => {
                    const countdownElement = document.getElementById('countdown');
                    countdownElement.style.color = flashState ? '#ffff00' : '#ffff66';
                    flashState = !flashState;
                }, 200);
                
            } else if (gameState.countdown === 1 && !goAnnounced) {
                displayText = `${gameState.countdown}.${milliseconds.toString().padStart(2, '0')}`;
                currentDisplayWord = 'GO!';
                goAnnounced = true;
                playSound('countdown');
                
                // Start flashing green
                if (flashInterval) clearInterval(flashInterval);
                let flashState = true;
                flashInterval = setInterval(() => {
                    const countdownElement = document.getElementById('countdown');
                    countdownElement.style.color = flashState ? '#00ff00' : '#66ff66';
                    flashState = !flashState;
                }, 200);
                
            } else if (currentDisplayWord) {
                // Keep showing the current word with countdown
                displayText = `${gameState.countdown}.${milliseconds.toString().padStart(2, '0')}`;
            }
            
            document.getElementById('countdown').textContent = displayText;
            document.getElementById('nextRaceTime').textContent = `${gameState.countdown}.${milliseconds.toString().padStart(2, '0')}s`;
            
            if (!currentDisplayWord) {
                document.getElementById('countdown').style.color = '#ff006e';
            }
            
            if (gameState.countdown <= 5) {
                playSound('countdown');
            }
            
            if (gameState.countdown <= 0) {
                if (flashInterval) {
                    clearInterval(flashInterval);
                    flashInterval = null;
                }
                startRace();
            }
            
            // Simple betting trigger - start at countdown 9
            if (gameState.countdown === 9) {
                startAutomaticBetting();
            }
        } else {
            // Keep countdown visible during race with "RACING!" text
            document.getElementById('countdown').textContent = 'RACING!';
            document.getElementById('countdown').style.color = '#00ff00';
            document.getElementById('nextRaceTime').textContent = 'Racing...';
        }
    }, 50); // Update every 50ms for smooth millisecond display
    
    // Render loop
    requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    // Initialize timing on first frame
    if (gameState.lastFrameTime === 0) {
        gameState.lastFrameTime = currentTime;
    }
    
    // Calculate delta time in seconds
    const deltaTime = (currentTime - gameState.lastFrameTime) / 1000;
    const targetFrameTime = 1 / gameState.targetFPS; // 16.67ms for 60fps
    
    // Accumulate frame time for consistent animation frame counting
    gameState.frameTimeAccumulator += deltaTime;
    
    // Update animation frame counter based on target FPS (consistent across browsers)
    while (gameState.frameTimeAccumulator >= targetFrameTime) {
        gameState.animationFrame++;
        gameState.frameTimeAccumulator -= targetFrameTime;
    }
    
    if (gameState.isRacing) {
        updateRace(deltaTime);
        renderRace();
    }
    
    gameState.lastFrameTime = currentTime;
    requestAnimationFrame(gameLoop);
}

function startRace() {
    // Prevent multiple races from starting
    if (gameState.isRacing || gameState.raceEnded) {
        return;
    }
    
    gameState.isRacing = true;
    gameState.raceEnded = false;
    gameState.raceStartTime = Date.now(); // Set race start time for speed calculation
    document.getElementById('raceOverlay').style.display = 'none';
    

    

    
    // Lock background during race
    lockBackground();
    
    // Grey out betting panel during race if feature is enabled
    if (GAME_CONFIG.enableBettingPanelGreying) {
        const bettingPanel = document.querySelector('.betting-panel');
        if (bettingPanel) {
            bettingPanel.classList.add('race-active');
        }
    }
    
    // Reset racers
    gameState.racers.forEach((racer, index) => {
        racer.x = 50;
        racer.y = 50 + index * 80;
        racer.currentSpeed = 0;
        racer.finished = false;
        racer.finishTime = 0;
        racer.displayX = 0;
        racer.displayY = 0;
    });
    
    // Reset track animation
    trackOffset = 0;
    trackSpeed = 0;
    
    addChatMessage('System', '🏁 Race started! GO GO GO!', 'legendary');
    playSound('raceStart');
}

function updateRace(deltaTime) {
    const canvas = document.getElementById('raceCanvas');
    const finishProgress = 0.85; // Finish at 85% of track progress - original race parameters
    
    // Calculate race progress and time for realistic acceleration
    const timeElapsed = gameState.raceStartTime ? (Date.now() - gameState.raceStartTime) / 1000 : 0;
    const raceProgress = gameState.racers.reduce((max, r) => Math.max(max, r.x / (canvas.width * finishProgress)), 0);
    
    gameState.racers.forEach(racer => {
        if (!racer.finished) {
            // Calculate realistic acceleration curve - NEW 40 km/hr MAX
            const accelerationPhase = Math.min(timeElapsed / 12, 1); // 12 seconds to reach full acceleration
            const accelerationMultiplier = 0.05 + (accelerationPhase * 0.95); // Start at 5% acceleration, reach 100%
            
            // Apply special ability randomly (more likely in later stages) - frame rate independent
            if (Math.random() < (0.003 + raceProgress * 0.008) * deltaTime * 60) { // Normalize for 60fps
                racer.currentSpeed += 0.3 + raceProgress * 0.2; // Reduced boost for new speed scale
                createSpecialEffect(racer);
            }
            
            // Update speed with realistic acceleration curve - start from 0, reach 35-40 km/hr
            // Use deltaTime to make acceleration frame rate independent
            const baseAccel = racer.baseAcceleration * accelerationMultiplier * 0.15 * deltaTime * 60; // Normalize for 60fps
            const speedVariation = 0.7 + Math.random() * 0.6; // More variation for longer race
            racer.currentSpeed += baseAccel * speedVariation;
            
            // Add slight wobble for realism (less frequent at high speeds) - frame rate independent
            if (Math.random() < (0.02 - racer.currentSpeed * 0.003) * deltaTime * 60) { // Normalize for 60fps
                racer.currentSpeed *= 0.98;
            }
            
            // Use individual max speed with realistic limits - 35-40 km/hr max
            const maxSpeedMultiplier = 0.1 + (raceProgress * 0.8); // Start at 10%, reach 90% of max speed
            const maxSpeed = 40; // Maximum speed in km/h
            racer.currentSpeed = Math.min(racer.currentSpeed, maxSpeed * maxSpeedMultiplier);
            
            // Ensure minimum speed to prevent stalling
            racer.currentSpeed = Math.max(racer.currentSpeed, 0.1);
            
            // Update position - frame rate independent movement
            racer.x += racer.currentSpeed * deltaTime * 60; // Normalize for 60fps
            
            // Check if finished - stop just before finish line
            if (racer.x >= canvas.width * finishProgress) {
                racer.finished = true;
                racer.finishTime = Date.now();
                racer.x = canvas.width * finishProgress; // Stop at finish line position
                
                // Check if all finished
                if (gameState.racers.every(r => r.finished)) {
                    endRace();
                }
            }
        }
    });
}

function renderRace() {
    const canvas = document.getElementById('raceCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update track animation - frame rate independent
    if (gameState.isRacing) {
        // Use the fastest racer's speed for track movement to create dynamic acceleration
        const fastestRacer = gameState.racers.reduce((fastest, racer) => 
            racer.currentSpeed > fastest.currentSpeed ? racer : fastest
        );
        trackSpeed = fastestRacer.currentSpeed;
        // Calculate delta time from last render for consistent track movement
        const currentTime = performance.now();
        const deltaTime = gameState.lastTrackUpdate ? (currentTime - gameState.lastTrackUpdate) / 1000 : 0;
        trackOffset += trackSpeed * 2 * deltaTime * 60; // Normalize for 60fps
        gameState.lastTrackUpdate = currentTime;
    }
    
    // Draw background image
    const backgroundImg = gameState.cachedImages['background'];
    if (backgroundImg) {
        console.log('Drawing background image:', backgroundImg.width, 'x', backgroundImg.height);
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    } else {
        console.log('Background image not loaded, using fallback gradient');
        // Fallback to original gradient if image not loaded
        const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.4);
        skyGradient.addColorStop(0, '#0a001a');
        skyGradient.addColorStop(0.5, '#1a0033');
        skyGradient.addColorStop(1, '#2a0040');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height * 0.4);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw race track with perspective - matching farm path
    const horizon = canvas.height * 0.4;
    const trackBottom = canvas.height;
    const trackCenter = canvas.width / 2;
    
    // Track surface gradient - farm path colors (orange/brown) - TEMPORARILY HIDDEN
    /*
    const trackGradient = ctx.createLinearGradient(0, horizon, 0, trackBottom);
    trackGradient.addColorStop(0, '#8B4513'); // Saddle brown at horizon
    trackGradient.addColorStop(0.5, '#A0522D'); // Sienna in middle
    trackGradient.addColorStop(1, '#654321'); // Dark brown at bottom
    ctx.fillStyle = trackGradient;
    
    // Draw track shape with perspective - full farm path bounds
    ctx.beginPath();
            ctx.moveTo(trackCenter - 500, trackBottom); // Original width at bottom
        ctx.lineTo(trackCenter - 120, horizon); // Original width at horizon
        ctx.lineTo(trackCenter + 120, horizon); // Original width at horizon
        ctx.lineTo(trackCenter + 500, trackBottom); // Original width at bottom
    ctx.closePath();
    ctx.fill();
    */
    
    // Draw track lanes - matching farm path width - TEMPORARILY HIDDEN
    /*
    for (let lane = 0; lane < 9; lane++) {
        const laneRatio = lane / 8;
        
        // Calculate lane positions with perspective - full farm path bounds
        const bottomX = trackCenter - 500 + (1000 * laneRatio);
        const topX = trackCenter - 120 + (240 * laneRatio);
        
        ctx.strokeStyle = '#8B4513'; // Brown lane dividers
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bottomX, trackBottom);
        ctx.lineTo(topX, horizon);
        ctx.stroke();
    }
    */
    
    // Draw animated lane markers - TEMPORARILY HIDDEN
    /*
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 4;
    const markerSpacing = 100;
    const markerLength = 40;
    
    for (let lane = 1; lane < 8; lane++) {
        const laneRatio = lane / 8;
        
        for (let i = 0; i < 20; i++) {
            const markerOffset = (trackOffset + i * markerSpacing) % (markerSpacing * 2);
            const markerProgress = markerOffset / (markerSpacing * 2);
            
            if (markerProgress < 0.5) {
                // Calculate positions with perspective - narrower track
                const y = trackBottom - (trackBottom - horizon) * (markerProgress * 2);
                const perspectiveScale = 1 - (y - horizon) / (trackBottom - horizon);
                
                const bottomX = trackCenter - 500 + (1000 * laneRatio);
                const topX = trackCenter - 120 + (240 * laneRatio);
                const x = bottomX + (topX - bottomX) * perspectiveScale;
                
                const markerSize = markerLength * (1 - perspectiveScale * 0.8);
                
                ctx.globalAlpha = 1 - perspectiveScale * 0.5;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y - markerSize);
                ctx.stroke();
            }
        }
    }
    ctx.globalAlpha = 1;
    */
    
    // Draw track barriers with cycling neon glow - TEMPORARILY HIDDEN
    /*
    const colors = [
        '#ff00ff', // Magenta
        '#00ffff', // Cyan
        '#ffff00', // Yellow
        '#ff0080', // Pink
        '#8000ff', // Purple
        '#00ff80', // Green
        '#ff8000', // Orange
        '#0080ff'  // Blue
    ];
    
    // Calculate color transition based on animation frame
    const colorIndex = Math.floor(gameState.animationFrame / 30) % colors.length;
    const nextColorIndex = (colorIndex + 1) % colors.length;
    const transitionProgress = (gameState.animationFrame % 30) / 30;
    
    // Interpolate between current and next color
    const currentColor = colors[colorIndex];
    const nextColor = colors[nextColorIndex];
    const interpolatedColor = interpolateColor(currentColor, nextColor, transitionProgress);
    
    ctx.shadowColor = interpolatedColor;
    ctx.shadowBlur = 20;
    
    // Left barrier - follows exact track edge (full farm path bounds)
    ctx.strokeStyle = interpolatedColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(trackCenter - 500, trackBottom); // Bottom left of track
    ctx.lineTo(trackCenter - 120, horizon); // Top left of track
    ctx.stroke();
    
    // Right barrier - follows exact track edge (full farm path bounds)
    ctx.beginPath();
    ctx.moveTo(trackCenter + 500, trackBottom); // Bottom right of track
    ctx.lineTo(trackCenter + 120, horizon); // Top right of track
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    */
    
    // Finish line removed - no more checkered pattern or FINISH text
    
    // Sort racers by Y position for proper depth rendering
    const sortedRacers = [...gameState.racers].sort((a, b) => a.y - b.y);
    
    // Draw racers with perspective
    sortedRacers.forEach((racer, index) => {
        const laneIndex = gameState.racers.indexOf(racer);
        const laneRatio = (laneIndex + 0.5) / 8;
        
        // Calculate racer position on track with perspective
        const progress = Math.min(racer.x / canvas.width, 0.9);
        const y = trackBottom - (trackBottom - horizon) * progress;
        const perspectiveScale = 1 - progress * 0.7;
        
        const bottomX = trackCenter - 500 + (1000 * laneRatio);
        const topX = trackCenter - 120 + (240 * laneRatio);
        const x = bottomX + (topX - bottomX) * progress;
        
        // Update racer position for collision
        racer.displayX = x;
        racer.displayY = y;
        
        // Draw racer shadow - positioned underneath and slightly behind
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + 40 * perspectiveScale, 30 * perspectiveScale, 10 * perspectiveScale, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ensure full opacity for character rendering
        ctx.globalAlpha = 1.0;
        

        
        // Vehicle shapes removed - only racer images remain
        
                    // Draw racer character - handle both image URLs and emoji
            if (racer.avatar.includes('http') || racer.avatar.includes('images/')) {
                // Draw cached image for URL avatars
                let cachedImg = gameState.cachedImages[racer.id];
                
                // For all characters with avatar2, alternate between two images during race and until winner modal appears
                if (racer.avatar2 && (gameState.isRacing || gameState.raceEnded)) {
                    const frameCount = Math.floor(gameState.animationFrame / 10); // Change every 10 frames
                    const useSecondImage = frameCount % 2 === 1;
                    
                    if (useSecondImage) {
                        cachedImg = gameState.cachedImages[racer.id + '_2'];
                    } else {
                        // Use first frame for first image during race
                        if (racer.name === "Sakura") {
                        cachedImg = gameState.cachedImages[racer.id + '_frame1'];
                    } else if (racer.name === "Yuki") {
                        cachedImg = gameState.cachedImages[racer.id + '_frame1'];
                    } else if (racer.name === "Akane") {
                        cachedImg = gameState.cachedImages[racer.id + '_frame1'];
                    } else if (racer.name === "Luna") {
                        cachedImg = gameState.cachedImages[racer.id + '_frame1'];
                    } else if (racer.name === "Miku") {
                        cachedImg = gameState.cachedImages[racer.id + '_frame1'];
                    } else if (racer.name === "Neko") {
                        cachedImg = gameState.cachedImages[racer.id + '_frame1'];
                    } else if (racer.name === "Hana") {
                        cachedImg = gameState.cachedImages[racer.id + '_frame1'];
                    } else if (racer.name === "Kira") {
                        cachedImg = gameState.cachedImages[racer.id + '_frame1'];
                    }
                }
            }
            
            if (cachedImg) {
                const size = 168 * perspectiveScale; // Increased from 120 to 168 (40% bigger)
                ctx.save();
                ctx.globalAlpha = 1.0; // Full opacity - no transparency
                ctx.drawImage(cachedImg, x - size/2, y - 30 * perspectiveScale - size/2, size, size);
                ctx.restore();
            }
        } else {
            // Draw emoji for text avatars
            ctx.font = `${40 * perspectiveScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(racer.avatar, x, y - 10 * perspectiveScale);
        }
        

        
        // Draw special ability effect with glow restored
        if (Math.random() < 0.02 && racer.currentSpeed > 3) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3 * perspectiveScale;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(x, y, 40 * perspectiveScale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    });
    
    // Draw UI elements
    drawRaceUI(ctx, canvas);
}

function drawRaceUI(ctx, canvas) {
    // Position indicator - ALL 8 RACERS WITH TIERED SIZING
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 200); // Increased height for all 8 racers
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Orbitron, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('POSITIONS', 25, 35);
    
    // Sort racers by progress (current race positions) - ACCURATE POSITIONING
    const positions = [...gameState.racers].sort((a, b) => {
        // If both racers are finished, sort by finish time (earlier = better position)
        if (a.finished && b.finished) {
            return a.finishTime - b.finishTime;
        }
        // If only one is finished, finished racer is ahead
        if (a.finished && !b.finished) {
            return -1;
        }
        if (!a.finished && b.finished) {
            return 1;
        }
        // If neither is finished, sort by current position (higher x = further ahead)
        return b.x - a.x;
    });
    
    // Display all 8 racers with tiered sizing and colors
    positions.forEach((racer, index) => {
        let color, fontSize, yOffset;
        
        if (index === 0) {
            // 1st Place - Gold and biggest
            color = '#fbbf24'; // Gold
            fontSize = '18px';
            yOffset = 55;
        } else if (index === 1) {
            // 2nd Place - Silver and medium
            color = '#c0c0c0'; // Silver
            fontSize = '16px';
            yOffset = 80;
        } else if (index === 2) {
            // 3rd Place - Bronze and medium
            color = '#cd7f32'; // Bronze
            fontSize = '16px';
            yOffset = 105;
        } else {
            // 4th-8th Place - White and smaller
            color = '#fff';
            fontSize = '14px';
            yOffset = 130 + (index - 3) * 15;
        }
        
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize} Orbitron, monospace`;
        ctx.fillText(`${index + 1}. ${racer.name}`, 25, yOffset);
    });
    
        // Speed indicator for fastest racer
    if (positions[0]) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width - 210, 10, 200, 60);
        
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 16px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TOP SPEED', canvas.width - 110, 35);
        
        // Find the fastest racer
        const fastestRacer = gameState.racers.reduce((fastest, racer) => 
            racer.currentSpeed > fastest.currentSpeed ? racer : fastest
        );
        
                         // Calculate dynamic speed based on race progress and time - NEW 40 km/hr MAX
        const raceProgress = fastestRacer.x / (canvas.width * 0.85); // Progress to finish line
        const maxSpeed = 40; // Maximum speed in km/h (reduced from 350)
        const accelerationTime = 12; // Time in seconds to reach full acceleration
        
        // Calculate speed based on race progress and time elapsed
        let dynamicSpeed;
        if (!gameState.raceStartTime) {
            dynamicSpeed = 0;
        } else {
            const timeElapsed = (Date.now() - gameState.raceStartTime) / 1000; // Time in seconds
            const accelerationProgress = Math.min(timeElapsed / accelerationTime, 1);
            
            // Realistic acceleration curve: start from 0, gradually increase to 35-40 km/hr
            const accelerationCurve = Math.pow(accelerationProgress, 1.5); // More gradual start
            const baseSpeed = maxSpeed * accelerationCurve;
            
            // Add variation based on race progress - final speed between 35-40 km/hr
            const progressBonus = raceProgress * 5; // Smaller bonus for realistic progression
            const finalSpeed = Math.min(maxSpeed, baseSpeed + progressBonus);
            
            // Add some randomness to final speed (35-40 km/hr range)
            const speedVariation = 0.875 + (Math.random() * 0.125); // 0.875 to 1.0 (35-40 km/hr)
            dynamicSpeed = finalSpeed * speedVariation;
        }
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Orbitron, monospace';
        ctx.fillText(`${Math.round(dynamicSpeed)} km/h`, canvas.width - 110, 60);
    }
    
    // Reset text alignment
    ctx.textAlign = 'left';
}

function createSpecialEffect(racer) {
    // Add visual effect for special ability
    const canvas = document.getElementById('raceCanvas');
    const effect = document.createElement('div');
    effect.style.position = 'absolute';
    effect.style.left = (racer.displayX || racer.x) + 'px';
    effect.style.top = (racer.displayY || racer.y) + 'px';
    effect.style.width = '100px';
    effect.style.height = '100px';
    effect.style.background = `radial-gradient(circle, ${racer.color}88, transparent)`;
    effect.style.borderRadius = '50%';
    effect.style.transform = 'translate(-50%, -50%)';
    effect.style.pointerEvents = 'none';
    effect.style.animation = 'specialPulse 0.5s ease-out';
    
    canvas.parentElement.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

function endRace() {
    // Prevent multiple endRace calls
    if (gameState.raceEnded) {
        return;
    }
    
    gameState.isRacing = false;
    gameState.raceEnded = true;
    
    // Determine winner with clear separation
    const finishedRacers = gameState.racers.filter(r => r.finished).sort((a, b) => a.finishTime - b.finishTime);
    const winner = finishedRacers[0];
    
    // Add dramatic delay to show clear winner
    setTimeout(() => {
        // Calculate payouts
        const payouts = calculatePayouts(winner);
        
        // Show winner modal
        showWinner(winner, payouts);
        
        // Reset for next race
        setTimeout(() => {
            resetRace();
            // Change race background for next race
            shuffleBackground();
        }, 10000);
    }, 2000); // 2 second delay to show clear winner
}

function calculatePayouts(winner) {
    const payouts = [];
    const winnerBets = (gameState.myBets[winner.id] || 0);
    
    if (winnerBets > 0) {
        const totalWinnerBets = winnerBets + 
            Object.values(gameState.bets)
                  .filter(bet => bet.racerId === winner.id)
                  .reduce((sum, bet) => sum + bet.amount, 0);
        
        const payout = (winnerBets / totalWinnerBets) * gameState.totalPot * 0.95; // 5% house edge
        payouts.push({
            player: 'You',
            amount: payout,
            profit: payout - winnerBets
        });
    }
    
    return payouts;
}

function showWinner(winner, payouts) {
    // Store winner for sharing functionality
    gameState.lastWinner = winner;
    
    const modal = document.getElementById('winnerModal');
    const display = document.getElementById('winnerDisplay');
    const potSummary = document.getElementById('potSummary');
    const topWinners = document.getElementById('topWinners');
    const yourResults = document.getElementById('yourResults');
    
    // Check if avatar is an image URL or emoji
    let avatarUrl = winner.avatar;
    
    // Use character face images for winner modal
    if (winner.name === "Sakura") {
        avatarUrl = "images/characters/sakura-face.png";
    } else if (winner.name === "Yuki") {
        avatarUrl = "images/characters/yuki-face.png";
    } else if (winner.name === "Akane") {
        avatarUrl = "images/characters/akane-face.png";
    } else if (winner.name === "Luna") {
        avatarUrl = "images/characters/luna-face.png";
    } else if (winner.name === "Miku") {
        avatarUrl = "images/characters/miku-face.png";
    } else if (winner.name === "Neko") {
        avatarUrl = "images/characters/neko-face.png";
    } else if (winner.name === "Hana") {
        avatarUrl = "images/characters/hana-face.png";
    } else if (winner.name === "Kira") {
        avatarUrl = "images/characters/kira-face.png";
    }
    
    const isImageUrl = avatarUrl.includes('http') || avatarUrl.includes('images/');
    const avatarContent = isImageUrl 
        ? `<img src="${avatarUrl}" alt="${winner.name}" style="width: 100%; height: 100%; object-fit: contain;">`
        : `<div style="font-size: 80px; display: flex; align-items: center; justify-content: center; height: 100%;">${avatarUrl}</div>`;
    
    // Winner display (left column)
    display.innerHTML = `
        <div class="winner-avatar">
            ${avatarContent}
        </div>
        <h3 style="font-size: 32px; margin-bottom: 10px; color: white;">${winner.name}</h3>
    `;
    
    // Calculate real total pot and USD value
    const totalPot = gameState.totalPot;
    const usdValue = totalPot * 165.28; // SOL to USD conversion
    
    // Calculate real top winners from all bets on the winner
    const winnerBets = calculateWinnerBets(winner.id);
    const topWinnersList = calculateTopWinners(winnerBets, totalPot);
    
    // Pot Summary (right column)
    potSummary.innerHTML = `
        <div>
            <span>Total Pot:</span>
            <span class="highlight" style="color: #ec4899;">${totalPot.toFixed(2)} SOL ($${usdValue.toFixed(2)})</span>
        </div>
        <div>
            <span>Winner:</span>
            <span class="highlight" style="color: #ec4899;">${winner.name}</span>
        </div>
    `;
    
    // Top Winners (real data) - add hyphens if no winners
    if (topWinnersList.length > 0) {
        topWinners.innerHTML = topWinnersList.map((winner, index) => `
            <div>
                <span>#${index + 1} ${winner.player}</span>
                <span class="positive">+${winner.profit.toFixed(2)} SOL ($${(winner.profit * 165.28).toFixed(2)})</span>
            </div>
        `).join('');
    } else {
        // Add 3 hyphens for consistent spacing when no winners
        topWinners.innerHTML = `
            <div><span>#1 ---</span><span class="neutral">---</span></div>
            <div><span>#2 ---</span><span class="neutral">---</span></div>
            <div><span>#3 ---</span><span class="neutral">---</span></div>
        `;
    }
    
    // Your Results
    const myBet = gameState.myBets[winner.id] || 0;
    const myWinnings = payouts.length > 0 ? payouts[0].amount : 0;
    const netResult = myWinnings - myBet;
    
    yourResults.innerHTML = `
        <div>
            <span>Total Bet:</span>
            <span class="neutral">${myBet.toFixed(2)} SOL ($${(myBet * 165.28).toFixed(2)})</span>
        </div>
        <div>
            <span>Winnings:</span>
            <span class="positive">+${myWinnings.toFixed(2)} SOL ($${(myWinnings * 165.28).toFixed(2)})</span>
        </div>
        <div>
            <span>Net Result:</span>
            <span class="${netResult >= 0 ? 'positive' : 'negative'}">${netResult >= 0 ? '+' : ''}${netResult.toFixed(2)} SOL ($${(netResult * 165.28).toFixed(2)})</span>
        </div>
    `;
    
    // Remove any existing action buttons first
    const existingButtons = document.querySelector('.action-buttons');
    if (existingButtons) {
        existingButtons.remove();
    }
    
    // Add action buttons to the victory section (left side)
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    actionButtons.innerHTML = `
        <button class="download-btn" onclick="downloadWinnerImage()">
            Download Image
        </button>
        <button class="share-btn" onclick="shareToTwitter()">
            Share to Twitter
        </button>
    `;
    
    // Insert action buttons after the winner display (left side)
    const victorySection = document.querySelector('.victory-section');
    victorySection.appendChild(actionButtons);
    
    modal.style.display = 'flex';
    
    // Add click event listener to close modal when clicking anywhere
    const closeModalOnClick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.removeEventListener('click', closeModalOnClick);
        }
    };
    
    // Add event listener after a short delay to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('click', closeModalOnClick);
    }, 100);
    
    // Celebration effects
    createCelebrationEffects();
    playSound('victory');
}

function createCelebrationEffects() {
    // Add confetti or fireworks effect
    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '80px'; // Start from header area instead of top
        confetti.style.width = '12px';
        confetti.style.height = '12px';
        // Brighter, more vibrant colors
        confetti.style.background = [
            '#ff1493', // Deep pink
            '#00ffff', // Cyan
            '#ffff00', // Yellow
            '#ff4500', // Orange red
            '#9400d3', // Violet
            '#00ff00', // Lime
            '#ff69b4', // Hot pink
            '#1e90ff'  // Dodger blue
        ][Math.floor(Math.random() * 8)];
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.boxShadow = '0 0 8px currentColor';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '2500';
        
        document.body.appendChild(confetti);
        
        // Animate confetti falling
        const animation = confetti.animate([
            { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
            { transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
        ], {
            duration: 3000 + Math.random() * 2000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        animation.onfinish = () => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        };
    }
}

function resetRace() {
    gameState.countdown = 10; // Changed to 10 seconds as requested
    gameState.raceNumber++;
    gameState.myBets = {};
    gameState.bets = {};
    gameState.totalPot = 0;
    gameState.raceEnded = false; // Reset the race ended flag
    gameState.raceStartTime = null; // Reset race start time
    gameState.animationFrame = 0; // Reset animation frame for image flipping
    gameState.lastFrameTime = 0; // Reset frame timing
    gameState.frameTimeAccumulator = 0; // Reset accumulator
    gameState.lastTrackUpdate = 0; // Reset track timing
    
    // Reset pie chart state for new race
    currentPieData = [];
    isAnimating = false;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    // Unlock background for next race
    unlockBackground();
    
    // Re-enable betting panel after race if feature is enabled
    if (GAME_CONFIG.enableBettingPanelGreying) {
        const bettingPanel = document.querySelector('.betting-panel');
        if (bettingPanel) {
            bettingPanel.classList.remove('race-active');
        }
    }
    
    document.getElementById('winnerModal').style.display = 'none';
    document.getElementById('raceOverlay').style.display = 'flex';
    document.getElementById('countdown').style.color = '#ff006e';
    document.getElementById('countdown').innerHTML = '10.00';
    document.getElementById('raceNumber').textContent = gameState.raceNumber;
    
    // Reset UI
    document.querySelectorAll('.racer-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    updateBetDisplay();
    updateBettingPanel();
    
    // Start betting system immediately after race reset
    console.log('🔄 Race reset - betting will start at countdown 10');
    // setTimeout(() => {
    //     startAutomaticBetting();
    // }, 1000); // Start betting after 1 second
    
    // Also start betting when countdown is between 9-10 seconds
    // setTimeout(() => {
    //     if (gameState.countdown >= 9 && gameState.countdown <= 10 && !gameState.isRacing) {
    //         console.log('⏰ Countdown-based betting trigger activated');
    //         startAutomaticBetting();
    //     }
    // }, 2000);
}

// Chat System
function initializeChat() {
    // Simulate chat messages with longer intervals and more variety
    setInterval(addRandomChatMessage, 5000 + Math.random() * 3000);
}

function addChatMessage(username, text, rarity = '') {
    const messages = document.getElementById('chatMessages');
    const message = document.createElement('div');
    const isSystem = username === 'System';
    message.className = `message ${isSystem ? 'system' : ''} ${rarity}`;
    
    const level = Math.floor(Math.random() * 99) + 1; // Cap at 99
    
    // Create message content container
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Create username above
    const usernameSpan = document.createElement('div');
    usernameSpan.className = 'username';
    
    // Set username color based on level and rarity
    let usernameColor = '#9ca3af'; // Default gray
    
    if (rarity === 'legendary') {
        usernameColor = '#fbbf24';
    } else if (rarity === 'epic') {
        usernameColor = '#a855f7';
    } else if (rarity === 'rare') {
        usernameColor = '#3b82f6';
    } else {
        // Color based on level range
        if (level <= 10) {
            usernameColor = '#9ca3af';
        } else if (level <= 20) {
            usernameColor = '#10b981';
        } else if (level <= 30) {
            usernameColor = '#60a5fa';
        } else if (level <= 40) {
            usernameColor = '#a78bfa';
        } else if (level <= 50) {
            usernameColor = '#f472b6';
        } else if (level <= 60) {
            usernameColor = '#fbbf24';
        } else if (level <= 70) {
            usernameColor = '#f87171';
        } else if (level <= 80) {
            usernameColor = '#a855f7';
        } else if (level <= 90) {
            usernameColor = '#ef4444';
        } else {
            usernameColor = '#f59e0b';
        }
    }
    
    usernameSpan.style.color = usernameColor;
    
    // Add glow effect for level 50 and up
    if (level >= 50) {
        usernameSpan.style.textShadow = `0 0 5px ${usernameColor}, 0 0 8px ${usernameColor}`;
    }
    
    usernameSpan.textContent = username;
    
    // Create message text underneath
    const textSpan = document.createElement('div');
    textSpan.className = 'message-text';
    textSpan.textContent = text;
    
    // Append elements to message content
    messageContent.appendChild(usernameSpan);
    messageContent.appendChild(textSpan);
    
    if (!isSystem) {
        // Create level badge on the left for non-system messages
        const levelBadge = document.createElement('span');
        levelBadge.className = 'level-badge';
        
        // Add color class based on level range
        if (level <= 10) {
            levelBadge.classList.add('level-1-10');
        } else if (level <= 20) {
            levelBadge.classList.add('level-11-20');
        } else if (level <= 30) {
            levelBadge.classList.add('level-21-30');
        } else if (level <= 40) {
            levelBadge.classList.add('level-31-40');
        } else if (level <= 50) {
            levelBadge.classList.add('level-41-50');
        } else if (level <= 60) {
            levelBadge.classList.add('level-51-60');
        } else if (level <= 70) {
            levelBadge.classList.add('level-61-70');
        } else if (level <= 80) {
            levelBadge.classList.add('level-71-80');
        } else if (level <= 90) {
            levelBadge.classList.add('level-81-90');
        } else {
            levelBadge.classList.add('level-91-99');
        }
        
        levelBadge.setAttribute('data-level', level);
        levelBadge.textContent = '';
        message.appendChild(levelBadge);
    }
    
    message.appendChild(messageContent);
    
    // Add message to container
    messages.appendChild(message);
    
    // Auto-scroll to bottom
    messages.scrollTop = messages.scrollHeight;
    
    // Remove old messages to maintain performance (keep last 50)
    const messageCount = messages.children.length;
    if (messageCount > 50) {
        const messagesToRemove = messageCount - 50;
        for (let i = 0; i < messagesToRemove; i++) {
            if (messages.firstChild) {
                messages.removeChild(messages.firstChild);
            }
        }
    }
    
    // Update notification badge if chat is collapsed
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel.classList.contains('collapsed')) {
        const currentBadge = document.getElementById('notificationBadge');
        const currentCount = parseInt(currentBadge.textContent) || 0;
        updateNotificationBadge(currentCount + 1);
    }
}

function addRandomChatMessage() {
    const usernames = ['SakuraLover', 'WaifuHunter', 'MoonPrincess', 'DragonSlayer', 'NekoMaster', 'AnimeLord', 'CryptoKing', 'SolanaSimp'];
    const messages = [
        'Sakura is best girl! 🌸',
        'All in on Yuki! ❄️',
        'This race is hype!',
        'TO THE MOON! 🚀',
        'Easy money 💰',
        'Neko gang where you at? 🐱',
        'LETS GOOOO!',
        'My waifu will win!',
        'Betting everything on Akane 🔥',
        'Good luck everyone! 🍀',
        'This is going to be close!',
        'Who else is betting?',
        'The odds look good!',
        'Let\'s see who wins! 🏁'
    ];
    
    // Only add messages 70% of the time to reduce spam
    if (Math.random() > 0.3) {
        const username = usernames[Math.floor(Math.random() * usernames.length)];
        const message = messages[Math.floor(Math.random() * messages.length)];
        const rarities = ['', '', '', '', 'rare', 'epic', 'legendary'];
        const rarity = rarities[Math.floor(Math.random() * rarities.length)];
        
        addChatMessage(username, message, rarity);
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!gameState.walletConnected) {
        alert('Connect your wallet to chat!');
        return;
    }
    
    if (!gameState.userName) {
        alert('Please set your username first!');
        return;
    }
    
    if (!message) {
        return;
    }
    
    // Check if cooldown is active
    if (gameState.chatCooldown > 0) {
        return;
    }
    
    // Send message with user's name
    addChatMessage(gameState.userName, message, 'rare');
    input.value = '';
    
    // Set cooldown
    gameState.chatCooldown = 5;
    gameState.lastMessageTime = Date.now();
    
    // Update input placeholder
    updateChatInputPlaceholder();
}



// Bulletproof betting system - exactly 50 SOL total
function startAutomaticBetting() {
    // Clear all existing bets
    gameState.bets = {};
    gameState.totalPot = 0;
    
    // Fixed bet amounts that add up to exactly 50 SOL
    const betAmounts = [12, 8, 15, 6, 9];
    const botNames = ['CryptoKing', 'WhaleLord', 'DiamondHands', 'MoonBoy', 'SolanaSimp'];
    
    let betIndex = 0;
    
    const placeBet = () => {
        if (gameState.isRacing || betIndex >= betAmounts.length) return;
        
        const betAmount = betAmounts[betIndex];
        const botName = botNames[betIndex];
        const racerId = Math.floor(Math.random() * 8) + 1;
        
        gameState.bets[`bet-${betIndex}`] = {
            racerId,
            amount: betAmount,
            player: botName,
            timestamp: Date.now()
        };
        
        gameState.totalPot = Object.values(gameState.bets).reduce((sum, bet) => sum + bet.amount, 0);
        
        updateBetDisplay();
        updateBettingPanel();
        
        const racer = gameState.racers.find(r => r.id === racerId);
        addChatMessage(botName, `${botName} bet ${formatSOLWithUSD(betAmount)} on ${racer.name}! 💰`, '');
        
        betIndex++;
        setTimeout(placeBet, 2000);
    };
    
    setTimeout(placeBet, 2000);
}

// Enhanced dynamic betting system with realistic patterns (legacy)
function startDynamicBetting() {
    console.log('🎲 Starting dynamic betting system...');
    
    // Clear any existing bets for fresh start
    gameState.bets = {};
    gameState.totalPot = 0;
    
    // Create betting waves with different intensities
    const bettingWaves = [
        { count: 3, delay: 0, interval: 500 },      // Initial burst (simplified)
        { count: 5, delay: 1500, interval: 600 },   // Steady flow (simplified)
        { count: 7, delay: 4000, interval: 400 },   // High activity (simplified)
        { count: 4, delay: 7000, interval: 700 }    // Final rush (simplified)
    ];
    
    let totalBetsPlaced = 0;
    
    bettingWaves.forEach((wave, waveIndex) => {
        setTimeout(() => {
            let betsInWave = 0;
            
            const placeBetInWave = () => {
                console.log(`🎯 Attempting to place bet in wave ${waveIndex}, betsInWave: ${betsInWave}, isRacing: ${gameState.isRacing}, countdown: ${gameState.countdown}`);
                
                if (betsInWave >= wave.count || gameState.isRacing || gameState.countdown <= 0) {
                    console.log('❌ Bet placement blocked - conditions not met');
                    return;
                }
                
                const racerId = Math.floor(Math.random() * 8) + 1;
                
                // Dynamic bet amounts based on wave intensity
                let betAmounts, weights;
                if (waveIndex === 0) { // Initial burst - smaller bets
                    betAmounts = [0.1, 0.25, 0.5, 1, 2];
                    weights = [40, 30, 20, 8, 2];
                } else if (waveIndex === 1) { // Steady flow - medium bets
                    betAmounts = [0.5, 1, 2, 3, 5];
                    weights = [30, 35, 20, 10, 5];
                } else if (waveIndex === 2) { // High activity - larger bets
                    betAmounts = [1, 2, 3, 5, 8, 12];
                    weights = [25, 30, 25, 15, 3, 2];
                } else { // Final rush - mixed sizes
                    betAmounts = [0.25, 0.5, 1, 2, 5, 10];
                    weights = [20, 25, 30, 15, 8, 2];
                }
                
                const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
                let random = Math.random() * totalWeight;
                let amount = betAmounts[0];
                
                for (let i = 0; i < weights.length; i++) {
                    random -= weights[i];
                    if (random <= 0) {
                        amount = betAmounts[i];
                        break;
                    }
                }
                
                const botNames = [
                    'CryptoKing', 'WhaleLord', 'DiamondHands', 'MoonBoy', 'SolanaSimp',
                    'AnimeLover', 'WaifuHunter', 'RacingPro', 'BetMaster', 'LuckyGambler',
                    'CryptoQueen', 'SolanaWhale', 'RaceFan', 'BettingGod', 'AnimeRacer',
                    'CryptoNinja', 'BettingElite', 'RaceChampion', 'SolanaMaster', 'AnimePro'
                ];
                const botName = botNames[Math.floor(Math.random() * botNames.length)];
                
                // Add the bet with enhanced metadata
                const betId = `bot-${Date.now()}-${totalBetsPlaced}`;
                gameState.bets[betId] = {
                    racerId,
                    amount,
                    player: botName,
                    timestamp: Date.now(),
                    wave: waveIndex
                };
                
                gameState.totalPot += amount;
                totalBetsPlaced++;
                betsInWave++;
                
                console.log(`✅ Bet placed: ${botName} bet ${amount} SOL on ${racer.name}. Total pot: ${gameState.totalPot} SOL`);
                
                // Immediate UI update for real-time feel
                updateBetDisplay();
                updateBettingPanel();
                
                // Show betting activity indicator occasionally
                if (Math.random() < 0.3) { // 30% chance to show indicator
                    showBettingActivity();
                }
                
                // Enhanced chat messages with context
                const racer = gameState.racers.find(r => r.id === racerId);
                const rarities = ['', '', '', '', 'rare', 'epic', 'legendary'];
                const rarity = rarities[Math.floor(Math.random() * rarities.length)];
                
                if (gameState.chatCooldown === 0) {
                    const messages = [
                        `Bet ${formatSOLWithUSD(amount)} on ${racer.name}!`,
                        `Going all in on ${racer.name} with ${formatSOLWithUSD(amount)}!`,
                        `${formatSOLWithUSD(amount)} on ${racer.name} - let's go!`,
                        `Trusting ${racer.name} with ${formatSOLWithUSD(amount)}!`,
                        `${formatSOLWithUSD(amount)} SOL on ${racer.name}! 🚀`
                    ];
                    const message = messages[Math.floor(Math.random() * messages.length)];
                    addChatMessage(botName, message, rarity);
                }
                
                // Schedule next bet in this wave
                if (betsInWave < wave.count && !gameState.isRacing && gameState.countdown > 0) {
                    const nextDelay = wave.interval + Math.random() * 200; // Add some randomness
                    setTimeout(placeBetInWave, nextDelay);
                }
            };
            
            // Start this wave
            placeBetInWave();
            
        }, wave.delay);
    });
    
    // Fallback: Start simple betting immediately
    console.log('🎯 Starting fallback betting system');
    let fallbackBets = 0;
    const fallbackInterval = setInterval(() => {
        if (fallbackBets >= 10 || gameState.isRacing || gameState.countdown <= 0) {
            clearInterval(fallbackInterval);
            return;
        }
        
        const racerId = Math.floor(Math.random() * 8) + 1;
        const amount = [0.5, 1, 2, 3][Math.floor(Math.random() * 4)];
        const botName = ['TestBot1', 'TestBot2', 'TestBot3'][Math.floor(Math.random() * 3)];
        
        const betId = `fallback-${Date.now()}-${fallbackBets}`;
        gameState.bets[betId] = {
            racerId,
            amount,
            player: botName,
            timestamp: Date.now()
        };
        
        gameState.totalPot += amount;
        fallbackBets++;
        
        console.log(`🔄 Fallback bet: ${botName} bet ${amount} SOL`);
        updateBetDisplay();
        updateBettingPanel();
        
        const racer = gameState.racers.find(r => r.id === racerId);
        addChatMessage(botName, `Bet ${formatSOLWithUSD(amount)} on ${racer.name}!`, '');
        
    }, 1000); // Every second
    
    // Continuous monitoring: Check if betting should be active
    const bettingMonitor = setInterval(() => {
        if (gameState.isRacing || gameState.countdown <= 0) {
            clearInterval(bettingMonitor);
            return;
        }
        
        // If no bets have been placed and we're in countdown, start betting
        // if (Object.keys(gameState.bets).length === 0 && gameState.countdown > 0 && gameState.countdown <= 10) {
        //     console.log('🔍 Betting monitor: No bets detected, starting betting system');
        //     startAutomaticBetting();
        // }
    }, 3000); // Check every 3 seconds
}

// Legacy function for backward compatibility
function addBotBets() {
    startDynamicBetting();
}

// Test function to manually trigger betting (for debugging)
function testBetting() {
    console.log('🧪 Manual betting test triggered');
    startAutomaticBetting();
}

// Add test button to window for debugging
window.testBetting = testBetting;



// Add visual betting activity indicator
function showBettingActivity() {
    const activityIndicator = document.createElement('div');
    activityIndicator.className = 'betting-activity-indicator';
    activityIndicator.innerHTML = '💰';
    activityIndicator.style.cssText = `
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        background: rgba(147, 51, 234, 0.9);
        color: white;
        padding: 10px;
        border-radius: 50%;
        font-size: 20px;
        z-index: 1000;
        animation: bettingPulse 1s ease-in-out infinite;
        pointer-events: none;
    `;
    
    document.body.appendChild(activityIndicator);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (activityIndicator.parentNode) {
            activityIndicator.parentNode.removeChild(activityIndicator);
        }
    }, 3000);
}

// Add CSS animation for betting activity
const style = document.createElement('style');
style.textContent = `
    @keyframes bettingPulse {
        0%, 100% { 
            transform: translateY(-50%) scale(1);
            box-shadow: 0 0 10px rgba(147, 51, 234, 0.5);
        }
        50% { 
            transform: translateY(-50%) scale(1.2);
            box-shadow: 0 0 20px rgba(147, 51, 234, 0.8);
        }
    }
`;
document.head.appendChild(style);


// Leaderboard
function updateLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    
    // Check if leaderboard element exists before trying to use it
    if (!leaderboard) {
        return; // Exit function if element doesn't exist
    }
    
    const topPlayers = [
        { name: 'WaifuKing', winnings: 1337.42 },
        { name: 'AnimeLord', winnings: 999.99 },
        { name: 'MoonPrincess', winnings: 777.77 },
        { name: 'DragonSlayer', winnings: 555.55 },
        { name: 'NekoMaster', winnings: 333.33 }
    ];
    
    leaderboard.innerHTML = topPlayers.map((player, index) => `
        <div class="top-player">
            <div class="rank-badge rank-${index + 1}">${index + 1}</div>
            <div style="flex: 1;">
                <div style="font-weight: bold;">${player.name}</div>
                <div style="font-size: 12px; color: #9ca3af;">${formatSOLWithUSD(player.winnings)}</div>
            </div>
        </div>
    `).join('');
}

// Background control functions
function changeBackground() {
    if (gameState.backgroundLocked) return; // Don't change during race
    
    // Cycle through 3 background variants
    gameState.currentBackground = (gameState.currentBackground + 1) % 3;
    setBackground(gameState.currentBackground);
}

function setBackground(variant) {
    const animatedBg = document.getElementById('animatedBg');
    if (!animatedBg) return;
    
    const backgrounds = [
        'linear-gradient(45deg, #0a0a0a, #1a0a2a, #2a0a3a)',
        'linear-gradient(45deg, #1a0a1a, #2a0a2a, #3a0a3a)',
        'linear-gradient(45deg, #0a1a0a, #1a2a0a, #2a3a0a)'
    ];
    
    animatedBg.style.background = backgrounds[variant];
}

function lockBackground() {
    gameState.backgroundLocked = true;
}

function unlockBackground() {
    gameState.backgroundLocked = false;
}

// Background animations
function animateBackground() {
    // Create particles container if it doesn't exist
    let particlesContainer = document.getElementById('particles');
    if (!particlesContainer) {
        particlesContainer = document.createElement('div');
        particlesContainer.id = 'particles';
        particlesContainer.className = 'particles';
        document.body.appendChild(particlesContainer);
    }
    
    // Clear existing particles
    particlesContainer.innerHTML = '';
    
    // Create initial particles
    createParticles();
    
    // Continuously add new particles
    setInterval(() => {
        // Remove particles that have finished their animation
        const particles = particlesContainer.querySelectorAll('.particle');
        particles.forEach(particle => {
            const rect = particle.getBoundingClientRect();
            if (rect.top < -50) {
                particle.remove();
            }
        });
        
        // Add new particles if we have less than 50
        if (particles.length < 50) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.width = particle.style.height = Math.random() * 5 + 3 + 'px';
            particle.style.animationDelay = '0s';
            particle.style.animationDuration = Math.random() * 20 + 20 + 's';
            particlesContainer.appendChild(particle);
        }
    }, 1000);
}

// Update online users
function updateOnlineUsers() {
    setInterval(() => {
        gameState.onlineUsers += Math.floor(Math.random() * 11) - 5;
        gameState.onlineUsers = Math.max(1000, Math.min(2000, gameState.onlineUsers));
        document.getElementById('onlineCount').textContent = gameState.onlineUsers;
    }, 5000);
}

// Chat cooldown timer
function startChatCooldownTimer() {
    setInterval(() => {
        if (gameState.chatCooldown > 0) {
            gameState.chatCooldown--;
            updateChatInputPlaceholder();
        }
    }, 1000);
}

// Update chat input placeholder based on cooldown
function updateChatInputPlaceholder() {
    const input = document.getElementById('chatInput');
    
    if (gameState.chatCooldown > 0) {
        input.placeholder = `Wait ${gameState.chatCooldown}s to send message...`;
        input.disabled = true;
        input.style.opacity = '0.6';
        input.style.cursor = 'not-allowed';
    } else {
        input.placeholder = 'Type your message...';
        input.disabled = false;
        input.style.opacity = '1';
        input.style.cursor = 'text';
    }
}

// Sound effects (placeholder)
function playSound(type) {
    if (!gameState.soundEnabled) return;
    // Add actual sound implementation here
    console.log(`Playing sound: ${type}`);
}

function initializeSolanaPrice() {
    updateSolanaPrice();
    // Update price every 30 seconds
    setInterval(updateSolanaPrice, 30000);
}

async function updateSolanaPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        const price = data.solana.usd;
        const priceElement = document.getElementById('solanaPrice');
        if (priceElement) {
            priceElement.textContent = `$${price.toFixed(2)}`;
        }
    } catch (error) {
        console.log('Failed to fetch Solana price:', error);
        // Fallback to a static price if API fails
        const priceElement = document.getElementById('solanaPrice');
        if (priceElement) {
            priceElement.textContent = '$165.28';
        }
    }
} 

function preloadImages() {
    console.log('preloadImages called');
    // Initialize background images array
    gameState.backgroundImages = [
        {
            name: "Background 17",
            url: "images/backgrounds/background-image17.png",
            fallback: null
        },
        {
            name: "Background 19",
            url: "images/backgrounds/background-image19.png",
            fallback: null
        },
        {
            name: "Background 24",
            url: "images/backgrounds/background-image24.png",
            fallback: null
        },
        {
            name: "Background 33",
            url: "images/backgrounds/background-image33.png",
            fallback: null
        },
        {
            name: "Background 34",
            url: "images/backgrounds/background-image34.png",
            fallback: null
        },
        {
            name: "Background 35",
            url: "images/backgrounds/background-image35.png",
            fallback: null
        },
        {
            name: "Background 36",
            url: "images/backgrounds/background-image36.png",
            fallback: null
        },
        {
            name: "Background 37",
            url: "images/backgrounds/background-image37.png",
            fallback: null
        },
        {
            name: "Background 38",
            url: "images/backgrounds/background-image38.png",
            fallback: null
        }
    ];
    
    // Set current background index (load from localStorage or default to 0)
    gameState.currentBackgroundIndex = parseInt(localStorage.getItem('currentBackgroundIndex')) || 0;
    gameState.lastBackgroundIndex = parseInt(localStorage.getItem('lastBackgroundIndex')) || -1;
    
    // Preload current background image
    loadBackgroundImage(gameState.currentBackgroundIndex);
    
    // Start background shuffling
    console.log('About to start background shuffling');
    startBackgroundShuffling();
    
    gameState.racers.forEach(racer => {
        if (racer.avatar.includes('http') || racer.avatar.includes('images/')) {
            const img = new Image();
            img.onload = () => {
                gameState.cachedImages[racer.id] = img;
                console.log(`Image loaded for ${racer.name}`);
            };
            img.onerror = () => {
                console.error(`Failed to load image for ${racer.name}`);
            };
            img.src = racer.avatar;
            
            // Preload second image for all characters that have avatar2
            if (racer.avatar2) {
                const img2 = new Image();
                img2.onload = () => {
                    gameState.cachedImages[racer.id + '_2'] = img2;
                    console.log(`Second image loaded for ${racer.name}`);
                };
                img2.onerror = () => {
                    console.error(`Failed to load second image for ${racer.name}`);
                };
                img2.src = racer.avatar2;
                
                // Preload first frame for race animation
                if (racer.name === "Sakura") {
                    const frame1Img = new Image();
                    frame1Img.onload = () => {
                        gameState.cachedImages[racer.id + '_frame1'] = frame1Img;
                        console.log(`Frame 1 image loaded for ${racer.name} race animation`);
                    };
                    frame1Img.onerror = () => {
                        console.error(`Failed to load frame 1 image for ${racer.name}`);
                    };
                    frame1Img.src = "images/characters/sakura-frame1.png";
                } else if (racer.name === "Yuki") {
                    const frame1Img = new Image();
                    frame1Img.onload = () => {
                        gameState.cachedImages[racer.id + '_frame1'] = frame1Img;
                        console.log(`Frame 1 image loaded for ${racer.name} race animation`);
                    };
                    frame1Img.onerror = () => {
                        console.error(`Failed to load frame 1 image for ${racer.name}`);
                    };
                    frame1Img.src = "images/characters/yuki-frame1.png";
                } else if (racer.name === "Akane") {
                    const frame1Img = new Image();
                    frame1Img.onload = () => {
                        gameState.cachedImages[racer.id + '_frame1'] = frame1Img;
                        console.log(`Frame 1 image loaded for ${racer.name} race animation`);
                    };
                    frame1Img.onerror = () => {
                        console.error(`Failed to load frame 1 image for ${racer.name}`);
                    };
                    frame1Img.src = "images/characters/akane-frame4.png";
                } else if (racer.name === "Luna") {
                    const frame1Img = new Image();
                    frame1Img.onload = () => {
                        gameState.cachedImages[racer.id + '_frame1'] = frame1Img;
                        console.log(`Frame 1 image loaded for ${racer.name} race animation`);
                    };
                    frame1Img.onerror = () => {
                        console.error(`Failed to load frame 1 image for ${racer.name}`);
                    };
                    frame1Img.src = "images/characters/luna-frame11.png";
                } else if (racer.name === "Miku") {
                    const frame1Img = new Image();
                    frame1Img.onload = () => {
                        gameState.cachedImages[racer.id + '_frame1'] = frame1Img;
                        console.log(`Frame 1 image loaded for ${racer.name} race animation`);
                    };
                    frame1Img.onerror = () => {
                        console.error(`Failed to load frame 1 image for ${racer.name}`);
                    };
                    frame1Img.src = "images/characters/miku-frame1.png";
                } else if (racer.name === "Neko") {
                    const frame1Img = new Image();
                    frame1Img.onload = () => {
                        gameState.cachedImages[racer.id + '_frame1'] = frame1Img;
                        console.log(`Frame 1 image loaded for ${racer.name} race animation`);
                    };
                    frame1Img.onerror = () => {
                        console.error(`Failed to load frame 1 image for ${racer.name}`);
                    };
                    frame1Img.src = "images/characters/neko-frame1.png";
                } else if (racer.name === "Hana") {
                    const frame1Img = new Image();
                    frame1Img.onload = () => {
                        gameState.cachedImages[racer.id + '_frame1'] = frame1Img;
                        console.log(`Frame 1 image loaded for ${racer.name} race animation`);
                    };
                    frame1Img.onerror = () => {
                        console.error(`Failed to load frame 1 image for ${racer.name}`);
                    };
                    frame1Img.src = "images/characters/hana-frame1.png";
                } else if (racer.name === "Kira") {
                    const frame1Img = new Image();
                    frame1Img.onload = () => {
                        gameState.cachedImages[racer.id + '_frame1'] = frame1Img;
                        console.log(`Frame 1 image loaded for ${racer.name} race animation`);
                    };
                    frame1Img.onerror = () => {
                        console.error(`Failed to load frame 1 image for ${racer.name}`);
                    };
                    frame1Img.src = "images/characters/kira-frame1.png";
                }
            }
        }
    });
}

// Calculate all bets placed on the winner
function calculateWinnerBets(winnerId) {
    const winnerBets = [];
    
    // Add player bets on winner
    const playerBet = gameState.myBets[winnerId] || 0;
    if (playerBet > 0) {
        winnerBets.push({
            player: 'You',
            amount: playerBet,
            type: 'player'
        });
    }
    
    // Add bot bets on winner
    Object.values(gameState.bets).forEach(bet => {
        if (bet.racerId === winnerId) {
            winnerBets.push({
                player: bet.player,
                amount: bet.amount,
                type: 'bot'
            });
        }
    });
    
    return winnerBets;
}

// Calculate top winners and their profits
function calculateTopWinners(winnerBets, totalPot) {
    if (winnerBets.length === 0) {
        return [];
    }
    
    const totalWinnerBets = winnerBets.reduce((sum, bet) => sum + bet.amount, 0);
    const payoutPool = totalPot * 0.95; // 5% house edge
    
    // Calculate each winner's share and profit
    const winners = winnerBets.map(bet => {
        const share = bet.amount / totalWinnerBets;
        const payout = share * payoutPool;
        const profit = payout - bet.amount;
        
        return {
            player: bet.player,
            bet: bet.amount,
            payout: payout,
            profit: profit
        };
    });
    
    // Sort by profit (highest first) and return top 3
    return winners
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 3);
}

// Download winner image function
function downloadWinnerImage() {
    const modal = document.getElementById('winnerModal');
    const winnerContent = document.querySelector('.winner-content');
    
    // Use html2canvas to capture the modal content
    if (typeof html2canvas !== 'undefined') {
        html2canvas(winnerContent, {
            backgroundColor: null,
            scale: 2,
            useCORS: true,
            allowTaint: true
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `winner-${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    } else {
        // Fallback: alert user to install html2canvas
        alert('Download feature requires html2canvas library. Please install it for full functionality.');
    }
}

// Share to Twitter function
function shareToTwitter() {
    const winner = gameState.lastWinner; // We'll need to store this
    const totalPot = gameState.totalPot;
    const usdValue = totalPot * 165.28;
    
    const text = `${winner.name} just won the race! 🏆 Total pot: ${totalPot.toFixed(2)} SOL ($${usdValue.toFixed(2)}) 🚀 #AnimeRacing #Solana`;
    const url = window.location.href;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
}

// Initialize the game
initializeGame(); 