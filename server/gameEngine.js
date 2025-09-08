const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pg, redis } = require('./db');
const logger = require('../services/logger');
const { stringToLamports, solToLamports, lamportsToString } = require('../utils/lamports');

// Race timing configuration from environment variables
const RACE_COUNTDOWN_MS = parseInt(process.env.RACE_COUNTDOWN_MS) || 10000; // 10 seconds default
const RACE_DURATION_MS = parseInt(process.env.RACE_DURATION_MS) || 12000; // 12 seconds default
const RACE_SETTLE_MS = parseInt(process.env.RACE_SETTLE_MS) || 2000; // 2 seconds default

// Cache racer stats at module level
let cachedRacerStats = null;

// Load racer stats from JSON file (cached)
function loadRacerStats() {
  if (cachedRacerStats) {
    return cachedRacerStats;
  }
  
  try {
    const racersPath = path.join(__dirname, '../public/js/animeRacers.json');
    const racersData = fs.readFileSync(racersPath, 'utf8');
    cachedRacerStats = JSON.parse(racersData);
    return cachedRacerStats;
  } catch (error) {
    logger.error('Error loading racer stats:', error);
    // Fallback racer data
    cachedRacerStats = [
      { id: 1, name: "Sakura", color: "#ff69b4", avatar: "images/characters/sakura-face.png", speed: 4.5, acceleration: 0.15 },
      { id: 2, name: "Yuki", color: "#00bfff", avatar: "images/characters/yuki-face.png", speed: 4.2, acceleration: 0.18 },
      { id: 3, name: "Akane", color: "#ff4500", avatar: "images/characters/akane-face.png", speed: 4.8, acceleration: 0.12 },
      { id: 4, name: "Luna", color: "#9370db", avatar: "images/characters/luna-face.png", speed: 4.3, acceleration: 0.16 },
      { id: 5, name: "Miku", color: "#00ced1", avatar: "images/characters/miku-face.png", speed: 4.6, acceleration: 0.14 },
      { id: 6, name: "Neko", color: "#ffd700", avatar: "images/characters/neko-face.png", speed: 4.7, acceleration: 0.13 },
      { id: 7, name: "Hana", color: "#ff1493", avatar: "images/characters/hana-face.png", speed: 4.1, acceleration: 0.17 },
      { id: 8, name: "Kira", color: "#ffa500", avatar: "images/characters/kira-face.png", speed: 4.4, acceleration: 0.15 }
    ];
    return cachedRacerStats;
  }
}

// Helper to refresh the cache (for development)
function refreshRacerStatsCache() {
  cachedRacerStats = null;
  return loadRacerStats();
}

// Race state structure
const raceState = {
  racers: [],            // [{id, x, v, finished}]
  status: 'idle',        // 'idle'|'countdown'|'racing'|'finished'
  seed: null,
  tick: 0,
  startTime: null,
  endTime: null,
  winner: null,
  roundId: 0,            // Incrementing race number
  raceId: null,          // Consistent race ID for bets and results
  countdownStartTime: null, // When countdown began (for crash recovery)
  settled: false,        // Whether settlement has been completed
  totalPotLamports: BigInt(0),  // Total lamports in the pot (BigInt for precision)
  totalBets: 0           // Total number of bets placed
};

let raceInterval = null;
let countdownInterval = null;
let io = null;

// Deterministic random function using HMAC with composite input
function deterministicRandom(seed, tick, racerId) {
  const hmac = crypto.createHmac('sha256', seed);
  hmac.update(`${tick}:${racerId}`); // Composite string to prevent collisions
  const hash = hmac.digest('hex');
  // Convert first 8 characters to a number between 0 and 1
  return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
}

// Initialize racers with stats from JSON
function initializeRacers() {
  const racerStats = loadRacerStats();
  return racerStats.map(racer => ({
    id: racer.id,
    name: racer.name,
    color: racer.color,
    avatar: racer.avatar,
    speed: racer.speed,
    acceleration: racer.acceleration,
    x: 0,
    currentSpeed: 0,
    finished: false,
    finishTime: null
  }));
}

