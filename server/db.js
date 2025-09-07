const { Pool } = require('pg');
const { getRedis } = require('../services/redis');

// Postgres client
const pg = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/racers'
});

// Redis operations
const redisOps = {
  // Chat operations
  async getChatMessages(limit = 100) {
    try {
      const redis = getRedis();
      if (!redis) {
        throw new Error('Redis client not initialized');
      }
      const messages = await redis.lrange('chat', -limit, -1);
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error; // Rethrow to let callers handle the error
    }
  },

  async addChatMessage(message) {
    try {
      const redis = getRedis();
      if (!redis) {
        throw new Error('Redis client not initialized');
      }
      await redis.rpush('chat', JSON.stringify(message));
      // Keep only last 1000 messages
      await redis.ltrim('chat', -1000, -1);
    } catch (error) {
      console.error('Error adding chat message:', error);
      throw error; // Rethrow to let callers handle the error
    }
  },

  // Bet operations
  async getBets(limit = 100) {
    try {
      const redis = getRedis();
      if (!redis) {
        throw new Error('Redis client not initialized');
      }
      const bets = await redis.lrange('bets', -limit, -1);
      return bets.map(bet => JSON.parse(bet));
    } catch (error) {
      console.error('Error getting bets:', error);
      throw error; // Rethrow to let callers handle the error
    }
  },

  async addBet(bet) {
    try {
      const redis = getRedis();
      if (!redis) {
        throw new Error('Redis client not initialized');
      }
      await redis.rpush('bets', JSON.stringify(bet));
      // Keep only last 1000 bets
      await redis.ltrim('bets', -1000, -1);
    } catch (error) {
      console.error('Error adding bet:', error);
      throw error; // Rethrow to let callers handle the error
    }
  },

  // Race state operations
  async setRaceState(raceId, state) {
    try {
      const redis = getRedis();
      if (!redis) {
        throw new Error('Redis client not initialized');
      }
      await redis.setex(`race:${raceId}`, 3600, JSON.stringify(state)); // 1 hour TTL
    } catch (error) {
      console.error('Error setting race state:', error);
      throw error; // Rethrow to let callers handle the error
    }
  },

  async getRaceState(raceId) {
    try {
      const redis = getRedis();
      if (!redis) {
        throw new Error('Redis client not initialized');
      }
      const state = await redis.get(`race:${raceId}`);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      console.error('Error getting race state:', error);
      throw error; // Rethrow to let callers handle the error
    }
  },

  // Pub/Sub for real-time updates
  async publishRaceUpdate(raceId, update) {
    try {
      const redis = getRedis();
      if (!redis) {
        throw new Error('Redis client not initialized');
      }
      await redis.publish(`race:${raceId}`, JSON.stringify(update));
    } catch (error) {
      console.error('Error publishing race update:', error);
      throw error; // Rethrow to let callers handle the error
    }
  },

  async subscribeToRace(raceId, callback) {
    try {
      const redis = getRedis();
      if (!redis) {
        throw new Error('Redis client not initialized');
      }
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
  async logRaceResult(raceId, seed, winner, roundId) {
    try {
      const query = `
        INSERT INTO race_results (race_id, seed, winner, round_id, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (race_id) DO UPDATE SET
        seed = EXCLUDED.seed,
        winner = EXCLUDED.winner,
        round_id = EXCLUDED.round_id,
        created_at = EXCLUDED.created_at
      `;
      await pg.query(query, [raceId, seed, winner, roundId]);
    } catch (error) {
      console.error('Error logging race result:', error);
    }
  },

  // User balance operations
  async getUserBalance(userId) {
    try {
      const query = 'SELECT balance FROM user_balances WHERE user_id = $1';
      const result = await pg.query(query, [userId]);
      const balance = result.rows[0]?.balance;
      // Return balance as string to preserve precision, defaulting to '0' if not found
      return balance ? balance.toString() : '0';
    } catch (error) {
      console.error('Error getting user balance:', error);
      throw error; // Rethrow to let callers handle the error
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
      throw error; // Rethrow to let callers handle the error
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
      throw error; // Rethrow to let callers handle the error
    }
  },

  // Vault transaction history
  async logVaultTransaction(userId, transactionType, amount, transactionHash, status = 'completed') {
    try {
      const query = `
        INSERT INTO vault_transactions (user_id, transaction_type, amount, transaction_hash, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      await pg.query(query, [userId, transactionType, amount, transactionHash, status]);
    } catch (error) {
      console.error('Error logging vault transaction:', error);
      throw error; // Rethrow to let callers handle the error
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
        round_id INTEGER NOT NULL,
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

    // Create vault_transactions table
    await pg.query(`
      CREATE TABLE IF NOT EXISTS vault_transactions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw')),
        amount DECIMAL(20, 9) NOT NULL,
        transaction_hash VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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
