const Sentry = require('@sentry/node');
const logger = require('./logger');

function initializeSentry() {
  try {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 1.0,
      });
      
      logger.info('✅ Sentry initialized successfully');
    } else {
      logger.warn('⚠️ Sentry DSN not provided, skipping initialization');
    }
  } catch (error) {
    logger.error('❌ Failed to initialize Sentry:', error);
  }
}

module.exports = {
  initializeSentry
};
