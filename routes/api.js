const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const sanitizeHtml = require('sanitize-html');
const { verifyPrivyToken, getBearerToken } = require('../lib/privy');
const solana = require('../server/solana');
const { stringToLamports, solToLamports, lamportsToString } = require('../utils/lamports');
const router = express.Router();

// Helper function for backward compatibility
function lamportsToSol(lamports) {
  return lamportsToString(lamports);
}

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

const readRateLimit = rateLimit({
  windowMs: 10000, // 10 seconds
  max: 30, // 30 requests per window
  message: 'Too many read requests, please slow down'
});

// Validation schemas
const chatMessageSchema = z.object({
  message: z.string().min(1).max(500)
});

const betSchema = z.object({
  racerId: z.number().int().min(1).max(8),
  amount: z.number().positive().max(100)
});

const vaultSchema = z.object({
  amount: z.number().positive()
});

const vaultProcessSchema = z.object({
  amount: z.number().positive(),
  signedTransaction: z.string()
});

// Middleware to require Privy authentication
async function requirePrivy(req, res, next) {
  try {
    // Get token from Bearer header or cookie
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let payload;

    // Check if this is a mock token (starts with "mock.jwt.token.")
    if (token.startsWith('mock.jwt.token.') && process.env.NODE_ENV === 'development') {
      console.log('🎭 Processing mock authentication token');
      try {
        // Decode the mock token
        const mockPayload = token.replace('mock.jwt.token.', '');
        payload = JSON.parse(atob(mockPayload));
        console.log('✅ Mock token decoded:', { sub: payload.sub, email: payload.email });
      } catch (error) {
        console.error('❌ Failed to decode mock token:', error);
        return res.status(401).json({ error: 'Invalid mock token' });
      }
    } else {
      // Verify the real Privy JWT token
      payload = await verifyPrivyToken(token);
    }

    // Generate username from email or use address as fallback
    let username = 'Anonymous';
    if (payload.email) {
      // Sanitize email prefix to create safe username
      const emailPrefix = payload.email.split('@')[0];
      // Remove disallowed characters and limit length
      username = emailPrefix
        .replace(/[^a-zA-Z0-9._-]/g, '') // Keep only alphanumeric, dots, underscores, hyphens
        .substring(0, 20) // Limit to 20 characters
        .toLowerCase(); // Convert to lowercase for consistency
      
      // Ensure username is not empty after sanitization
      if (!username) {
        username = 'Anonymous';
      }
    } else if (payload.address || payload.wallet) {
      const address = payload.address || payload.wallet;
      username = `User_${address.slice(0, 8)}`; // Use first 8 chars of address
    }

    // For mock tokens, we don't require a connected wallet
    const requireWallet = !token.startsWith('mock.jwt.token.');
    
    // Validate that user has connected a wallet (only for real tokens)
    if (requireWallet && !payload.address) {
      return res.status(400).json({ 
        error: 'Wallet not connected. Please connect your wallet to continue.' 
      });
    }

    // Attach user info to request
    req.user = {
      id: payload.userId || payload.sub,
      address: payload.address || payload.wallet || 'mock_wallet_address',
      username: username,
      verified: true,
      isMock: token.startsWith('mock.jwt.token.')
    };

    if (req.user.isMock) {
      console.log('🎭 Mock user authenticated:', req.user.username);
    }

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
      console.error('❌ ADMIN_ADDRESSES environment variable is not set');
      return res.status(403).json({ error: 'Admin access not configured' });
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
router.post('/race/start', requirePrivy, requireAdmin, async (req, res) => {
  try {
    const gameEngine = req.app.get('gameEngine');
    const io = req.app.get('io');

    if (!gameEngine || !io) {
      return res.status(503).json({ error: 'Game engine or Socket.IO not available' });
    }

    await gameEngine.startRace(io);
    res.sendStatus(202);
  } catch (error) {
      console.error('Error starting race:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop a race (requires admin privileges)
router.post('/race/stop', requirePrivy, requireAdmin, async (req, res) => {
  try {
    const gameEngine = req.app.get('gameEngine');

    if (!gameEngine) {
      return res.status(503).json({ error: 'Game engine not available' });
    }

    await gameEngine.stopRace(null, { restart: false });
    res.sendStatus(202);
  } catch (error) {
    console.error('Error stopping race:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chat endpoints
router.get('/chat', readRateLimit, requirePrivy, async (req, res) => {
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
    const io = req.app.get('io');
    
    // Sanitize the message
    const sanitizedMessage = sanitizeHtml(req.body.message, {
      allowedTags: [],
      allowedAttributes: {}
    });
    
    const message = {
      message: sanitizedMessage,
      username: req.user.username, // Use authenticated user's username
      userId: req.user.address, // Use authenticated user's address
      timestamp: Date.now()
    };
    
    await redis.addChatMessage(message);
    
    // Broadcast message to all connected clients
    if (io) {
      io.emit('chat:message', message);
    }
    
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error adding chat message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Balance endpoint
router.get('/balance', readRateLimit, requirePrivy, async (req, res) => {
  try {
    const { pg } = require('../server/db');
    const userAddress = req.user.address;
    
    const balance = await pg.getUserBalance(userAddress);
    res.json({ 
      balance,
      address: userAddress
    });
  } catch (error) {
    console.error('Error getting user balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Odds endpoint - get current betting odds for active race
router.get('/odds', readRateLimit, async (req, res) => {
  try {
    const { pg } = require('../server/db');
    const { getCurrentRace } = require('../server/gameEngine');
    
    // Get current race info
    const currentRace = getCurrentRace();
    if (!currentRace || !currentRace.raceId) {
      return res.json({
        error: 'No active race',
        odds: null,
        raceId: null
      });
    }
    
    // Get current odds for the active race
    const odds = await pg.getCurrentOdds(currentRace.raceId);
    
    // Also get any saved snapshot for this race
    const snapshot = await pg.getRaceOddsSnapshot(currentRace.raceId);
    
    // Return current odds with additional metadata
    res.json({
      ...odds,
      roundId: currentRace.roundId,
      status: currentRace.status,
      countdown: currentRace.countdown || 0,
      hasSnapshot: !!snapshot
    });
  } catch (error) {
    console.error('Error getting race odds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bet endpoints
router.get('/bets', readRateLimit, requirePrivy, async (req, res) => {
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
    const { redis, pg } = require('../server/db');
    const { amount } = req.body;
    const userAddress = req.user.address;
    
    // Check user's current balance
    const currentBalanceStr = await pg.getUserBalance(userAddress);
    const currentBalanceLamports = stringToLamports(currentBalanceStr);
    const betAmountLamports = solToLamports(amount);
    
    // Reject bet if it exceeds user's balance
    if (betAmountLamports > currentBalanceLamports) {
      return res.status(400).json({ 
        error: 'Insufficient balance', 
        currentBalance: lamportsToString(currentBalanceLamports), 
        requestedAmount: amount 
      });
    }
    
    // Check race state - only allow bets during countdown phase
    const gameEngine = req.app.get('gameEngine');
    const raceState = gameEngine.getState();
    if (raceState.status !== 'countdown') {
      return res.status(400).json({ 
        error: 'Bets are only accepted during countdown phase', 
        currentRaceStatus: raceState.status 
      });
    }
    
    const bet = {
      ...req.body,
      userId: userAddress,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    // Deduct the bet amount from user's balance
    const newBalanceLamports = currentBalanceLamports - betAmountLamports;
    const newBalanceStr = lamportsToString(newBalanceLamports);
    await pg.updateUserBalance(userAddress, newBalanceStr);
    
    // Log the bet to database with current race ID (convert to lamports for precision)
    const currentRaceState = gameEngine.getState();
    const raceId = currentRaceState.raceId; // Use consistent race ID
    const betAmountLamportsForLog = solToLamports(amount);
    const betAmountString = lamportsToString(betAmountLamportsForLog);
    await pg.logBet(userAddress, raceId, bet.racerId, betAmountString, 'pending');
    
    // Add bet to Redis for real-time updates
    await redis.addBet(bet);
    
    // Update race totals in game engine
    gameEngine.addBetToRace(amount);
    
    // Get updated race totals
    const raceTotals = gameEngine.getRaceTotals();
    
    // Broadcast updated odds immediately after bet is placed
    gameEngine.broadcastOddsUpdate();
    
    // Emit bet placed event to all connected clients for live updates
    const io = req.app.get('io');
    if (io) {
      io.emit('bet:placed', {
        bet,
        raceId,
        totalPot: raceTotals.totalPot,
        totalBets: raceTotals.totalBets
      });
    }
    
    res.json({ 
      success: true, 
      bet, 
      newBalance: lamportsToString(newBalanceLamports)
    });
  } catch (error) {
    console.error('Error adding bet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bet history endpoint
router.get('/bet-history', readRateLimit, requirePrivy, async (req, res) => {
  try {
    const { pg } = require('../server/db');
    const userAddress = req.user.address;
    
    const query = `
      SELECT * FROM bet_history 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `;
    const result = await pg.query(query, [userAddress]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting bet history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Solana vault endpoints
router.post('/vault/deposit/build', requirePrivy, validateBody(vaultSchema), async (req, res) => {
  try {
    const { amount } = req.body;
    const userPublicKey = req.user.address; // Use authenticated user's address
    
    const result = await solana.buildDepositTransaction(userPublicKey, amount);
    res.json(result);
  } catch (error) {
    console.error('Error building deposit transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vault/deposit/process', requirePrivy, validateBody(vaultProcessSchema), async (req, res) => {
  try {
    const { pg } = require('../server/db');
    const { signedTransaction, amount } = req.body;
    const userAddress = req.user.address;
    
    if (!signedTransaction) {
      return res.status(400).json({ error: 'Signed transaction required' });
    }
    
    const result = await solana.processDepositTransaction(signedTransaction, userAddress, amount);
    
    if (result.success) {
      // Convert both amounts to BigInt lamports for precise comparison
      const claimedLamports = solToLamports(amount);
      const verifiedLamports = BigInt(result.verifiedAmountLamports); // Convert string back to BigInt
      
      // Verify the claimed amount matches the transaction amount
      if (claimedLamports !== verifiedLamports) {
        return res.status(400).json({ 
          error: 'Amount mismatch', 
          claimed: amount, 
          verified: result.verifiedAmount 
        });
      }
      
      // Update user balance using verified amount from result
      const currentBalanceStr = await pg.getUserBalance(userAddress);
      const currentBalanceLamports = stringToLamports(currentBalanceStr);
      const verifiedAmountLamports = BigInt(result.verifiedAmountLamports);
      const newBalanceLamports = currentBalanceLamports + verifiedAmountLamports;
      const newBalanceStr = lamportsToString(newBalanceLamports);
      await pg.updateUserBalance(userAddress, newBalanceStr);
      
      // Log vault transaction with exact lamport amount converted to SOL string
      const depositAmountStr = lamportsToString(verifiedAmountLamports);
      await pg.logVaultTransaction(userAddress, 'deposit', depositAmountStr, result.signature);
      
      result.newBalance = lamportsToString(newBalanceLamports);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error processing deposit transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vault/withdraw/build', requirePrivy, validateBody(vaultSchema), async (req, res) => {
  try {
    const { pg } = require('../server/db');
    const { amount } = req.body;
    const userPublicKey = req.user.address; // Use authenticated user's address
    
    // Check user's off-chain balance before allowing withdraw
    const currentBalanceStr = await pg.getUserBalance(userPublicKey);
    const currentBalanceLamports = stringToLamports(currentBalanceStr);
    const withdrawAmountLamports = solToLamports(amount);
    
    // Reject withdraw if it exceeds user's off-chain balance
    if (withdrawAmountLamports > currentBalanceLamports) {
      return res.status(400).json({ 
        error: 'Insufficient balance', 
        currentBalance: lamportsToString(currentBalanceLamports), 
        requestedAmount: amount 
      });
    }
    
    const result = await solana.buildWithdrawTransaction(userPublicKey, amount);
    res.json(result);
  } catch (error) {
    console.error('Error building withdraw transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vault/withdraw/process', requirePrivy, validateBody(vaultProcessSchema), async (req, res) => {
  try {
    const { pg } = require('../server/db');
    const { signedTransaction, amount } = req.body;
    const userAddress = req.user.address;
    
    if (!signedTransaction) {
      return res.status(400).json({ error: 'Signed transaction required' });
    }
    
    const result = await solana.processWithdrawTransaction(signedTransaction, userAddress, amount);
    
    if (result.success) {
      // Convert both amounts to BigInt lamports for precise comparison
      const claimedLamports = solToLamports(amount);
      const verifiedLamports = BigInt(result.verifiedAmountLamports); // Convert string back to BigInt
      
      // Verify the claimed amount matches the transaction amount
      if (claimedLamports !== verifiedLamports) {
        return res.status(400).json({ 
          error: 'Amount mismatch', 
          claimed: amount, 
          verified: result.verifiedAmount 
        });
      }
      
      // Update user balance using verified amount from result
      const currentBalanceStr = await pg.getUserBalance(userAddress);
      const currentBalanceLamports = stringToLamports(currentBalanceStr);
      const verifiedAmountLamports = BigInt(result.verifiedAmountLamports);
      
      // Check that the result would not be negative
      if (currentBalanceLamports < verifiedAmountLamports) {
        return res.status(400).json({ 
          error: 'Insufficient balance for withdrawal', 
          currentBalance: lamportsToString(currentBalanceLamports),
          requestedAmount: lamportsToString(verifiedAmountLamports)
        });
      }
      
      const newBalanceLamports = currentBalanceLamports - verifiedAmountLamports;
      const newBalanceStr = lamportsToString(newBalanceLamports);
      await pg.updateUserBalance(userAddress, newBalanceStr);
      
      // Log vault transaction with exact lamport amount converted to SOL string
      const withdrawAmountStr = lamportsToString(verifiedAmountLamports);
      await pg.logVaultTransaction(userAddress, 'withdraw', withdrawAmountStr, result.signature);
      
      result.newBalance = lamportsToString(newBalanceLamports);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error processing withdraw transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/vault/balance/:userPublicKey', requirePrivy, async (req, res) => {
  try {
    const { userPublicKey } = req.params;
    
    // Verify the user can only access their own balance
    if (userPublicKey !== req.user.address) {
      return res.status(403).json({ error: 'Access denied: can only view your own vault balance' });
    }
    
    const balance = await solana.getVaultBalance(userPublicKey);
    // Return balance as string to preserve precision for large values
    // Always returns stringified SOL amount
    res.json({ 
      balance: balance.toString()
    });
  } catch (error) {
    console.error('Error getting vault balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vault/initialize/build', requirePrivy, async (req, res) => {
  try {
    const userPublicKey = req.user.address; // Use authenticated user's address
    
    const result = await solana.buildInitializeVaultTransaction(userPublicKey);
    res.json(result);
  } catch (error) {
    console.error('Error building vault initialization transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vault/initialize/process', requirePrivy, async (req, res) => {
  try {
    const { signedTransaction } = req.body;
    const userAddress = req.user.address;
    
    if (!signedTransaction) {
      return res.status(400).json({ error: 'Signed transaction required' });
    }
    
    const result = await solana.processInitializeVaultTransaction(signedTransaction, userAddress);
    res.json(result);
  } catch (error) {
    console.error('Error processing vault initialization transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
