const express = require('express');
const { db } = require('../services/supabase');
const { gameRedis } = require('../services/redis');
const logger = require('../services/logger');

const router = express.Router();

// Get platform statistics
router.get('/platform', async (req, res) => {
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

    // Get platform statistics
    const [
      totalRaces,
      totalBets,
      totalVolume,
      totalUsers,
      activeRaces,
      onlineUsers
    ] = await Promise.all([
      // Total races in time range
      db.getSupabaseAdmin()
        .from('races')
        .select('count')
        .gte('created_at', startTime.toISOString()),
      
      // Total bets in time range
      db.getSupabaseAdmin()
        .from('bets')
        .select('count')
        .gte('created_at', startTime.toISOString()),
      
      // Total volume in time range
      db.getSupabaseAdmin()
        .from('bets')
        .select('amount')
        .gte('created_at', startTime.toISOString()),
      
      // Total unique users in time range
      db.getSupabaseAdmin()
        .from('bets')
        .select('user_id')
        .gte('created_at', startTime.toISOString()),
      
      // Active races
      db.getActiveRaces(),
      
      // Online users
      gameRedis.getOnlineUserCount()
    ]);

    // Calculate total volume
    const volumeData = totalVolume.data || [];
    const totalVolumeAmount = volumeData.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);

    // Calculate unique users
    const userData = totalUsers.data || [];
    const uniqueUsers = new Set(userData.map(bet => bet.user_id)).size;

    const stats = {
      timeRange: timeRange,
      totalRaces: totalRaces.count || 0,
      totalBets: totalBets.count || 0,
      totalVolume: totalVolumeAmount,
      totalUsers: uniqueUsers,
      activeRaces: activeRaces.length,
      onlineUsers: onlineUsers,
      averageBetSize: totalBets.count > 0 ? totalVolumeAmount / totalBets.count : 0,
      racesPerHour: timeRange === '1h' ? totalRaces.count : totalRaces.count / (timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720)
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error getting platform statistics:', error);
    res.status(500).json({ error: 'Failed to get platform statistics' });
  }
});

// Get race statistics
router.get('/races', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    // Get race statistics
    const { data: races, error } = await db.getSupabaseAdmin()
      .from('races')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    // Calculate race statistics
    const stats = {
      totalRaces: races.length,
      completedRaces: races.filter(race => race.status === 'completed').length,
      activeRaces: races.filter(race => ['waiting', 'countdown', 'racing', 'settling'].includes(race.status)).length,
      totalVolume: races.reduce((sum, race) => sum + (race.total_pot || 0), 0),
      averagePot: 0,
      racerWins: {},
      hourlyDistribution: {},
      dailyDistribution: {}
    };

    if (stats.totalRaces > 0) {
      stats.averagePot = stats.totalVolume / stats.totalRaces;
    }

    // Calculate racer win distribution
    races.forEach(race => {
      if (race.winner) {
        if (!stats.racerWins[race.winner]) {
          stats.racerWins[race.winner] = 0;
        }
        stats.racerWins[race.winner]++;
      }

      // Calculate hourly distribution
      const hour = new Date(race.created_at).getHours();
      if (!stats.hourlyDistribution[hour]) {
        stats.hourlyDistribution[hour] = 0;
      }
      stats.hourlyDistribution[hour]++;

      // Calculate daily distribution
      const day = new Date(race.created_at).getDay();
      if (!stats.dailyDistribution[day]) {
        stats.dailyDistribution[day] = 0;
      }
      stats.dailyDistribution[day]++;
    });

    res.json(stats);
  } catch (error) {
    logger.error('Error getting race statistics:', error);
    res.status(500).json({ error: 'Failed to get race statistics' });
  }
});

