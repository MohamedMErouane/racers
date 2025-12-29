const Redis = require('ioredis');
const logger = require('./logger');

let redis = null;
let redisAvailable = false;

async function initializeRedis() {
  // Skip Redis initialization if no URL is provided
  if (!process.env.REDIS_URL) {
    logger.warn('⚠️ REDIS_URL not set, running without Redis (limited functionality)');
    redisAvailable = false;
    return null;
  }

  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      lazyConnect: true
    });
    
    redis.on('connect', () => {
      logger.info('✅ Redis connected');
      redisAvailable = true;
    });
    
    redis.on('error', (error) => {
      logger.error('❌ Redis error:', error.message);
      redisAvailable = false;
    });

    redis.on('close', () => {
      redisAvailable = false;
    });
    
    // Test connection with timeout
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 5000))
    ]);
    
    redisAvailable = true;
    logger.info('✅ Redis initialized successfully');
    
    return redis;
  } catch (error) {
    logger.warn('⚠️ Redis not available, running without Redis:', error.message);
    redisAvailable = false;
    redis = null;
    return null;
  }
}

module.exports = {
  initializeRedis,
  getRedis: () => redis,
  isRedisAvailable: () => redisAvailable,
  redis // Export the redis instance directly
};