// Restore race state from Redis on startup
async function restoreRaceState() {
  try {
    // Get the highest round ID from Redis to check for in-progress races
    const highestRoundId = await redis.getHighestRaceRoundId();
    if (!highestRoundId) {
      logger.info('No race state found in Redis');
      return false;
    }
    
    const storedState = await redis.getRaceState(highestRoundId);
    
    if (storedState && (storedState.status === 'racing' || storedState.status === 'countdown')) {
      logger.info(`Restoring race state for round ${storedState.roundId} with status: ${storedState.status}`);
      
      // Restore the race state, converting string back to BigInt
      Object.assign(raceState, storedState);
      if (storedState.totalPotLamports) {
        raceState.totalPotLamports = BigInt(storedState.totalPotLamports);
      }
      
      // Ensure settled flag is properly set
      raceState.settled = storedState.settled || false;
      
      // If race was in progress, restart the appropriate intervals
      if (storedState.status === 'racing') {
        startRaceLoop();
      } else if (storedState.status === 'countdown') {
        // Restart countdown from where it left off
        const timeElapsed = Date.now() - (storedState.countdownStartTime || Date.now());
        const remainingCountdown = Math.max(0, RACE_COUNTDOWN_MS - timeElapsed);
        
        if (remainingCountdown > 0) {
          setTimeout(() => {
            // Start racing after remaining countdown
            raceState.startTime = Date.now();
            raceState.endTime = raceState.startTime + RACE_DURATION_MS;
            raceState.status = 'racing';
            startRaceLoop();
          }, remainingCountdown);
        } else {
          // Countdown already finished, start racing immediately
          raceState.startTime = Date.now();
          raceState.endTime = raceState.startTime + RACE_DURATION_MS;
          raceState.status = 'racing';
          startRaceLoop();
        }
      } else if (storedState.status === 'finished' && !storedState.settled) {
        // Race finished but not settled - complete settlement before starting new race
        logger.info(`Found unfinished race ${storedState.raceId}, completing settlement...`);
        try {
          await settleRace(storedState.raceId, storedState.winner);
          logger.info(`Settlement completed for race ${storedState.raceId}`);
        } catch (error) {
          logger.error(`Error settling race ${storedState.raceId}:`, error);
        }
        // After settlement, start a new race
        setTimeout(() => startRace(io), 1000);
      }
      
      return true; // State was restored
    }
  } catch (error) {
    logger.error('Error restoring race state:', error);
  }
  
  return false; // No state to restore
}

// Initialize race engine - called once at startup
async function initRaceEngine(socketIo) {
  io = socketIo;
  
  // Try to restore state from previous session
  const stateRestored = await restoreRaceState();
  if (stateRestored) {
    logger.info('Race state restored from previous session');
    return; // Race state was restored, don't start a new one
  }
  
  // No previous state found, start a fresh race
  await startRace(socketIo);
}

// Start a new race
async function startRace(socketIo) {
  // Guard against double-starting
  if (raceState.status === 'countdown' || raceState.status === 'racing') {
    logger.warn('Race already in progress, ignoring start request');
    return;
  }
  
  if (raceInterval) {
    clearInterval(raceInterval);
  }
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  io = socketIo;
  
  // Get latest round ID from database and increment it
  const latestRoundId = await pg.getLatestRoundId();
  raceState.roundId = latestRoundId + 1;
  
  // Generate consistent race ID for bets and results
  raceState.raceId = `race_${raceState.roundId}`;
  
  // Generate deterministic seed
  raceState.seed = crypto.randomBytes(32).toString('hex');
  raceState.tick = 0;
  raceState.status = 'countdown';
  raceState.startTime = null; // Will be set when racing begins
  raceState.endTime = null;   // Will be set when racing begins
  raceState.countdownStartTime = Date.now(); // Track when countdown began
  raceState.racers = initializeRacers();
  raceState.winner = null;
  raceState.settled = false;  // Reset settlement flag for new race
  raceState.totalPotLamports = BigInt(0);  // Reset pot for new race
  raceState.totalBets = 0;    // Reset bet count for new race
  
  logger.info(`Race countdown started with seed: ${raceState.seed}`);
  
  // Emit race start (countdown phase)
  if (io) {
    const countdownSeconds = Math.floor(RACE_COUNTDOWN_MS / 1000);
    io.emit('race:start', {
      seed: raceState.seed,
      racers: raceState.racers,
      status: 'countdown',
      countdown: countdownSeconds,
      roundId: raceState.roundId,
      raceId: raceState.raceId,
      totalPot: parseFloat(lamportsToString(raceState.totalPotLamports)),
      totalBets: raceState.totalBets
    });
  }
  
  // Start countdown with periodic updates
  let countdownSeconds = Math.floor(RACE_COUNTDOWN_MS / 1000);
  
  // Emit initial countdown
  if (io) {
    io.emit('race:countdown', {
      countdown: countdownSeconds,
      status: 'countdown',
      roundId: raceState.roundId
    });
  }
  
  countdownInterval = setInterval(() => {
    countdownSeconds--;
    
    if (countdownSeconds > 0) {
      // Emit countdown update
      if (io) {
        io.emit('race:countdown', {
          countdown: countdownSeconds,
          status: 'countdown',
          roundId: raceState.roundId
        });
      }
    } else {
      // Countdown finished, start race
      clearInterval(countdownInterval);
      
      // Set timing when racing actually begins
      raceState.startTime = Date.now();
      raceState.endTime = raceState.startTime + RACE_DURATION_MS;
      raceState.status = 'racing';
      raceState.countdownStartTime = null; // Clear countdown start time
      
      logger.info(`Race started! Duration: ${RACE_DURATION_MS}ms`);
      
      // Emit race start with actual timing
      if (io) {
        io.emit('race:start', {
          seed: raceState.seed,
          racers: raceState.racers,
          startTime: raceState.startTime,
          endTime: raceState.endTime,
          status: 'racing',
          roundId: raceState.roundId,
          raceId: raceState.raceId,
          totalPot: parseFloat(lamportsToString(raceState.totalPotLamports)),
          totalBets: raceState.totalBets
        });
      }
      
      startRaceLoop();
    }
  }, 1000); // 1 second intervals
}

