const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pg } = require('./db');

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
    console.error('Error loading racer stats:', error);
    // Fallback racer data
    cachedRacerStats = [
      { id: 1, name: "Sakura", speed: 4.5, acceleration: 0.15 },
      { id: 2, name: "Yuki", speed: 4.2, acceleration: 0.18 },
      { id: 3, name: "Akane", speed: 4.8, acceleration: 0.12 },
      { id: 4, name: "Luna", speed: 4.3, acceleration: 0.16 },
      { id: 5, name: "Miku", speed: 4.6, acceleration: 0.14 },
      { id: 6, name: "Neko", speed: 4.7, acceleration: 0.13 },
      { id: 7, name: "Hana", speed: 4.1, acceleration: 0.17 },
      { id: 8, name: "Kira", speed: 4.4, acceleration: 0.15 }
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
  roundId: 0             // Incrementing race number
};

let raceInterval = null;
let countdownTimeout = null;
let io = null;

// Deterministic random function using HMAC
function deterministicRandom(seed, tick) {
  const hmac = crypto.createHmac('sha256', seed);
  hmac.update(tick.toString());
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
    speed: racer.speed,
    acceleration: racer.acceleration,
    x: 0,
    currentSpeed: 0,
    finished: false,
    finishTime: null
  }));
}

// Start a new race
function startRace(socketIo) {
  // Guard against double-starting
  if (raceState.status === 'countdown' || raceState.status === 'racing') {
    console.log('⚠️ Race already in progress, ignoring start request');
    return;
  }
  
  if (raceInterval) {
    clearInterval(raceInterval);
  }
  
  if (countdownTimeout) {
    clearTimeout(countdownTimeout);
  }
  
  io = socketIo;
  
  // Increment round ID for new race
  raceState.roundId++;
  
  // Generate deterministic seed
  raceState.seed = crypto.randomBytes(32).toString('hex');
  raceState.tick = 0;
  raceState.status = 'countdown';
  raceState.startTime = null; // Will be set when racing begins
  raceState.endTime = null;   // Will be set when racing begins
  raceState.racers = initializeRacers();
  raceState.winner = null;
  
  console.log(`🏁 Race countdown started with seed: ${raceState.seed}`);
  
  // Emit race start (countdown phase)
  if (io) {
    io.emit('race:start', {
      seed: raceState.seed,
      racers: raceState.racers,
      status: 'countdown',
      roundId: raceState.roundId
    });
  }
  
  // Start countdown with periodic updates
  let countdownSeconds = 10;
  
  // Emit initial countdown
  if (io) {
    io.emit('race:countdown', {
      countdown: countdownSeconds,
      status: 'countdown',
      roundId: raceState.roundId
    });
  }
  
  const countdownInterval = setInterval(() => {
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
      raceState.endTime = raceState.startTime + 12000; // 12 seconds from now
      raceState.status = 'racing';
      
      console.log(`🏁 Race started! Duration: 12 seconds`);
      
      // Emit race start with actual timing
      if (io) {
        io.emit('race:start', {
          seed: raceState.seed,
          racers: raceState.racers,
          startTime: raceState.startTime,
          endTime: raceState.endTime,
          status: 'racing',
          roundId: raceState.roundId
        });
      }
      
      startRaceLoop();
    }
  }, 1000); // 1 second intervals
  
  // Store interval ID for cleanup
  countdownTimeout = countdownInterval;
}

// Start the race loop at 60Hz
function startRaceLoop() {
  raceInterval = setInterval(() => {
    updateRace();
  }, 1000 / 60); // 60Hz
}

// Update race physics
function updateRace() {
  if (raceState.status !== 'racing') return;
  
  const now = Date.now();
  const timeElapsed = now - raceState.startTime;
  const timeRemaining = raceState.endTime - now;
  
  if (timeRemaining <= 0) {
    // Race finished
    stopRace().catch(console.error);
    return;
  }
  
  // Update racer positions with deterministic physics
  const trackLength = 1000;
  const progress = timeElapsed / 12000; // 12 second race
  
  raceState.racers.forEach((racer, index) => {
    if (!racer.finished) {
      // Use deterministic randomness based on seed and tick
      const randomValue = deterministicRandom(raceState.seed, raceState.tick + index);
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
  
  // Emit race update
  if (io) {
    io.emit('race:update', {
      racers: raceState.racers,
      timeElapsed,
      timeRemaining,
      tick: raceState.tick,
      roundId: raceState.roundId
    });
  }
}

// Stop the race
async function stopRace(winner, options = {}) {
  const { restart = true } = options;
  
  if (raceInterval) {
    clearInterval(raceInterval);
    raceInterval = null;
  }
  
  if (countdownTimeout) {
    clearTimeout(countdownTimeout);
    countdownTimeout = null;
  }
  
  raceState.status = 'finished';
  raceState.endTime = Date.now();
  
  // Determine winner if not provided
  if (!winner && raceState.racers.length > 0) {
    winner = raceState.racers[0]; // First racer (highest position)
  }
  
  raceState.winner = winner;
  
  console.log(`🏆 Race finished. Winner: ${winner ? winner.name : 'Unknown'}, Seed: ${raceState.seed}`);
  
  // Emit race end
  if (io) {
    io.emit('race:end', {
      winner: winner,
      seed: raceState.seed,
      results: raceState.racers,
      endTime: raceState.endTime,
      roundId: raceState.roundId
    });
  }
  
  // Log race results to Postgres
  try {
    const raceId = `race_${raceState.startTime}`;
    await pg.logRaceResult(raceId, raceState.seed, winner ? winner.id : 0, raceState.roundId);
    console.log(`Race Results - Round: ${raceState.roundId}, Seed: ${raceState.seed}, Winner: ${winner ? winner.name : 'Unknown'}`);
  } catch (error) {
    console.error('Error logging race results:', error);
  }
  
  // Start new race after 2 seconds only if restart is true
  if (restart) {
    setTimeout(() => {
      startRace(io);
    }, 2000);
  }
}

// Get current race state
function getState() {
  return raceState;
}

module.exports = {
  startRace,
  stopRace,
  getState,
  refreshRacerStatsCache
};
