const { db } = require('../services/supabase');
const { gameRedis } = require('../services/redis');
const { gameSolana } = require('../services/solana');
const logger = require('../services/logger');

// Game configuration
const GAME_CONFIG = {
  RACE_DURATION_MS: parseInt(process.env.RACE_DURATION_MS) || 12000,
  RACE_SETTLE_MS: parseInt(process.env.RACE_SETTLE_MS) || 2000,
  RACE_COUNTDOWN_MS: parseInt(process.env.RACE_COUNTDOWN_MS) || 10000,
  HOUSE_EDGE_PERCENT: parseFloat(process.env.HOUSE_EDGE_PERCENT) || 4,
  WINNER_PAYOUT_PERCENT: parseFloat(process.env.WINNER_PAYOUT_PERCENT) || 86,
  RAKEBACK_PERCENT: parseFloat(process.env.RAKEBACK_PERCENT) || 10,
  RACERS_COUNT: 8,
  TICK_RATE: 100 // Update every 100ms
};

// Anime racers data
const RACERS = [
  { id: 1, name: "Sakura", color: "#ff69b4", speed: 4.5, acceleration: 0.15, special: "Speed Burst", rarity: "legendary" },
  { id: 2, name: "Yuki", color: "#00bfff", speed: 4.2, acceleration: 0.18, special: "Freeze Time", rarity: "epic" },
  { id: 3, name: "Akane", color: "#ff4500", speed: 4.8, acceleration: 0.12, special: "Blazing Trail", rarity: "legendary" },
  { id: 4, name: "Luna", color: "#9370db", speed: 4.3, acceleration: 0.16, special: "Lunar Shield", rarity: "epic" },
  { id: 5, name: "Miku", color: "#00ced1", speed: 4.6, acceleration: 0.14, special: "Sonic Wave", rarity: "rare" },
  { id: 6, name: "Neko", color: "#ffd700", speed: 4.7, acceleration: 0.13, special: "Shadow Step", rarity: "epic" },
  { id: 7, name: "Hana", color: "#ff1493", speed: 4.1, acceleration: 0.17, special: "Nature's Blessing", rarity: "rare" },
  { id: 8, name: "Kira", color: "#ffa500", speed: 4.4, acceleration: 0.15, special: "Stellar Rush", rarity: "legendary" }
];

let gameEngine = null;
let currentRace = null;
let raceInterval = null;
let countdownInterval = null;

async function initializeGameEngine(io) {
  try {
    gameEngine = {
      io: io,
      isRunning: false,
      currentRace: null,
      raceInterval: null,
      countdownInterval: null
    };

    // Start the game loop
    await startGameLoop();
    
    logger.info('✅ Game engine initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize game engine:', error);
    throw error;
  }
}

async function startGameLoop() {
  try {
    // Check for existing active races
    let activeRaces = [];
    try {
      activeRaces = await db.getActiveRaces();
    } catch (error) {
      logger.warn('Could not fetch active races (tables may not exist yet):', error.message);
    }
    
    if (activeRaces.length > 0) {
      // Resume existing race
      currentRace = activeRaces[0];
      await resumeRace(currentRace);
    } else {
      // Start new race
      await createNewRace();
    }

    // Start the main game loop
    gameEngine.isRunning = true;
    logger.info('🎮 Game loop started');
  } catch (error) {
    logger.error('Error starting game loop:', error);
    throw error;
  }
}

async function createNewRace() {
  try {
    const now = Date.now();
    const raceId = `race_${now}`;
    const roundId = Math.floor(now / GAME_CONFIG.RACE_DURATION_MS);

    // Create race in database
    const raceData = {
      id: raceId,
      round_id: roundId,
      status: 'waiting',
      started_at: new Date(now).toISOString(),
      ends_at: new Date(now + GAME_CONFIG.RACE_DURATION_MS).toISOString(),
      total_pot: 0,
      total_bets: 0,
      winner: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      currentRace = await db.createRace(raceData);
    } catch (error) {
      logger.warn('Could not create race in database (tables may not exist yet):', error.message);
      // Create a mock race object for testing
      currentRace = raceData;
    }

    // Initialize race state in Redis
    const raceState = {
      raceId: raceId,
      roundId: roundId,
      status: 'waiting',
      phase: 'waiting',
      countdown: GAME_CONFIG.RACE_COUNTDOWN_MS / 1000,
      startTime: now,
      endTime: now + GAME_CONFIG.RACE_DURATION_MS,
      racers: initializeRacers(),
      participants: [],
      bets: {},
      totalPot: 0
    };

    await gameRedis.setRaceState(raceId, raceState);

    // Start countdown
    try {
      await startCountdown(raceId);
    } catch (error) {
      logger.warn('Could not start countdown (database may not be ready):', error.message);
      // Continue without database operations for now
    }

    logger.info(`🏁 New race created: ${raceId}`);
  } catch (error) {
    logger.error('Error creating new race:', error);
    throw error;
  }
}

