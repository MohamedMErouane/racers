const Redis = require('ioredis');
const logger = require('./logger');

let redis = null;

async function initializeRedis() {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    redis.on('connect', () => {
      logger.info('✅ Redis connected');
    });
    
    redis.on('error', (error) => {
      logger.error('❌ Redis error:', error);
    });
    
    // Test connection
    await redis.ping();
    logger.info('✅ Redis initialized successfully');
    
    return redis;
  } catch (error) {
    logger.error('❌ Failed to initialize Redis:', error);
    throw error;
  }
}

module.exports = {
  initializeRedis,
  getRedis: () => redis,
  redis // Export the redis instance directly
};
