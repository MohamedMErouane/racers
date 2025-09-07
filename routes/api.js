const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const sanitizeHtml = require('sanitize-html');
const { verifyPrivyToken, getBearerToken } = require('../lib/privy');
const router = express.Router();

// Rate limiting for chat and bets
const chatRateLimit = rateLimit({
  windowMs: 5000, // 5 seconds
  max: 10, // 10 requests per window
  message: 'Too many chat messages, please slow down'
});

const betRateLimit = rateLimit({
  windowMs: 5000, // 5 seconds
  max: 10, // 10 requests per window
  message: 'Too many bet requests, please slow down'
});

// Validation schemas
const chatMessageSchema = z.object({
  message: z.string().min(1).max(500),
  username: z.string().min(1).max(50)
});

const betSchema = z.object({
  racerId: z.number().int().min(1).max(8),
  amount: z.number().positive().max(100)
});

const vaultSchema = z.object({
  amount: z.number().positive()
});

// Middleware to require Privy authentication
async function requirePrivy(req, res, next) {
  try {
    // Get token from Bearer header or cookie
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify the Privy JWT token
    const payload = await verifyPrivyToken(token);

    // Attach user info to request
    req.user = {
      id: payload.userId || payload.sub,
      address: payload.address,
      verified: true
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware to require admin privileges
function requireAdmin(req, res, next) {
  try {
    const adminAddresses = process.env.ADMIN_ADDRESSES ? 
      process.env.ADMIN_ADDRESSES.split(',').map(addr => addr.trim()) : [];
    
    if (adminAddresses.length === 0) {
      return res.status(503).json({ error: 'Admin configuration not set' });
    }
    
    if (!req.user || !req.user.address) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!adminAddresses.includes(req.user.address)) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Validation middleware
function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
  };
}

// Get current race state
router.get('/race/state', (req, res) => {
  try {
    const gameEngine = req.app.get('gameEngine');
    if (!gameEngine) {
      return res.status(503).json({ error: 'Game engine not available' });
    }
    
    const state = gameEngine.getState();
    res.json(state);
  } catch (error) {
    console.error('Error getting race state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a race (requires admin privileges)
router.post('/race/start', requirePrivy, requireAdmin, (req, res) => {
  try {
    const gameEngine = req.app.get('gameEngine');
    const io = req.app.get('io');

    if (!gameEngine || !io) {
      return res.status(503).json({ error: 'Game engine or Socket.IO not available' });
    }

    gameEngine.startRace(io);
    res.sendStatus(202);
  } catch (error) {
      console.error('Error starting race:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop a race (requires admin privileges)
router.post('/race/stop', requirePrivy, requireAdmin, (req, res) => {
  try {
    const gameEngine = req.app.get('gameEngine');

    if (!gameEngine) {
      return res.status(503).json({ error: 'Game engine not available' });
    }

    gameEngine.stopRace();
    res.sendStatus(202);
  } catch (error) {
    console.error('Error stopping race:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chat endpoints
router.get('/chat', async (req, res) => {
  try {
    const { redis } = require('../server/db');
    const messages = await redis.getChatMessages(100);
    res.json(messages);
  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/chat', chatRateLimit, requirePrivy, validateBody(chatMessageSchema), async (req, res) => {
  try {
    const { redis } = require('../server/db');
    
    // Sanitize the message and username
    const sanitizedMessage = sanitizeHtml(req.body.message, {
      allowedTags: [],
      allowedAttributes: {}
    });
    
    const sanitizedUsername = sanitizeHtml(req.body.username, {
      allowedTags: [],
      allowedAttributes: {}
    });
    
    const message = {
      message: sanitizedMessage,
      username: sanitizedUsername,
      userId: req.user.address, // Use authenticated user's address
      timestamp: Date.now()
    };
    
    await redis.addChatMessage(message);
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error adding chat message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bet endpoints
router.get('/bets', async (req, res) => {
  try {
    const { redis } = require('../server/db');
    const bets = await redis.getBets(100);
    res.json(bets);
  } catch (error) {
    console.error('Error getting bets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bets', betRateLimit, requirePrivy, validateBody(betSchema), async (req, res) => {
  try {
    const { redis } = require('../server/db');
    
    const bet = {
      ...req.body,
      userId: req.user.address, // Use authenticated user's address
      timestamp: Date.now(),
      status: 'pending'
    };
    
    await redis.addBet(bet);
    res.json({ success: true, bet });
  } catch (error) {
    console.error('Error adding bet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Solana vault endpoints
router.post('/vault/deposit/build', requirePrivy, validateBody(vaultSchema), async (req, res) => {
  try {
    const solana = require('../server/solana');
    const { amount } = req.body;
    const userPublicKey = req.user.address; // Use authenticated user's address
    
    const result = await solana.buildDepositTransaction(userPublicKey, amount);
    res.json(result);
  } catch (error) {
    console.error('Error building deposit transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vault/deposit/process', requirePrivy, async (req, res) => {
  try {
    const solana = require('../server/solana');
    const { pg } = require('../server/db');
    const { signedTransaction, amount } = req.body;
    const userAddress = req.user.address;
    
    if (!signedTransaction) {
      return res.status(400).json({ error: 'Signed transaction required' });
    }
    
    const result = await solana.processDepositTransaction(signedTransaction);
    
    if (result.success) {
      // Update user balance
      const currentBalance = await pg.getUserBalance(userAddress);
      const newBalance = currentBalance + amount;
      await pg.updateUserBalance(userAddress, newBalance);
      
      result.newBalance = newBalance;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error processing deposit transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vault/withdraw/build', requirePrivy, validateBody(vaultSchema), async (req, res) => {
  try {
    const solana = require('../server/solana');
    const { amount } = req.body;
    const userPublicKey = req.user.address; // Use authenticated user's address
    
    const result = await solana.buildWithdrawTransaction(userPublicKey, amount);
    res.json(result);
  } catch (error) {
    console.error('Error building withdraw transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vault/withdraw/process', requirePrivy, async (req, res) => {
  try {
    const solana = require('../server/solana');
    const { pg } = require('../server/db');
    const { signedTransaction, amount } = req.body;
    const userAddress = req.user.address;
    
    if (!signedTransaction) {
      return res.status(400).json({ error: 'Signed transaction required' });
    }
    
    const result = await solana.processWithdrawTransaction(signedTransaction);
    
    if (result.success) {
      // Update user balance
      const currentBalance = await pg.getUserBalance(userAddress);
      const newBalance = Math.max(0, currentBalance - amount); // Prevent negative balance
      await pg.updateUserBalance(userAddress, newBalance);
      
      // Log to bet history
      await pg.logBet(userAddress, 'withdraw', 0, amount, 'withdraw');
      
      result.newBalance = newBalance;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error processing withdraw transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/vault/balance/:userPublicKey', async (req, res) => {
  try {
    const solana = require('../server/solana');
    const { userPublicKey } = req.params;
    
    const balance = await solana.getVaultBalance(userPublicKey);
    res.json({ balance });
  } catch (error) {
    console.error('Error getting vault balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vault/initialize', requirePrivy, async (req, res) => {
  try {
    const solana = require('../server/solana');
    const userPublicKey = req.user.address; // Use authenticated user's address
    
    const result = await solana.initializeVault(userPublicKey);
    res.json(result);
  } catch (error) {
    console.error('Error initializing vault:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
