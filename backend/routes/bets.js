const express = require('express');
const { authMiddleware } = require('../services/privy');
const { db } = require('../services/supabase');
const { gameRedis } = require('../services/redis');
const { gameSolana } = require('../services/solana');
const logger = require('../services/logger');

const router = express.Router();

// Place a bet
router.post('/place', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { raceId, racerId, amount } = req.body;

    // Validate input
    if (!raceId || !racerId || !amount) {
      return res.status(400).json({ error: 'Race ID, racer ID, and amount are required' });
    }

    if (amount <= 0 || amount > 100) {
      return res.status(400).json({ error: 'Bet amount must be between 0.1 and 100 SOL' });
    }

    // Get current race
    const race = await db.getRace(raceId);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    // Check if race is accepting bets
    if (!['waiting', 'countdown'].includes(race.status)) {
      return res.status(400).json({ error: 'Race is not accepting bets' });
    }

    // Check if user already has a bet in this race
    const existingBets = await gameRedis.getBets(raceId);
    if (existingBets[userId]) {
      return res.status(400).json({ error: 'You already have a bet in this race' });
    }

    // Get user info
    const user = await db.getUser(userId);
    if (!user || !user.wallet_address) {
      return res.status(400).json({ error: 'Wallet not connected' });
    }

    // Check user balance (simulated - in real implementation, check on-chain)
    // For now, we'll assume users have sufficient balance

    // Create bet data
    const betData = {
      id: `bet_${raceId}_${userId}_${Date.now()}`,
      race_id: raceId,
      user_id: userId,
      racer_id: racerId,
      amount: amount,
      status: 'pending',
      created_at: new Date().toISOString(),
      payout: null,
      profit: null
    };

    // Lock bet on Solana (simulated)
    const txSignature = await gameSolana.lockBet(raceId, userId, amount, racerId);

    // Store bet in database
    const bet = await db.createBet(betData);

    // Store bet in Redis for real-time updates
    await gameRedis.addBet(raceId, userId, {
      id: bet.id,
      racerId: racerId,
      amount: amount,
      timestamp: Date.now(),
      txSignature: txSignature
    });

    // Update race total pot
    const currentPot = race.total_pot || 0;
    const newPot = currentPot + amount;
    await db.updateRace(raceId, {
      total_pot: newPot,
      total_bets: (race.total_bets || 0) + 1
    });

    // Publish bet update to Redis
    await gameRedis.publish(`race:${raceId}:bets`, {
      type: 'bet_placed',
      userId: userId,
      racerId: racerId,
      amount: amount,
      totalPot: newPot
    });

    logger.info(`💰 Bet placed: ${amount} SOL on racer ${racerId} by user ${userId} in race ${raceId}`);

    res.json({
      message: 'Bet placed successfully',
      bet: {
        id: bet.id,
        raceId: raceId,
        racerId: racerId,
        amount: amount,
        txSignature: txSignature,
        status: 'pending'
      },
      totalPot: newPot
    });
  } catch (error) {
    logger.error('Error placing bet:', error);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

// Get user's bets for a race
router.get('/race/:raceId', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { raceId } = req.params;

    const bets = await gameRedis.getBets(raceId);
    const userBet = bets[userId];

    if (!userBet) {
      return res.json({ bet: null });
    }

    res.json({ bet: userBet });
  } catch (error) {
    logger.error('Error getting user bet:', error);
    res.status(500).json({ error: 'Failed to get bet' });
  }
});

// Get all bets for a race (for race statistics)
router.get('/race/:raceId/all', async (req, res) => {
  try {
    const { raceId } = req.params;

    const bets = await gameRedis.getBets(raceId);
    
    // Calculate betting distribution
    const distribution = {};
    let totalAmount = 0;

    Object.values(bets).forEach(bet => {
      if (!distribution[bet.racerId]) {
        distribution[bet.racerId] = 0;
      }
      distribution[bet.racerId] += bet.amount;
      totalAmount += bet.amount;
    });

    // Calculate percentages
    const percentages = {};
    Object.keys(distribution).forEach(racerId => {
      percentages[racerId] = totalAmount > 0 ? (distribution[racerId] / totalAmount) * 100 : 0;
    });

    res.json({
      bets: bets,
      distribution: distribution,
      percentages: percentages,
      totalAmount: totalAmount,
      betCount: Object.keys(bets).length
    });
  } catch (error) {
    logger.error('Error getting race bets:', error);
    res.status(500).json({ error: 'Failed to get race bets' });
  }
});