// Start the race loop at 60Hz
function startRaceLoop() {
  const tickInterval = 1000 / 60; // 60Hz
  
  async function raceTick() {
    try {
      await updateRace();
    } catch (error) {
      logger.error('Error in race tick:', error);
      // Continue the loop even if there's an error
    }
    
    // Schedule next tick only if race is still running
    if (raceState.status === 'racing') {
      raceInterval = setTimeout(raceTick, tickInterval);
    }
  }
  
  // Start the first tick
  raceTick();
}

// Update race physics
async function updateRace() {
  if (raceState.status !== 'racing') return;
  
  const now = Date.now();
  const timeElapsed = now - raceState.startTime;
  const timeRemaining = raceState.endTime - now;
  
  if (timeRemaining <= 0) {
    // Race finished
    stopRace().catch(error => logger.error('Error stopping race:', error));
    return;
  }
  
  // Update racer positions with deterministic physics
  const trackLength = 1000;
  const progress = timeElapsed / RACE_DURATION_MS;
  
  raceState.racers.forEach((racer) => {
    if (!racer.finished) {
      // Use deterministic randomness based on seed, tick, and stable racer ID
      const randomValue = deterministicRandom(raceState.seed, raceState.tick, racer.id);
      const randomFactor = 0.8 + randomValue * 0.4; // 0.8 to 1.2
      const acceleration = racer.acceleration * progress;
      
      racer.currentSpeed = racer.speed * randomFactor + acceleration;
      racer.x = Math.min(trackLength, racer.x + racer.currentSpeed);
      
      // Check if racer finished
      if (racer.x >= trackLength && !racer.finished) {
        racer.finished = true;
        racer.finishTime = now;
      }
    }
  });
  
  // Increment tick for next update
  raceState.tick++;
  
  // Sort racers by position
  raceState.racers.sort((a, b) => {
    if (a.finished && b.finished) {
      return a.finishTime - b.finishTime;
    }
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    return b.x - a.x;
  });
  
  // Check if all racers have finished (early completion)
  if (raceState.racers.every(r => r.finished)) {
    stopRace(raceState.racers[0]).catch(error => logger.error('Error stopping race early:', error));
    return;
  }
  
  // Store race state in Redis for horizontal scaling and crash recovery
  try {
    // Convert BigInt to string for JSON serialization
    const stateForRedis = {
      ...raceState,
      totalPotLamports: raceState.totalPotLamports.toString()
    };
    await redis.setRaceState(raceState.roundId, stateForRedis);
    
    // Publish race update for other instances
    await redis.publishRaceUpdate(raceState.roundId, {
      racers: raceState.racers,
      timeElapsed,
      timeRemaining,
      tick: raceState.tick,
      roundId: raceState.roundId,
      status: raceState.status
    });
  } catch (error) {
    logger.error('Error storing/publishing race state:', error);
  }
}

