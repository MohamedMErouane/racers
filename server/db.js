const Redis = require('ioredis');
const { Pool } = require('pg');

// Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Postgres client
const pg = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/racers'
});

// Redis operations
const redisOps = {
  // Chat operations
  async getChatMessages(limit = 100) {
    try {
      const messages = await redis.lrange('chat', -limit, -1);
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      console.error('Error getting chat messages:', error);
      return [];
    }
  },

  async addChatMessage(message) {
    try {
      await redis.rpush('chat', JSON.stringify(message));
      // Keep only last 1000 messages
      await redis.ltrim('chat', -1000, -1);
    } catch (error) {
      console.error('Error adding chat message:', error);
    }
  },

  // Bet operations
  async getBets(limit = 100) {
    try {
      const bets = await redis.lrange('bets', -limit, -1);
      return bets.map(bet => JSON.parse(bet));
    } catch (error) {
      console.error('Error getting bets:', error);
      return [];
    }
  },

  async addBet(bet) {
    try {
      await redis.rpush('bets', JSON.stringify(bet));
      // Keep only last 1000 bets
      await redis.ltrim('bets', -1000, -1);
    } catch (error) {
      console.error('Error adding bet:', error);
    }
  },

  // Race state operations
  async setRaceState(raceId, state) {
    try {
      await redis.setex(`race:${raceId}`, 3600, JSON.stringify(state)); // 1 hour TTL
    } catch (error) {
      console.error('Error setting race state:', error);
    }
  },

  async getRaceState(raceId) {
    try {
      const state = await redis.get(`race:${raceId}`);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      console.error('Error getting race state:', error);
      return null;
    }
  },

  // Pub/Sub for real-time updates
  async publishRaceUpdate(raceId, update) {
    try {
      await redis.publish(`race:${raceId}`, JSON.stringify(update));
    } catch (error) {
      console.error('Error publishing race update:', error);
    }
  },

  async subscribeToRace(raceId, callback) {
    try {
      const subscriber = redis.duplicate();
      await subscriber.subscribe(`race:${raceId}`);
      subscriber.on('message', (channel, message) => {
        callback(JSON.parse(message));
      });
      return subscriber;
    } catch (error) {
      console.error('Error subscribing to race:', error);
      return null;
    }
  }
};

// Postgres operations
const pgOps = {
  // Race results
  async logRaceResult(raceId, seed, winner) {
    try {
      const query = `
        INSERT INTO race_results (race_id, seed, winner, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (race_id) DO UPDATE SET
        seed = EXCLUDED.seed,
        winner = EXCLUDED.winner,
        created_at = EXCLUDED.created_at
      `;
      await pg.query(query, [raceId, seed, winner]);
    } catch (error) {
      console.error('Error logging race result:', error);
    }
  },

  // User balance operations
  async getUserBalance(userId) {
    try {
      const query = 'SELECT balance FROM user_balances WHERE user_id = $1';
      const result = await pg.query(query, [userId]);
      return result.rows[0]?.balance || 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  },

  async updateUserBalance(userId, newBalance) {
    try {
      const query = `
        INSERT INTO user_balances (user_id, balance, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
        balance = EXCLUDED.balance,
        updated_at = EXCLUDED.updated_at
      `;
      await pg.query(query, [userId, newBalance]);
    } catch (error) {
      console.error('Error updating user balance:', error);
    }
  },

  // Bet history
  async logBet(userId, raceId, racerId, amount, result) {
    try {
      const query = `
        INSERT INTO bet_history (user_id, race_id, racer_id, amount, result, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      await pg.query(query, [userId, raceId, racerId, amount, result]);
    } catch (error) {
      console.error('Error logging bet:', error);
    }
  }
};

// Initialize database tables if they don't exist
async function initializeTables() {
  try {
    // Create race_results table
    await pg.query(`
      CREATE TABLE IF NOT EXISTS race_results (
        id SERIAL PRIMARY KEY,
        race_id VARCHAR(255) UNIQUE NOT NULL,
        seed VARCHAR(255) NOT NULL,
        winner INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create user_balances table
    await pg.query(`
      CREATE TABLE IF NOT EXISTS user_balances (
        user_id VARCHAR(255) PRIMARY KEY,
        balance DECIMAL(20, 9) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create bet_history table
    await pg.query(`
      CREATE TABLE IF NOT EXISTS bet_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        race_id VARCHAR(255) NOT NULL,
        racer_id INTEGER NOT NULL,
        amount DECIMAL(20, 9) NOT NULL,
        result VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
}

module.exports = {
  redis: redisOps,
  pg: pgOps,
  initializeTables
};