// Get user's betting history
router.get('/history', authMiddleware.verifyAuth, async (req, res) => {
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
    logger.error('Error getting betting history:', error);
    res.status(500).json({ error: 'Failed to get betting history' });
  }
});

// Cancel a bet (only if race hasn't started)
router.delete('/cancel/:betId', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { betId } = req.params;

    // Get bet from database
    const bet = await db.getBet(betId);
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this bet' });
    }

    // Get race status
    const race = await db.getRace(bet.race_id);
    if (!race || !['waiting', 'countdown'].includes(race.status)) {
      return res.status(400).json({ error: 'Cannot cancel bet - race has started' });
    }

    // Update bet status
    await db.updateBet(betId, {
      status: 'cancelled',
      updated_at: new Date().toISOString()
    });

    // Remove bet from Redis
    await gameRedis.removeBet(bet.race_id, userId);

    // Update race total pot
    const newPot = (race.total_pot || 0) - bet.amount;
    await db.updateRace(bet.race_id, {
      total_pot: Math.max(0, newPot),
      total_bets: Math.max(0, (race.total_bets || 0) - 1)
    });

    // Publish bet cancellation
    await gameRedis.publish(`race:${bet.race_id}:bets`, {
      type: 'bet_cancelled',
      userId: userId,
      amount: bet.amount,
      totalPot: newPot
    });

    logger.info(`❌ Bet cancelled: ${bet.amount} SOL by user ${userId} in race ${bet.race_id}`);

    res.json({
      message: 'Bet cancelled successfully',
      refundAmount: bet.amount
    });
  } catch (error) {
    logger.error('Error cancelling bet:', error);
    res.status(500).json({ error: 'Failed to cancel bet' });
  }
});

// Get betting statistics
router.get('/stats', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    // Calculate time range
    let startTime;
    const now = new Date();
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get betting statistics from database
    const { data: bets, error } = await db.getSupabaseAdmin()
      .from('bets')
      .select('*')
      .gte('created_at', startTime.toISOString());

    if (error) throw error;

    // Calculate statistics
    const stats = {
      totalBets: bets.length,
      totalVolume: bets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0),
      averageBet: 0,
      uniqueUsers: new Set(bets.map(bet => bet.user_id)).size,
      racerDistribution: {},
      hourlyVolume: {}
    };

    if (stats.totalBets > 0) {
      stats.averageBet = stats.totalVolume / stats.totalBets;
    }

    // Calculate racer distribution
    bets.forEach(bet => {
      if (!stats.racerDistribution[bet.racer_id]) {
        stats.racerDistribution[bet.racer_id] = 0;
      }
      stats.racerDistribution[bet.racer_id] += parseFloat(bet.amount);
    });

    // Calculate hourly volume
    bets.forEach(bet => {
      const hour = new Date(bet.created_at).getHours();
      if (!stats.hourlyVolume[hour]) {
        stats.hourlyVolume[hour] = 0;
      }
      stats.hourlyVolume[hour] += parseFloat(bet.amount);
    });

    res.json({
      timeRange: timeRange,
      stats: stats
    });
  } catch (error) {
    logger.error('Error getting betting statistics:', error);
    res.status(500).json({ error: 'Failed to get betting statistics' });
  }
});

// Get top bettors
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const leaderboard = await db.getLeaderboard(parseInt(limit));

    res.json({
      leaderboard: leaderboard,
      total: leaderboard.length,
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error getting betting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get betting leaderboard' });
  }
});

module.exports = router;