// Stop the race
async function stopRace(winner, options = {}) {
  const { restart = true } = options;
  
  if (raceInterval) {
    clearInterval(raceInterval);
    raceInterval = null;
  }
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  raceState.status = 'finished';
  raceState.endTime = Date.now();
  
  // Determine winner if not provided
  if (!winner && raceState.racers.length > 0) {
    winner = raceState.racers[0]; // First racer (highest position)
  }
  
  raceState.winner = winner;
  
  logger.info(`Race finished. Winner: ${winner ? winner.name : 'Unknown'}, Seed: ${raceState.seed}`);
  
  // Emit race end
  if (io) {
    io.emit('race:end', {
      winner: winner,
      seed: raceState.seed,
      results: raceState.racers,
      startTime: raceState.startTime,
      endTime: raceState.endTime,
      roundId: raceState.roundId,
      totalPot: parseFloat(lamportsToString(raceState.totalPotLamports)),
      totalBets: raceState.totalBets
    });
  }
  
  // Log race results to Postgres
  try {
    // Use consistent race ID for results
    const raceId = raceState.raceId;
    await pg.logRaceResult(raceId, raceState.seed, winner ? winner.id : 0, raceState.roundId);
    logger.info(`Race Results - Round: ${raceState.roundId}, Seed: ${raceState.seed}, Winner: ${winner ? winner.name : 'Unknown'}`);
    
    // Settle race bets and distribute winnings
    const settlementResult = await settleRace(raceId, winner ? winner.id : 0);
    
    // Emit settlement event
    if (io) {
      io.emit('race:settled', {
        raceId: raceId,
        roundId: raceState.roundId,
        winner: winner,
        settlement: settlementResult
      });
    }
    
    // Persist finished race state to Redis for crash recovery
    try {
      await redis.setRaceState(raceState.roundId, {
        ...raceState,
        totalPotLamports: raceState.totalPotLamports.toString()
      });
      logger.info(`Finished race state persisted to Redis for round ${raceState.roundId}`);
    } catch (redisError) {
      logger.error('Error persisting finished race state to Redis:', redisError);
    }
    
  } catch (error) {
    logger.error('Error logging race results or settling race:', error);
  }
  
  // Start new race after settle delay only if restart is true
  if (restart) {
    setTimeout(() => {
      startRace(io);
    }, RACE_SETTLE_MS);
  }
}

// Get current race state
function getState() {
  // Clone race state and convert BigInt values to strings for JSON serialization
  const sanitizedState = {
    ...raceState,
    totalPotLamports: raceState.totalPotLamports.toString(),
    totalPot: lamportsToString(raceState.totalPotLamports), // Return as string to preserve precision
    totalBets: raceState.totalBets
  };
  return sanitizedState;
}

// Add bet to race totals
function addBetToRace(amount) {
  const betLamports = solToLamports(amount);
  raceState.totalPotLamports += betLamports;
  raceState.totalBets += 1;
  
  const totalPotSol = lamportsToString(raceState.totalPotLamports);
  logger.info(`Bet added: ${amount} SOL. Total pot: ${totalPotSol} SOL, Total bets: ${raceState.totalBets}`);
}

// Get race totals
function getRaceTotals() {
  return {
    totalPot: parseFloat(lamportsToString(raceState.totalPotLamports)),
    totalBets: raceState.totalBets
  };
}