// Get betting statistics
router.get('/betting', async (req, res) => {
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

    // Get betting statistics
    const { data: bets, error } = await db.getSupabaseAdmin()
      .from('bets')
      .select('*')
      .gte('created_at', startTime.toISOString());

    if (error) throw error;

    // Calculate betting statistics
    const stats = {
      timeRange: timeRange,
      totalBets: bets.length,
      totalVolume: bets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0),
      averageBet: 0,
      uniqueUsers: new Set(bets.map(bet => bet.user_id)).size,
      racerDistribution: {},
      hourlyVolume: {},
      betSizeDistribution: {
        small: 0,    // < 1 SOL
        medium: 0,   // 1-5 SOL
        large: 0,    // 5-10 SOL
        whale: 0     // > 10 SOL
      }
    };

    if (stats.totalBets > 0) {
      stats.averageBet = stats.totalVolume / stats.totalBets;
    }

    // Calculate distributions
    bets.forEach(bet => {
      const amount = parseFloat(bet.amount);

      // Racer distribution
      if (!stats.racerDistribution[bet.racer_id]) {
        stats.racerDistribution[bet.racer_id] = 0;
      }
      stats.racerDistribution[bet.racer_id] += amount;

      // Hourly volume
      const hour = new Date(bet.created_at).getHours();
      if (!stats.hourlyVolume[hour]) {
        stats.hourlyVolume[hour] = 0;
      }
      stats.hourlyVolume[hour] += amount;

      // Bet size distribution
      if (amount < 1) {
        stats.betSizeDistribution.small++;
      } else if (amount < 5) {
        stats.betSizeDistribution.medium++;
      } else if (amount < 10) {
        stats.betSizeDistribution.large++;
      } else {
        stats.betSizeDistribution.whale++;
      }
    });

    res.json(stats);
  } catch (error) {
    logger.error('Error getting betting statistics:', error);
    res.status(500).json({ error: 'Failed to get betting statistics' });
  }
});

// Get user statistics
router.get('/users', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    // Get user statistics
    const { data: users, error } = await db.getSupabaseAdmin()
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    // Calculate user statistics
    const stats = {
      totalUsers: users.length,
      usersWithWallets: users.filter(user => user.wallet_address).length,
      newUsersToday: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0,
      registrationTrend: {},
      walletDistribution: {}
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    users.forEach(user => {
      const createdAt = new Date(user.created_at);

      // Count new users
      if (createdAt >= today) {
        stats.newUsersToday++;
      }
      if (createdAt >= weekAgo) {
        stats.newUsersThisWeek++;
      }
      if (createdAt >= monthAgo) {
        stats.newUsersThisMonth++;
      }

      // Registration trend (by day)
      const day = createdAt.toISOString().split('T')[0];
      if (!stats.registrationTrend[day]) {
        stats.registrationTrend[day] = 0;
      }
      stats.registrationTrend[day]++;

      // Wallet distribution (first few characters)
      if (user.wallet_address) {
        const walletPrefix = user.wallet_address.substring(0, 4);
        if (!stats.walletDistribution[walletPrefix]) {
          stats.walletDistribution[walletPrefix] = 0;
        }
        stats.walletDistribution[walletPrefix]++;
      }
    });

    res.json(stats);
  } catch (error) {
    logger.error('Error getting user statistics:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'profit', limit = 100 } = req.query;

    let leaderboard;

    switch (type) {
      case 'profit':
        leaderboard = await db.getLeaderboard(parseInt(limit));
        break;
      case 'volume':
        // Get users sorted by total wagered
        const { data: users, error } = await db.getSupabaseAdmin()
          .from('users')
          .select('*')
          .order('total_wagered', { ascending: false })
          .limit(parseInt(limit));
        
        if (error) throw error;
        leaderboard = users;
        break;
      case 'wins':
        // Get users sorted by win rate
        const { data: winUsers, error: winError } = await db.getSupabaseAdmin()
          .from('users')
          .select('*')
          .order('win_rate', { ascending: false })
          .limit(parseInt(limit));
        
        if (winError) throw winError;
        leaderboard = winUsers;
        break;
      default:
        leaderboard = await db.getLeaderboard(parseInt(limit));
    }

    res.json({
      type: type,
      leaderboard: leaderboard,
      total: leaderboard.length,
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get real-time statistics
router.get('/realtime', async (req, res) => {
  try {
    const [
      onlineUsers,
      activeRaces,
      totalPot
    ] = await Promise.all([
      gameRedis.getOnlineUserCount(),
      db.getActiveRaces(),
      // Calculate total pot from active races
      db.getActiveRaces().then(races => 
        races.reduce((sum, race) => sum + (race.total_pot || 0), 0)
      )
    ]);

    const realtimeStats = {
      onlineUsers: onlineUsers,
      activeRaces: activeRaces.length,
      totalPot: totalPot,
      timestamp: Date.now()
    };

    res.json(realtimeStats);
  } catch (error) {
    logger.error('Error getting real-time statistics:', error);
    res.status(500).json({ error: 'Failed to get real-time statistics' });
  }
});

module.exports = router;
