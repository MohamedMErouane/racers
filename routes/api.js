const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const sanitizeHtml = require('sanitize-html');
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
  userId: z.string().min(1),
  username: z.string().min(1).max(50)
});

const betSchema = z.object({
  racerId: z.number().int().min(1).max(8),
  amount: z.number().positive().max(100),
  userId: z.string().min(1)
});

// Middleware to require Privy authentication
function requirePrivy(req, res, next) {
  // In a real implementation, you would verify the Privy JWT token here
  // For now, we'll just check if there's an authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
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

// Start a race (requires authentication)
router.post('/race/start', requirePrivy, (req, res) => {
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

// Stop a race (requires authentication)
router.post('/race/stop', requirePrivy, (req, res) => {
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

router.post('/chat', chatRateLimit, validateBody(chatMessageSchema), async (req, res) => {
  try {
    const { redis } = require('../server/db');
    
    // Sanitize the message
    const sanitizedMessage = sanitizeHtml(req.body.message, {
      allowedTags: [],
      allowedAttributes: {}
    });
    
    const message = {
      ...req.body,
      message: sanitizedMessage,
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
router.post('/vault/deposit', requirePrivy, async (req, res) => {
  try {
    const solana = require('../server/solana');
    const { amount, userPublicKey } = req.body;
    
    if (!amount || !userPublicKey) {
      return res.status(400).json({ error: 'Amount and user public key are required' });
    }
    
    const result = await solana.deposit(userPublicKey, amount);
    res.json(result);
  } catch (error) {
    console.error('Error processing deposit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vault/withdraw', requirePrivy, async (req, res) => {
  try {
    const solana = require('../server/solana');
    const { amount, userPublicKey } = req.body;
    
    if (!amount || !userPublicKey) {
      return res.status(400).json({ error: 'Amount and user public key are required' });
    }
    
    const result = await solana.withdraw(userPublicKey, amount);
    res.json(result);
  } catch (error) {
    console.error('Error processing withdraw:', error);
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
    const { userPublicKey } = req.body;
    
    if (!userPublicKey) {
      return res.status(400).json({ error: 'User public key is required' });
    }
    
    const result = await solana.initializeVault(userPublicKey);
    res.json(result);
  } catch (error) {
    console.error('Error initializing vault:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
