const { Pool } = require('pg');
const { getRedis } = require('../services/redis');
const logger = require('../services/logger');

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
      logger.error('Error getting chat messages:', error);
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
      logger.error('Error adding chat message:', error);
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
      logger.error('Error getting bets:', error);
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
      logger.error('Error adding bet:', error);
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
      logger.error('Error setting race state:', error);
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
      logger.error('Error getting race state:', error);
      throw error; // Rethrow to let callers handle the error
    }
  },

  // Get the highest round ID from Redis race keys
  async getHighestRaceRoundId() {
    try {
      const redis = getRedis();
      if (!redis) {
        throw new Error('Redis client not initialized');
      }
      
      // Scan for all race:* keys
      const keys = await redis.keys('race:*');
      if (keys.length === 0) {
        return null;
      }
      
      // Extract round IDs from keys and find the highest
      let highestRoundId = 0;
      for (const key of keys) {
        const raceId = key.replace('race:', '');
        const roundId = parseInt(raceId);
        if (!isNaN(roundId) && roundId > highestRoundId) {
          highestRoundId = roundId;
        }
      }
      
      return highestRoundId > 0 ? highestRoundId : null;
    } catch (error) {
      logger.error('Error getting highest race round ID:', error);
      throw error;
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
      logger.error('Error publishing race update:', error);
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
      
      // Support pattern subscriptions for 'race:*' or specific race IDs
      if (raceId === '*' || raceId.includes('*')) {
        await subscriber.psubscribe(`race:${raceId}`);
        subscriber.on('pmessage', (pattern, channel, message) => {
          callback(JSON.parse(message), channel);
        });
      } else {
        await subscriber.subscribe(`race:${raceId}`);
        subscriber.on('message', (channel, message) => {
          callback(JSON.parse(message), channel);
        });
      }
      return subscriber;
    } catch (error) {
      logger.error('Error subscribing to race:', error);
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
      logger.error('Error logging race result:', error);
    }
  },

  // Get latest round ID to ensure monotonic numbering
  async getLatestRoundId() {
    try {
      const query = 'SELECT MAX(round_id) as max_round_id FROM race_results';
      const result = await pg.query(query);
      return result.rows[0]?.max_round_id || 0;
    } catch (error) {
      logger.error('Error getting latest round ID:', error);
      return 0; // Fallback to 0 if query fails
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
      logger.error('Error getting user balance:', error);
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
      logger.error('Error updating user balance:', error);
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
      logger.error('Error logging bet:', error);
      throw error; // Rethrow to let callers handle the error
    }
  },

  // Get bets for a specific race
  async getRaceBets(raceId) {
    try {
      const query = `
        SELECT user_id, racer_id, amount, result
        FROM bet_history
        WHERE race_id = $1 AND result = 'pending'
        ORDER BY created_at ASC
      `;
      const result = await pg.query(query, [raceId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting race bets:', error);
      throw error;
    }
  },

  // Update bet result
  async updateBetResult(userId, raceId, racerId, result) {
    try {
      const query = `
        UPDATE bet_history
        SET result = $4
        WHERE user_id = $1 AND race_id = $2 AND racer_id = $3
      `;
      await pg.query(query, [userId, raceId, racerId, result]);
    } catch (error) {
      logger.error('Error updating bet result:', error);
      throw error;
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
      logger.error('Error logging vault transaction:', error);
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

    logger.info('✅ Database tables initialized');
  } catch (error) {
    logger.error('Error initializing database tables:', error);
  }
}

module.exports = {
  redis: redisOps,
  pg: pgOps,
  initializeTables
};