async function resumeRace(race) {
  try {
    currentRace = race;
    
    // Get race state from Redis
    const raceState = await gameRedis.getRaceState(race.id);
    
    if (!raceState) {
      // Race state not found, create new one
      await createNewRace();
      return;
    }

    const now = Date.now();
    const timeElapsed = now - raceState.startTime;
    const timeRemaining = raceState.endTime - now;

    if (timeRemaining <= 0) {
      // Race should have ended, finish it
      await finishRace(race.id);
      await createNewRace();
      return;
    }

    // Resume race based on current phase
    switch (raceState.phase) {
      case 'waiting':
        await startCountdown(race.id);
        break;
      case 'countdown':
        await continueCountdown(race.id, raceState);
        break;
      case 'racing':
        await continueRace(race.id, raceState);
        break;
      case 'settling':
        await finishRace(race.id);
        break;
    }

    logger.info(`🏁 Resumed race: ${race.id} in phase: ${raceState.phase}`);
  } catch (error) {
    logger.error('Error resuming race:', error);
    throw error;
  }
}

async function startCountdown(raceId) {
  try {
    // Update race status
    try {
      await db.updateRace(raceId, { status: 'countdown' });
    } catch (error) {
      logger.warn('Could not update race status in database:', error.message);
    }

    // Get race state
    const raceState = await gameRedis.getRaceState(raceId);
    raceState.phase = 'countdown';
    raceState.countdown = GAME_CONFIG.RACE_COUNTDOWN_MS / 1000;
    await gameRedis.setRaceState(raceId, raceState);

    // Start countdown interval
    countdownInterval = setInterval(async () => {
      await updateCountdown(raceId);
    }, 1000);

    // Broadcast countdown start
    if (gameEngine.io) {
      gameEngine.io.emit('countdown_started', {
        raceId: raceId,
        countdown: raceState.countdown
      });
    }

    logger.info(`⏰ Countdown started for race: ${raceId}`);
  } catch (error) {
    logger.error('Error starting countdown:', error);
    throw error;
  }
}

async function updateCountdown(raceId) {
  try {
    const raceState = await gameRedis.getRaceState(raceId);
    
    if (!raceState || raceState.phase !== 'countdown') {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      return;
    }

    raceState.countdown--;
    await gameRedis.setRaceState(raceId, raceState);

    // Broadcast countdown update
    if (gameEngine.io) {
      gameEngine.io.emit('countdown_update', {
        raceId: raceId,
        countdown: raceState.countdown
      });
    }

    if (raceState.countdown <= 0) {
      // Countdown finished, start race
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      await startRace(raceId);
    }
  } catch (error) {
    logger.error('Error updating countdown:', error);
  }
}

async function startRace(raceId) {
  try {
    // Update race status
    await db.updateRace(raceId, { status: 'racing' });

    // Get race state
    const raceState = await gameRedis.getRaceState(raceId);
    raceState.phase = 'racing';
    raceState.startTime = Date.now();
    raceState.endTime = Date.now() + GAME_CONFIG.RACE_DURATION_MS;
    
    // Initialize racer positions
    raceState.racers.forEach(racer => {
      racer.x = 0;
      racer.currentSpeed = 0;
      racer.finished = false;
      racer.finishTime = null;
    });

    await gameRedis.setRaceState(raceId, raceState);

    // Start race interval
    raceInterval = setInterval(async () => {
      await updateRace(raceId);
    }, GAME_CONFIG.TICK_RATE);

    // Broadcast race start
    if (gameEngine.io) {
      gameEngine.io.emit('race_started', {
        raceId: raceId,
        racers: raceState.racers,
        duration: GAME_CONFIG.RACE_DURATION_MS
      });
    }

    logger.info(`🏁 Race started: ${raceId}`);
  } catch (error) {
    logger.error('Error starting race:', error);
    throw error;
  }
}

