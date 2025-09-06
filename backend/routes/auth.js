const express = require('express');
const { authMiddleware, userUtils } = require('../services/privy');
const { db } = require('../services/supabase');
const { gameRedis } = require('../services/redis');
const logger = require('../services/logger');

const router = express.Router();

// Get current user info
router.get('/me', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user from database
    let user = await db.getUser(userId);
    
    // If user doesn't exist in database, create them
    if (!user) {
      const userInfo = userUtils.extractUserInfo(req.user);
      user = await db.createUser({
        id: userId,
        email: userInfo.email,
        wallet_address: userInfo.wallet,
        username: userInfo.email?.split('@')[0] || `user_${userId.slice(0, 8)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Get user stats
    const stats = await db.getUserStats(userId);
    
    // Update user session in Redis
    await gameRedis.setUserSession(userId, {
      user: user,
      stats: stats,
      lastActive: Date.now()
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        wallet_address: user.wallet_address,
        created_at: user.created_at
      },
      stats: stats,
      hasWallet: userUtils.hasWallet(req.user),
      primaryWallet: userUtils.getPrimaryWallet(req.user)
    });
  } catch (error) {
    logger.error('Error getting user info:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Update user profile
router.put('/profile', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { username, email } = req.body;

    // Validate input
    if (username && (username.length < 3 || username.length > 20)) {
      return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if username is already taken
    if (username) {
      const existingUser = await db.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Update user
    const updates = {
      updated_at: new Date().toISOString()
    };

    if (username) updates.username = username;
    if (email) updates.email = email;

    const updatedUser = await db.updateUser(userId, updates);

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        wallet_address: updatedUser.wallet_address,
        updated_at: updatedUser.updated_at
      }
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Connect wallet
router.post('/connect-wallet', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    // Verify wallet format (basic validation)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Update user with wallet address
    const updatedUser = await db.updateUser(userId, {
      wallet_address: walletAddress,
      updated_at: new Date().toISOString()
    });

    // Update session
    await gameRedis.setUserSession(userId, {
      user: updatedUser,
      lastActive: Date.now()
    });

    res.json({
      message: 'Wallet connected successfully',
      wallet_address: walletAddress
    });
  } catch (error) {
    logger.error('Error connecting wallet:', error);
    res.status(500).json({ error: 'Failed to connect wallet' });
  }
});

// Disconnect wallet
router.post('/disconnect-wallet', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Update user to remove wallet address
    const updatedUser = await db.updateUser(userId, {
      wallet_address: null,
      updated_at: new Date().toISOString()
    });

    // Update session
    await gameRedis.setUserSession(userId, {
      user: updatedUser,
      lastActive: Date.now()
    });

    res.json({
      message: 'Wallet disconnected successfully'
    });
  } catch (error) {
    logger.error('Error disconnecting wallet:', error);
    res.status(500).json({ error: 'Failed to disconnect wallet' });
  }
});

// Get user session
router.get('/session', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const session = await gameRedis.getUserSession(userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    logger.error('Error getting user session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Logout (clear session)
router.post('/logout', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Remove from online users
    await gameRedis.removeOnlineUser(userId);

    // Clear session
    await gameRedis.deleteUserSession(userId);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Get user stats
router.get('/stats', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const stats = await db.getUserStats(userId);

    res.json(stats);
  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

// Get user betting history
router.get('/bets', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;

    const bets = await db.getBetsByUser(userId, parseInt(limit));

    res.json({
      bets: bets,
      total: bets.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Error getting user bets:', error);
    res.status(500).json({ error: 'Failed to get betting history' });
  }
});

module.exports = router;
