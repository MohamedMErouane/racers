const express = require('express');
const { authMiddleware } = require('../services/privy');
const { db } = require('../services/supabase');
const { gameRedis } = require('../services/redis');
const logger = require('../services/logger');

const router = express.Router();

// Get current race state
router.get('/current', async (req, res) => {
  try {
    // Get active races from database
    const activeRaces = await db.getActiveRaces();
    
    if (activeRaces.length === 0) {
      return res.json({
        race: null,
        message: 'No active races'
      });
    }

    // Get the most recent active race
    const currentRace = activeRaces[0];
    
    // Get race state from Redis
    const raceState = await gameRedis.getRaceState(currentRace.id);
    
    // Get bets for this race
    const bets = await gameRedis.getBets(currentRace.id);
    
    // Get chat history
    const chatHistory = await gameRedis.getChatHistory(currentRace.id, 20);

    res.json({
      race: {
        id: currentRace.id,
        status: currentRace.status,
        roundId: currentRace.round_id,
        countdown: raceState?.countdown || 0,
        phase: raceState?.phase || 'waiting',
        startedAt: currentRace.started_at,
        endsAt: currentRace.ends_at,
        totalPot: currentRace.total_pot || 0,
        totalBets: currentRace.total_bets || 0,
        winner: currentRace.winner,
        racers: raceState?.racers || [],
        bets: bets,
        chatHistory: chatHistory
      }
    });
  } catch (error) {
    logger.error('Error getting current race:', error);
    res.status(500).json({ error: 'Failed to get current race' });
  }
});

// Get race history
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const races = await db.getRaceHistory(parseInt(limit), parseInt(offset));
    
    res.json({
      races: races,
      total: races.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Error getting race history:', error);
    res.status(500).json({ error: 'Failed to get race history' });
  }
});

// Get specific race details
router.get('/:raceId', async (req, res) => {
  try {
    const { raceId } = req.params;
    
    const race = await db.getRace(raceId);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    // Get race state from Redis
    const raceState = await gameRedis.getRaceState(raceId);
    
    // Get bets for this race
    const bets = await gameRedis.getBets(raceId);
    
    // Get chat history
    const chatHistory = await gameRedis.getChatHistory(raceId, 50);

    // Get race result if completed
    let raceResult = null;
    if (race.status === 'completed') {
      raceResult = await db.getRaceResult(raceId);
    }

    res.json({
      race: {
        id: race.id,
        status: race.status,
        roundId: race.round_id,
        countdown: raceState?.countdown || 0,
        phase: raceState?.phase || 'waiting',
        startedAt: race.started_at,
        endsAt: race.ends_at,
        totalPot: race.total_pot || 0,
        totalBets: race.total_bets || 0,
        winner: race.winner,
        racers: raceState?.racers || [],
        bets: bets,
        chatHistory: chatHistory,
        result: raceResult
      }
    });
  } catch (error) {
    logger.error('Error getting race details:', error);
    res.status(500).json({ error: 'Failed to get race details' });
  }
});

// Join race (for authenticated users)
router.post('/join', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get current race
    const activeRaces = await db.getActiveRaces();
    if (activeRaces.length === 0) {
      return res.status(400).json({ error: 'No active race to join' });
    }

    const currentRace = activeRaces[0];
    
    // Check if user is already in the race
    const raceState = await gameRedis.getRaceState(currentRace.id);
    if (raceState && raceState.participants && raceState.participants.includes(userId)) {
      return res.json({
        message: 'Already joined race',
        raceId: currentRace.id
      });
    }

    // Add user to race participants
    if (!raceState) {
      await gameRedis.setRaceState(currentRace.id, {
        participants: [userId],
        phase: 'waiting',
        countdown: 0
      });
    } else {
      if (!raceState.participants) {
        raceState.participants = [];
      }
      if (!raceState.participants.includes(userId)) {
        raceState.participants.push(userId);
        await gameRedis.setRaceState(currentRace.id, raceState);
      }
    }

    // Add user to online users
    await gameRedis.addOnlineUser(userId);

    res.json({
      message: 'Successfully joined race',
      raceId: currentRace.id,
      participants: raceState?.participants?.length || 1
    });
  } catch (error) {
    logger.error('Error joining race:', error);
    res.status(500).json({ error: 'Failed to join race' });
  }
});

// Leave race
router.post('/leave', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get current race
    const activeRaces = await db.getActiveRaces();
    if (activeRaces.length === 0) {
      return res.status(400).json({ error: 'No active race to leave' });
    }

    const currentRace = activeRaces[0];
    
    // Remove user from race participants
    const raceState = await gameRedis.getRaceState(currentRace.id);
    if (raceState && raceState.participants) {
      raceState.participants = raceState.participants.filter(id => id !== userId);
      await gameRedis.setRaceState(currentRace.id, raceState);
    }

    // Remove user from online users
    await gameRedis.removeOnlineUser(userId);

    res.json({
      message: 'Successfully left race',
      raceId: currentRace.id
    });
  } catch (error) {
    logger.error('Error leaving race:', error);
    res.status(500).json({ error: 'Failed to leave race' });
  }
});

// Get race participants
router.get('/:raceId/participants', async (req, res) => {
  try {
    const { raceId } = req.params;
    
    const raceState = await gameRedis.getRaceState(raceId);
    const participants = raceState?.participants || [];
    
    // Get user details for participants
    const participantDetails = await Promise.all(
      participants.map(async (userId) => {
        try {
          const user = await db.getUser(userId);
          return {
            id: userId,
            username: user?.username || `user_${userId.slice(0, 8)}`,
            wallet_address: user?.wallet_address
          };
        } catch (error) {
          return {
            id: userId,
            username: `user_${userId.slice(0, 8)}`,
            wallet_address: null
          };
        }
      })
    );

    res.json({
      participants: participantDetails,
      count: participants.length
    });
  } catch (error) {
    logger.error('Error getting race participants:', error);
    res.status(500).json({ error: 'Failed to get race participants' });
  }
});

// Get race statistics
router.get('/:raceId/stats', async (req, res) => {
  try {
    const { raceId } = req.params;
    
    const race = await db.getRace(raceId);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    const bets = await gameRedis.getBets(raceId);
    const raceState = await gameRedis.getRaceState(raceId);
    
    // Calculate betting distribution
    const bettingDistribution = {};
    let totalBets = 0;
    
    Object.values(bets).forEach(bet => {
      if (!bettingDistribution[bet.racerId]) {
        bettingDistribution[bet.racerId] = 0;
      }
      bettingDistribution[bet.racerId] += bet.amount;
      totalBets += bet.amount;
    });

    // Calculate percentages
    const distributionPercentages = {};
    Object.keys(bettingDistribution).forEach(racerId => {
      distributionPercentages[racerId] = (bettingDistribution[racerId] / totalBets) * 100;
    });

    res.json({
      raceId: raceId,
      totalPot: race.total_pot || 0,
      totalBets: totalBets,
      bettingDistribution: bettingDistribution,
      distributionPercentages: distributionPercentages,
      participantCount: raceState?.participants?.length || 0,
      status: race.status,
      winner: race.winner
    });
  } catch (error) {
    logger.error('Error getting race statistics:', error);
    res.status(500).json({ error: 'Failed to get race statistics' });
  }
});

module.exports = router;
