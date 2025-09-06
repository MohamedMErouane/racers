const { PrivyClient } = require('@privy-io/server-auth');
const jose = require('jose');
const logger = require('./logger');

let privyClient = null;
let jwks = null;

async function initializePrivy() {
  try {
    // Initialize Privy client
    privyClient = new PrivyClient({
      appId: process.env.PRIVY_APP_ID,
      appSecret: process.env.PRIVY_APP_SECRET
    });

    // Initialize JWKS for token verification
    jwks = jose.createRemoteJWKSet(new URL(process.env.PRIVY_JWKS_URL));

    logger.info('✅ Privy initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize Privy:', error);
    throw error;
  }
}

// Privy utility functions
const privy = {
  // Token verification
  async verifyToken(token) {
    try {
      // First try server-side verification
      try {
        const user = await privyClient.verifyAuthToken(token);
        return user;
      } catch (serverError) {
        logger.warn('Server-side verification failed, trying JWKS:', serverError.message);
        
        // Fallback to JWKS verification
        const { payload } = await jose.jwtVerify(token, jwks, {
          issuer: 'https://auth.privy.io',
          audience: process.env.PRIVY_APP_ID
        });
        
        return payload;
      }
    } catch (error) {
      logger.error('Error verifying Privy token:', error);
      throw error;
    }
  },

  // User operations
  async getUser(userId) {
    try {
      const user = await privyClient.getUser(userId);
      return user;
    } catch (error) {
      logger.error('Error getting user from Privy:', error);
      throw error;
    }
  },

  async updateUser(userId, updates) {
    try {
      const user = await privyClient.updateUser(userId, updates);
      return user;
    } catch (error) {
      logger.error('Error updating user in Privy:', error);
      throw error;
    }
  },

  async deleteUser(userId) {
    try {
      await privyClient.deleteUser(userId);
      return true;
    } catch (error) {
      logger.error('Error deleting user from Privy:', error);
      throw error;
    }
  },

  // Wallet operations
  async linkWallet(userId, walletAddress) {
    try {
      const user = await privyClient.linkWallet(userId, walletAddress);
      return user;
    } catch (error) {
      logger.error('Error linking wallet:', error);
      throw error;
    }
  },

  async unlinkWallet(userId, walletAddress) {
    try {
      const user = await privyClient.unlinkWallet(userId, walletAddress);
      return user;
    } catch (error) {
      logger.error('Error unlinking wallet:', error);
      throw error;
    }
  },

  // Session operations
  async createSession(userId, expiresIn = 86400) {
    try {
      const session = await privyClient.createSession(userId, expiresIn);
      return session;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  },

  async revokeSession(sessionId) {
    try {
      await privyClient.revokeSession(sessionId);
      return true;
    } catch (error) {
      logger.error('Error revoking session:', error);
      throw error;
    }
  }
};

// Authentication middleware
const authMiddleware = {
  // Extract token from request
  extractToken(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    
    // Check cookies
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)privy-token=([^;]+)/);
    if (tokenMatch) {
      return decodeURIComponent(tokenMatch[1]);
    }
    
    return null;
  },

  // Verify authentication
  async verifyAuth(req, res, next) {
    try {
      const token = authMiddleware.extractToken(req);
      
      if (!token) {
        return res.status(401).json({ error: 'No authentication token provided' });
      }

      const user = await privy.verifyToken(token);
      req.user = user;
      req.userId = user.id;
      
      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
  },

  // Optional authentication (doesn't fail if no token)
  async optionalAuth(req, res, next) {
    try {
      const token = authMiddleware.extractToken(req);
      
      if (token) {
        const user = await privy.verifyToken(token);
        req.user = user;
        req.userId = user.id;
      }
      
      next();
    } catch (error) {
      logger.warn('Optional authentication failed:', error.message);
      // Continue without authentication
      next();
    }
  },

  // Verify wallet ownership
  async verifyWallet(req, res, next) {
    try {
      if (!req.user || !req.user.wallet) {
        return res.status(401).json({ error: 'Wallet not connected' });
      }

      const { walletAddress } = req.body;
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      // Verify the wallet belongs to the user
      const userWallets = req.user.wallet?.addresses || [];
      if (!userWallets.includes(walletAddress)) {
        return res.status(403).json({ error: 'Wallet not owned by user' });
      }

      req.walletAddress = walletAddress;
      next();
    } catch (error) {
      logger.error('Wallet verification error:', error);
      return res.status(500).json({ error: 'Wallet verification failed' });
    }
  }
};

// User management utilities
const userUtils = {
  // Extract user info from Privy user object
  extractUserInfo(privyUser) {
    return {
      id: privyUser.id,
      email: privyUser.email?.address,
      wallet: privyUser.wallet?.address,
      walletAddresses: privyUser.wallet?.addresses || [],
      createdAt: privyUser.createdAt,
      lastActiveAt: privyUser.lastActiveAt
    };
  },

  // Check if user has wallet connected
  hasWallet(user) {
    return user && user.wallet && user.wallet.address;
  },

  // Get primary wallet address
  getPrimaryWallet(user) {
    if (!user || !user.wallet) return null;
    return user.wallet.address;
  },

  // Get all wallet addresses
  getAllWallets(user) {
    if (!user || !user.wallet) return [];
    return user.wallet.addresses || [];
  },

  // Check if wallet is verified
  isWalletVerified(user, walletAddress) {
    if (!user || !user.wallet) return false;
    const verifiedWallets = user.wallet.verifiedAddresses || [];
    return verifiedWallets.includes(walletAddress);
  }
};

module.exports = {
  initializePrivy,
  privy,
  authMiddleware,
  userUtils,
  getPrivyClient: () => privyClient
};