// Settle race bets and distribute winnings
async function settleRace(raceId, winnerId) {
  try {
    logger.info(`Starting race settlement for race ${raceId}, winner: ${winnerId}`);
    
    // Get all pending bets for this race
    const bets = await pg.getRaceBets(raceId);
    if (bets.length === 0) {
      logger.info('No bets to settle for this race');
      return { winners: [], losers: [], totalPayout: 0 };
    }
    
    // Separate winning and losing bets
    const winningBets = bets.filter(bet => bet.racer_id === winnerId);
    const losingBets = bets.filter(bet => bet.racer_id !== winnerId);
    
    logger.info(`Settling ${winningBets.length} winning bets and ${losingBets.length} losing bets`);
    
    // Calculate total pot from database bets (recalculate for accuracy after restarts)
    const totalPotLamports = bets.reduce((sum, bet) => {
      const betLamports = stringToLamports(bet.amount);
      return sum + betLamports;
    }, BigInt(0));
    const totalPot = parseFloat(lamportsToString(totalPotLamports));
    const treasuryFeeLamports = totalPotLamports * BigInt(4) / BigInt(100); // 4% treasury fee
    const rakebackPoolLamports = totalPotLamports * BigInt(10) / BigInt(100); // 10% rakeback to losers
    const winnerPoolLamports = totalPotLamports * BigInt(86) / BigInt(100); // 86% to winners
    
    const treasuryFee = parseFloat(lamportsToString(treasuryFeeLamports));
    const rakebackPool = parseFloat(lamportsToString(rakebackPoolLamports));
    const winnerPool = parseFloat(lamportsToString(winnerPoolLamports));
    
    // Calculate winnings for each winner (pro-rata) using BigInt
    const totalWinningAmountLamports = winningBets.reduce((sum, bet) => {
      return sum + stringToLamports(bet.amount);
    }, BigInt(0));
    const winnerPayouts = [];
    
    for (const bet of winningBets) {
      const betAmountLamports = stringToLamports(bet.amount);
      const payoutLamports = totalWinningAmountLamports > 0 
        ? (winnerPoolLamports * betAmountLamports) / totalWinningAmountLamports
        : BigInt(0);
      
      // Get current balance and add winnings
      const currentBalanceStr = await pg.getUserBalance(bet.user_id);
      const currentBalanceLamports = stringToLamports(currentBalanceStr);
      const newBalanceLamports = currentBalanceLamports + payoutLamports;
      const newBalanceStr = lamportsToString(newBalanceLamports);
      
      // Update user balance
      await pg.updateUserBalance(bet.user_id, newBalanceStr);
      
      // Update bet result
      await pg.updateBetResult(bet.user_id, raceId, bet.racer_id, 'won');
      
      winnerPayouts.push({
        userId: bet.user_id,
        betAmount: lamportsToString(betAmountLamports),
        payout: lamportsToString(payoutLamports),
        newBalance: newBalanceStr
      });
      
      logger.info(`Winner payout: ${bet.user_id} bet ${lamportsToString(betAmountLamports)} SOL, won ${lamportsToString(payoutLamports)} SOL`);
    }
    
    // Calculate rakeback for each loser (equal distribution) using BigInt
    const rakebackPerLoserLamports = losingBets.length > 0 
      ? rakebackPoolLamports / BigInt(losingBets.length)
      : BigInt(0);
    const loserPayouts = [];
    
    for (const bet of losingBets) {
      const betAmountLamports = stringToLamports(bet.amount);
      
      // Get current balance and add rakeback
      const currentBalanceStr = await pg.getUserBalance(bet.user_id);
      const currentBalanceLamports = stringToLamports(currentBalanceStr);
      const newBalanceLamports = currentBalanceLamports + rakebackPerLoserLamports;
      const newBalanceStr = lamportsToString(newBalanceLamports);
      
      // Update user balance
      await pg.updateUserBalance(bet.user_id, newBalanceStr);
      
      // Update bet result
      await pg.updateBetResult(bet.user_id, raceId, bet.racer_id, 'lost');
      
      loserPayouts.push({
        userId: bet.user_id,
        betAmount: lamportsToString(betAmountLamports),
        rakeback: lamportsToString(rakebackPerLoserLamports),
        newBalance: newBalanceStr
      });
      
      logger.info(`Loser rakeback: ${bet.user_id} bet ${lamportsToString(betAmountLamports)} SOL, received ${lamportsToString(rakebackPerLoserLamports)} SOL rakeback`);
    }
    
    const settlementResult = {
      winners: winnerPayouts,
      losers: loserPayouts,
      totalPayout: lamportsToString(winnerPoolLamports),
      totalRakeback: lamportsToString(rakebackPoolLamports),
      treasuryFee: lamportsToString(treasuryFeeLamports),
      totalPot: lamportsToString(totalPotLamports)
    };
    
    logger.info(`Race settlement completed: ${winnerPayouts.length} winners, ${loserPayouts.length} losers, total payout: ${lamportsToString(winnerPoolLamports)} SOL`);
    
    // Mark race as settled
    raceState.settled = true;
    
    return settlementResult;
    
  } catch (error) {
    logger.error('Error settling race:', error);
    throw error;
  }
}

module.exports = {
  initRaceEngine,
  startRace,
  stopRace,
  getState,
  addBetToRace,
  getRaceTotals,
  settleRace,
  refreshRacerStatsCache,
  deterministicRandom
};
