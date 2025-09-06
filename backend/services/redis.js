const { createClient } = require('redis');
const logger = require('./logger');

let redisClient = null;
let pubClient = null;
let subClient = null;

async function initializeRedis() {
  try {
    // Main Redis client for general operations
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    // Publisher client for pub/sub
    pubClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    // Subscriber client for pub/sub
    subClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    // Event handlers for main client
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    // Event handlers for publisher
    pubClient.on('error', (err) => {
      logger.error('Redis Publisher Error:', err);
    });

    // Event handlers for subscriber
    subClient.on('error', (err) => {
      logger.error('Redis Subscriber Error:', err);
    });

    // Connect all clients
    await Promise.all([
      redisClient.connect(),
      pubClient.connect(),
      subClient.connect()
    ]);

    logger.info('✅ All Redis clients connected successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize Redis:', error);
    throw error;
  }
}

// Redis utility functions
const redis = {
  // Basic operations
  async get(key) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      throw error;
    }
  },

  async set(key, value, options = {}) {
    try {
      if (options.expire) {
        return await redisClient.setEx(key, options.expire, value);
      }
      return await redisClient.set(key, value);
    } catch (error) {
      logger.error('Redis SET error:', error);
      throw error;
    }
  },

  async del(key) {
    try {
      return await redisClient.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error);
      throw error;
    }
  },

  async exists(key) {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      throw error;
    }
  },

  // Hash operations
  async hget(key, field) {
    try {
      return await redisClient.hGet(key, field);
    } catch (error) {
      logger.error('Redis HGET error:', error);
      throw error;
    }
  },

  async hset(key, field, value) {
    try {
      return await redisClient.hSet(key, field, value);
    } catch (error) {
      logger.error('Redis HSET error:', error);
      throw error;
    }
  },

  async hgetall(key) {
    try {
      return await redisClient.hGetAll(key);
    } catch (error) {
      logger.error('Redis HGETALL error:', error);
      throw error;
    }
  },

  async hdel(key, field) {
    try {
      return await redisClient.hDel(key, field);
    } catch (error) {
      logger.error('Redis HDEL error:', error);
      throw error;
    }
  },

  // List operations
  async lpush(key, value) {
    try {
      return await redisClient.lPush(key, value);
    } catch (error) {
      logger.error('Redis LPUSH error:', error);
      throw error;
    }
  },

  async rpush(key, value) {
    try {
      return await redisClient.rPush(key, value);
    } catch (error) {
      logger.error('Redis RPUSH error:', error);
      throw error;
    }
  },

  async lrange(key, start, stop) {
    try {
      return await redisClient.lRange(key, start, stop);
    } catch (error) {
      logger.error('Redis LRANGE error:', error);
      throw error;
    }
  },

  async llen(key) {
    try {
      return await redisClient.lLen(key);
    } catch (error) {
      logger.error('Redis LLEN error:', error);
      throw error;
    }
  },

  // Set operations
  async sadd(key, member) {
    try {
      return await redisClient.sAdd(key, member);
    } catch (error) {
      logger.error('Redis SADD error:', error);
      throw error;
    }
  },

  async smembers(key) {
    try {
      return await redisClient.sMembers(key);
    } catch (error) {
      logger.error('Redis SMEMBERS error:', error);
      throw error;
    }
  },

  async srem(key, member) {
    try {
      return await redisClient.sRem(key, member);
    } catch (error) {
      logger.error('Redis SREM error:', error);
      throw error;
    }
  },

  // Pub/Sub operations
  async publish(channel, message) {
    try {
      return await pubClient.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.error('Redis PUBLISH error:', error);
      throw error;
    }
  },

  async subscribe(channel, callback) {
    try {
      await subClient.subscribe(channel, callback);
    } catch (error) {
      logger.error('Redis SUBSCRIBE error:', error);
      throw error;
    }
  },

  async unsubscribe(channel) {
    try {
      await subClient.unsubscribe(channel);
    } catch (error) {
      logger.error('Redis UNSUBSCRIBE error:', error);
      throw error;
    }
  },

  // JSON operations
  async setJSON(key, obj, options = {}) {
    try {
      const value = JSON.stringify(obj);
      if (options.expire) {
        return await redisClient.setEx(key, options.expire, value);
      }
      return await redisClient.set(key, value);
    } catch (error) {
      logger.error('Redis SETJSON error:', error);
      throw error;
    }
  },

  async getJSON(key) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GETJSON error:', error);
      throw error;
    }
  },

  // Atomic operations
  async incr(key) {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      logger.error('Redis INCR error:', error);
      throw error;
    }
  },

  async decr(key) {
    try {
      return await redisClient.decr(key);
    } catch (error) {
      logger.error('Redis DECR error:', error);
      throw error;
    }
  },

  // Expiration
  async expire(key, seconds) {
    try {
      return await redisClient.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      throw error;
    }
  },

  async ttl(key) {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      logger.error('Redis TTL error:', error);
      throw error;
    }
  }
};

// Game-specific Redis operations
const gameRedis = {
  // Race state management
  async setRaceState(raceId, state) {
    return await redis.setJSON(`race:${raceId}`, state, { expire: 3600 }); // 1 hour
  },

  async getRaceState(raceId) {
    return await redis.getJSON(`race:${raceId}`);
  },

  async deleteRaceState(raceId) {
    return await redis.del(`race:${raceId}`);
  },

  // Betting management
  async addBet(raceId, userId, bet) {
    const key = `bets:${raceId}`;
    return await redis.hset(key, userId, JSON.stringify(bet));
  },

  async getBets(raceId) {
    const key = `bets:${raceId}`;
    const bets = await redis.hgetall(key);
    const result = {};
    for (const [userId, betStr] of Object.entries(bets)) {
      result[userId] = JSON.parse(betStr);
    }
    return result;
  },

  async removeBets(raceId) {
    const key = `bets:${raceId}`;
    return await redis.del(key);
  },

  // Chat management
  async addChatMessage(raceId, message) {
    const key = `chat:${raceId}`;
    return await redis.lpush(key, JSON.stringify(message));
  },

  async getChatHistory(raceId, limit = 50) {
    const key = `chat:${raceId}`;
    const messages = await redis.lrange(key, 0, limit - 1);
    return messages.map(msg => JSON.parse(msg));
  },

  // User sessions
  async setUserSession(userId, sessionData) {
    return await redis.setJSON(`session:${userId}`, sessionData, { expire: 86400 }); // 24 hours
  },

  async getUserSession(userId) {
    return await redis.getJSON(`session:${userId}`);
  },

  async deleteUserSession(userId) {
    return await redis.del(`session:${userId}`);
  },

  // Online users
  async addOnlineUser(userId) {
    return await redis.sadd('online_users', userId);
  },

  async removeOnlineUser(userId) {
    return await redis.srem('online_users', userId);
  },

  async getOnlineUsers() {
    return await redis.smembers('online_users');
  },

  async getOnlineUserCount() {
    return await redis.llen('online_users');
  }
};

module.exports = {
  initializeRedis,
  redis,
  gameRedis,
  getRedisClient: () => redisClient,
  getPubClient: () => pubClient,
  getSubClient: () => subClient
};
