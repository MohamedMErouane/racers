const Sentry = require('@sentry/node');
const logger = require('./logger');

function initializeSentry(app) {
  try {
    if (!process.env.SENTRY_DSN) {
      logger.warn('⚠️ Sentry DSN not configured, skipping Sentry initialization');
      return;
    }

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js tracing
        new Sentry.Integrations.Express({ app }),
      ],
      beforeSend(event, hint) {
        // Filter out non-critical errors in production
        if (process.env.NODE_ENV === 'production') {
          const error = hint.originalException;
          if (error && error.code === 'ECONNREFUSED') {
            return null; // Don't send connection refused errors
          }
        }
        return event;
      },
    });

    // Request handler must be the first middleware
    app.use(Sentry.requestHandler());

    // Tracing handler creates a trace for every incoming request
    app.use(Sentry.tracingHandler());

    logger.info('✅ Sentry initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize Sentry:', error);
    // Don't throw here, as Sentry is not critical for the app to function
  }
}

// Error handler must be registered before any other error middleware
function setupSentryErrorHandler(app) {
  app.use(Sentry.errorHandler());
}

// Utility functions for manual error reporting
const sentryUtils = {
  captureException(error, context = {}) {
    try {
      Sentry.withScope((scope) => {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
        Sentry.captureException(error);
      });
    } catch (err) {
      logger.error('Failed to capture exception with Sentry:', err);
    }
  },

  captureMessage(message, level = 'info', context = {}) {
    try {
      Sentry.withScope((scope) => {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
        Sentry.captureMessage(message, level);
      });
    } catch (err) {
      logger.error('Failed to capture message with Sentry:', err);
    }
  },

  setUser(user) {
    try {
      Sentry.setUser(user);
    } catch (err) {
      logger.error('Failed to set user in Sentry:', err);
    }
  },

  setTag(key, value) {
    try {
      Sentry.setTag(key, value);
    } catch (err) {
      logger.error('Failed to set tag in Sentry:', err);
    }
  },

  setContext(key, context) {
    try {
      Sentry.setContext(key, context);
    } catch (err) {
      logger.error('Failed to set context in Sentry:', err);
    }
  },

  addBreadcrumb(breadcrumb) {
    try {
      Sentry.addBreadcrumb(breadcrumb);
    } catch (err) {
      logger.error('Failed to add breadcrumb in Sentry:', err);
    }
  }
};

module.exports = {
  initializeSentry,
  setupSentryErrorHandler,
  sentryUtils,
  Sentry
};