async function updateRace(raceId) {
  try {
    const raceState = await gameRedis.getRaceState(raceId);
    
    if (!raceState || raceState.phase !== 'racing') {
      if (raceInterval) {
        clearInterval(raceInterval);
        raceInterval = null;
      }
      return;
    }

    const now = Date.now();
    const timeElapsed = now - raceState.startTime;
    const timeRemaining = raceState.endTime - now;

    if (timeRemaining <= 0) {
      // Race finished
      if (raceInterval) {
        clearInterval(raceInterval);
        raceInterval = null;
      }
      await finishRace(raceId);
      return;
    }

    // Update racer positions
    const trackLength = 1000; // Virtual track length
    const progress = timeElapsed / GAME_CONFIG.RACE_DURATION_MS;

    raceState.racers.forEach(racer => {
      if (!racer.finished) {
        // Calculate speed with some randomness
        const baseSpeed = racer.speed;
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        const acceleration = racer.acceleration * progress;
        
        racer.currentSpeed = baseSpeed * randomFactor + acceleration;
        racer.x = Math.min(trackLength, racer.x + racer.currentSpeed);

        // Check if racer finished
        if (racer.x >= trackLength && !racer.finished) {
          racer.finished = true;
          racer.finishTime = now;
        }
      }
    });

    // Sort racers by position
    raceState.racers.sort((a, b) => {
      if (a.finished && b.finished) {
        return a.finishTime - b.finishTime;
      }
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      return b.x - a.x;
    });

    await gameRedis.setRaceState(raceId, raceState);

    // Broadcast race update
    if (gameEngine.io) {
      gameEngine.io.emit('race_update', {
        raceId: raceId,
        racers: raceState.racers,
        timeElapsed: timeElapsed,
        timeRemaining: timeRemaining
      });
    }
  } catch (error) {
    logger.error('Error updating race:', error);
  }
}

async function finishRace(raceId) {
  try {
    // Update race status
    await db.updateRace(raceId, { status: 'settling' });

    // Get race state
    const raceState = await gameRedis.getRaceState(raceId);
    raceState.phase = 'settling';
    
    // Determine winner
    const winner = raceState.racers[0]; // First racer (highest position)
    raceState.winner = winner.id;
    
    await gameRedis.setRaceState(raceId, raceState);
    await db.updateRace(raceId, { winner: winner.id });

    // Get all bets for this race
    const bets = await gameRedis.getBets(raceId);
    
    // Calculate payouts
    const totalPot = raceState.totalPot;
    const houseEdge = totalPot * (GAME_CONFIG.HOUSE_EDGE_PERCENT / 100);
    const winnerPool = totalPot * (GAME_CONFIG.WINNER_PAYOUT_PERCENT / 100);
    const rakebackPool = totalPot * (GAME_CONFIG.RAKEBACK_PERCENT / 100);

    // Get winner bets
    const winnerBets = Object.values(bets).filter(bet => bet.racerId === winner.id);
    const losingBets = Object.values(bets).filter(bet => bet.racerId !== winner.id);

    // Execute payouts
    const payouts = await gameSolana.executePayouts(raceId, winnerBets, totalPot);
    const rakebacks = await gameSolana.executeRakeback(raceId, losingBets, rakebackPool);

    // Store race result
    const raceResult = {
      race_id: raceId,
      winner: winner.id,
      total_pot: totalPot,
      house_edge: houseEdge,
      winner_pool: winnerPool,
      rakeback_pool: rakebackPool,
      payouts: payouts,
      rakebacks: rakebacks,
      created_at: new Date().toISOString()
    };

    try {
      await db.createRaceResult(raceResult);
    } catch (error) {
      logger.warn('Error creating race result (missing house_edge column?):', error.message);
      // Continue without storing race result for now
    }

    // Broadcast race end
    if (gameEngine.io) {
      gameEngine.io.emit('race_ended', {
        raceId: raceId,
        winner: winner,
        results: raceState.racers,
        payouts: payouts,
        rakebacks: rakebacks,
        totalPot: totalPot
      });
    }

    // Update race status to completed
    await db.updateRace(raceId, { status: 'completed' });

    logger.info(`🏆 Race finished: ${raceId}, Winner: ${winner.name}`);

    // Start new race after settlement period
    setTimeout(async () => {
      await createNewRace();
    }, GAME_CONFIG.RACE_SETTLE_MS);

  } catch (error) {
    logger.error('Error finishing race:', error);
    throw error;
  }
}

function initializeRacers() {
  return RACERS.map(racer => ({
    ...racer,
    x: 0,
    currentSpeed: 0,
    finished: false,
    finishTime: null
  }));
}

// Utility functions
function getCurrentRace() {
  return currentRace;
}

function isGameRunning() {
  return gameEngine && gameEngine.isRunning;
}

function stopGameEngine() {
  if (raceInterval) {
    clearInterval(raceInterval);
    raceInterval = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (gameEngine) {
    gameEngine.isRunning = false;
  }
  logger.info('🛑 Game engine stopped');
}

module.exports = {
  initializeGameEngine,
  getCurrentRace,
  isGameRunning,
  stopGameEngine,
  GAME_CONFIG,
  RACERS
};
