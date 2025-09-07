const { PrivyClient } = require('@privy-io/server-auth');
const logger = require('./logger');

let privyClient = null;

async function initializePrivy() {
  try {
    // Validate required environment variables
    const requiredVars = ['PRIVY_APP_ID', 'PRIVY_APP_SECRET', 'PRIVY_JWKS_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required Privy environment variables: ${missingVars.join(', ')}`);
    }

    // Initialize Privy client
    privyClient = new PrivyClient({
      appId: process.env.PRIVY_APP_ID,
      appSecret: process.env.PRIVY_APP_SECRET
    });

    // Test the connection by attempting to verify a dummy token
    // This will fail but validates the client configuration
    try {
      await privyClient.verifyAuthToken('dummy-token');
    } catch (error) {
      // Expected to fail with dummy token, but validates client setup
      if (!error.message.includes('Invalid token')) {
        throw error;
      }
    }

    logger.info('✅ Privy initialized successfully');
    return privyClient;
  } catch (error) {
    logger.error('❌ Failed to initialize Privy:', error);
    throw error;
  }
}

function getPrivyClient() {
  if (!privyClient) {
    throw new Error('Privy client not initialized. Call initializePrivy() first.');
  }
  return privyClient;
}

module.exports = {
  initializePrivy,
  getPrivyClient
};
