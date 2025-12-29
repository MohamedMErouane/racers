const { Pool } = require('pg');
const { getRedis, isRedisAvailable } = require('../services/redis');
const logger = require('../services/logger');

// Postgres client
const pg = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/racers'
});

// In-memory fallback for when Redis is not available
const memoryStore = {
  chat: [],
  bets: [],
  races: new Map()
};

// Redis operations with fallback
const redisOps = {
  // Chat operations
  async getChatMessages(limit = 100) {
    try {
      const redis = getRedis();
      if (!redis) {
        return memoryStore.chat.slice(-limit);
      }
      const messages = await redis.lrange('chat', -limit, -1);
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      logger.error('Error getting chat messages:', error);
      return memoryStore.chat.slice(-limit);
    }
  },

  async addChatMessage(message) {
    try {
      const redis = getRedis();
      if (!redis) {
        memoryStore.chat.push(message);
        if (memoryStore.chat.length > 1000) {
          memoryStore.chat = memoryStore.chat.slice(-1000);
        }
        return;
      }
      await redis.rpush('chat', JSON.stringify(message));
      await redis.ltrim('chat', -1000, -1);
    } catch (error) {
      logger.error('Error adding chat message:', error);
      memoryStore.chat.push(message);
    }
  },

  // Bet operations
  async getBets(limit = 100) {
    try {
      const redis = getRedis();
      if (!redis) {
        return memoryStore.bets.slice(-limit);
      }
      const bets = await redis.lrange('bets', -limit, -1);
      return bets.map(bet => JSON.parse(bet));
    } catch (error) {
      logger.error('Error getting bets:', error);
      return memoryStore.bets.slice(-limit);
    }
  },

  async addBet(bet) {
    try {
      const redis = getRedis();
      if (!redis) {
        memoryStore.bets.push(bet);
        if (memoryStore.bets.length > 1000) {
          memoryStore.bets = memoryStore.bets.slice(-1000);
        }
        return;
      }
      await redis.rpush('bets', JSON.stringify(bet));
      await redis.ltrim('bets', -1000, -1);
    } catch (error) {
      logger.error('Error adding bet:', error);
      memoryStore.bets.push(bet);
    }
  },

  // Race state operations
  async setRaceState(raceId, state) {
    try {
      const redis = getRedis();
      if (!redis) {
        memoryStore.races.set(`race:${raceId}`, state);
        return;
      }
      await redis.setex(`race:${raceId}`, 3600, JSON.stringify(state));
    } catch (error) {
      logger.error('Error setting race state:', error);
      memoryStore.races.set(`race:${raceId}`, state);
    }
  },

  async getRaceState(raceId) {
    try {
      const redis = getRedis();
      if (!redis) {
        return memoryStore.races.get(`race:${raceId}`) || null;
      }
      const state = await redis.get(`race:${raceId}`);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      logger.error('Error getting race state:', error);
      return memoryStore.races.get(`race:${raceId}`) || null;
    }
  },

  // Get the highest round ID from Redis race keys using SCAN (non-blocking)
  // Note: This function should only be called at startup to limit scans
  async getHighestRaceRoundId() {
    try {
      const redis = getRedis();
      if (!redis) {
        // Fallback: get from memory store
        let highestRoundId = 0;
        for (const key of memoryStore.races.keys()) {
          const raceId = key.replace('race:', '');
          const roundId = parseInt(raceId);
          if (!isNaN(roundId) && roundId > highestRoundId) {
            highestRoundId = roundId;
          }
        }
        return highestRoundId > 0 ? highestRoundId : null;
      }
      
      let cursor = '0';
      let highestRoundId = 0;
      
      // Use SCAN to iterate through race:* keys without blocking
      do {
        const result = await redis.scan(cursor, 'MATCH', 'race:*', 'COUNT', 100);
        
        cursor = result[0];
        const keys = result[1];
        
        // Extract round IDs from keys and find the highest
        for (const key of keys) {
          const raceId = key.replace('race:', '');
          const roundId = parseInt(raceId);
          if (!isNaN(roundId) && roundId > highestRoundId) {
            highestRoundId = roundId;
          }
        }
      } while (cursor !== '0');
      
      return highestRoundId > 0 ? highestRoundId : null;
    } catch (error) {
      logger.error('Error getting highest race round ID:', error);
      return null;
    }
  },

  // Pub/Sub for real-time updates
  async publishRaceUpdate(raceId, update) {
    try {
      const redis = getRedis();
      if (!redis) {
        // No-op when Redis is not available
        return;
      }
      await redis.publish(`race:${raceId}`, JSON.stringify(update));
    } catch (error) {
      logger.error('Error publishing race update:', error);
      // Don't throw - pub/sub failure shouldn't break the app
    }
  },

  async subscribeToRace(raceId, callback) {
    try {
      const redis = getRedis();
      if (!redis) {
        // Return null when Redis is not available
        return null;
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
      
      // If user doesn't exist, create them with 0 SOL starting balance
      if (!result.rows[0]) {
        await this.updateUserBalance(userId, '0.0');
        return '0.0';
      }
      
      // Return balance as string to preserve precision
      return balance ? balance.toString() : '0.0';
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

  // Get current odds for a race based on bet distribution
  async getCurrentOdds(raceId) {
    try {
      const query = `
        SELECT 
          racer_id,
          SUM(amount) as total_bet,
          COUNT(*) as bet_count
        FROM bet_history
        WHERE race_id = $1 AND result = 'pending'
        GROUP BY racer_id
        ORDER BY racer_id ASC
      `;
      const result = await pg.query(query, [raceId]);
      
      // Calculate total pot
      const totalPot = result.rows.reduce((sum, row) => sum + parseFloat(row.total_bet), 0);
      
      // Calculate odds for each racer
      const odds = {};
      const defaultOdds = 2.0; // Default odds when no bets exist
      
      if (totalPot === 0) {
        // No bets yet, return default odds for all racers (1-8)
        for (let i = 1; i <= 8; i++) {
          odds[i] = {
            racerId: i,
            odds: defaultOdds,
            totalBet: 0,
            betCount: 0,
            probability: 12.5, // Equal probability
            payout: defaultOdds
          };
        }
      } else {
        // Calculate odds based on bet distribution
        const houseEdge = 0.14; // 14% house edge (86% payout)
        const availablePayout = totalPot * (1 - houseEdge);
        
        // Create odds for all racers (1-8)
        for (let i = 1; i <= 8; i++) {
          const racerBets = result.rows.find(row => parseInt(row.racer_id) === i);
          const racerTotalBet = racerBets ? parseFloat(racerBets.total_bet) : 0;
          const racerBetCount = racerBets ? parseInt(racerBets.bet_count) : 0;
          
          let racerOdds, probability, payout;
          
          if (racerTotalBet === 0) {
            // No bets on this racer - high odds
            racerOdds = 10.0;
            probability = availablePayout / (totalPot * racerOdds) * 100;
            payout = racerOdds;
          } else {
            // Calculate odds based on proportion of total bets
            const betProportion = racerTotalBet / totalPot;
            probability = betProportion * 100;
            
            // Odds = total available payout / racer's share
            payout = availablePayout / racerTotalBet;
            racerOdds = Math.max(1.1, Math.min(10.0, payout)); // Cap between 1.1x and 10x
          }
          
          odds[i] = {
            racerId: i,
            odds: parseFloat(racerOdds.toFixed(2)),
            totalBet: racerTotalBet,
            betCount: racerBetCount,
            probability: parseFloat(probability.toFixed(1)),
            payout: parseFloat(payout.toFixed(2))
          };
        }
      }
      
      const oddsData = {
        raceId,
        totalPot,
        timestamp: new Date().toISOString(),
        odds
      };

      // Save odds snapshot to database for this race
      await this.saveRaceOddsSnapshot(raceId, oddsData);
      
      return oddsData;
    } catch (error) {
      logger.error('Error calculating current odds:', error);
      throw error;
    }
  },

  // Save race odds snapshot to database
  async saveRaceOddsSnapshot(raceId, oddsData) {
    try {
      // Extract round ID from race ID (e.g., "race_654" -> 654)
      const roundId = parseInt(raceId.replace('race_', '')) || 0;
      
      const query = `
        INSERT INTO race_odds_snapshots (race_id, round_id, odds_data, total_pot, total_bets, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (race_id) DO UPDATE SET
        odds_data = EXCLUDED.odds_data,
        total_pot = EXCLUDED.total_pot,
        total_bets = EXCLUDED.total_bets,
        created_at = EXCLUDED.created_at
      `;
      
      await pg.query(query, [
        raceId,
        roundId,
        JSON.stringify(oddsData),
        oddsData.totalPot || 0,
        Object.values(oddsData.odds).reduce((sum, o) => sum + o.betCount, 0)
      ]);
    } catch (error) {
      logger.error('Error saving race odds snapshot:', error);
      // Don't throw here - this is just for tracking
    }
  },

  // Get historical odds for a specific race
  async getRaceOddsSnapshot(raceId) {
    try {
      const query = `
        SELECT odds_data, total_pot, total_bets, created_at
        FROM race_odds_snapshots
        WHERE race_id = $1
      `;
      const result = await pg.query(query, [raceId]);
      
      if (result.rows.length > 0) {
        return {
          ...result.rows[0].odds_data,
          totalPot: parseFloat(result.rows[0].total_pot),
          totalBets: result.rows[0].total_bets,
          snapshotTime: result.rows[0].created_at
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting race odds snapshot:', error);
      return null;
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



  // Get race odds snapshot
  async getRaceOddsSnapshot(raceId) {
    try {
      const query = `
        SELECT race_id, round_id, odds_data, total_pot, total_bets, created_at
        FROM race_odds_snapshots
        WHERE race_id = $1
      `;
      const result = await pg.query(query, [raceId]);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          odds_data: result.rows[0].odds_data, // Already parsed by pg
          total_pot: parseFloat(result.rows[0].total_pot),
          total_bets: parseInt(result.rows[0].total_bets)
        };
      }
      return null;
    } catch (error) {
      logger.error('Error getting race odds snapshot:', error);
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

    // Create race_odds_snapshots table for tracking odds per race
    await pg.query(`
      CREATE TABLE IF NOT EXISTS race_odds_snapshots (
        id SERIAL PRIMARY KEY,
        race_id VARCHAR(255) NOT NULL,
        round_id INTEGER NOT NULL,
        odds_data JSONB NOT NULL,
        total_pot DECIMAL(20, 9) NOT NULL DEFAULT 0,
        total_bets INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(race_id)
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
