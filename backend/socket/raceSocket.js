const { authMiddleware } = require('../services/privy');
const { db } = require('../services/supabase');
const { gameRedis } = require('../services/redis');
const logger = require('../services/logger');

function initializeSocketHandlers(io) {
  // Authentication middleware for Socket.IO (allow unauthenticated connections)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        // Verify token using Privy if provided
        const { privy } = require('../services/privy');
        const user = await privy.verifyToken(token);
        socket.userId = user.id;
        socket.user = user;
        socket.isAuthenticated = true;
      } else {
        // Allow unauthenticated connections for initial setup
        socket.userId = null;
        socket.user = null;
        socket.isAuthenticated = false;
      }
      
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      // Allow connection even if auth fails
      socket.userId = null;
      socket.user = null;
      socket.isAuthenticated = false;
      next();
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    const user = socket.user;
    const isAuthenticated = socket.isAuthenticated;

    logger.info(`🔌 User ${userId || 'anonymous'} connected via WebSocket (auth: ${isAuthenticated})`);

    // Add user to online users only if authenticated
    if (isAuthenticated && userId) {
      await gameRedis.addOnlineUser(userId);
    }

    // Join user to their personal room only if authenticated
    if (isAuthenticated && userId) {
      socket.join(`user:${userId}`);
    }

    // Get current race and join if active
    try {
      const activeRaces = await db.getActiveRaces();
      if (activeRaces.length > 0) {
        const currentRace = activeRaces[0];
        await joinRace(socket, currentRace.id);
      }
    } catch (error) {
      logger.error('Error joining current race:', error);
    }

    // Send initial connection confirmation
    socket.emit('connected', {
      message: 'Connected to Racers.fun!',
      isAuthenticated: isAuthenticated,
      timestamp: Date.now()
    });

    // Handle race joining
    socket.on('join_race', async (data) => {
      try {
        const { raceId } = data;
        await joinRace(socket, raceId);
      } catch (error) {
        logger.error('Error joining race:', error);
        socket.emit('error', { message: 'Failed to join race' });
      }
    });

    // Handle race leaving
    socket.on('leave_race', async (data) => {
      try {
        const { raceId } = data;
        await leaveRace(socket, raceId);
      } catch (error) {
        logger.error('Error leaving race:', error);
        socket.emit('error', { message: 'Failed to leave race' });
      }
    });

    // Handle bet placement
    socket.on('place_bet', async (data) => {
      try {
        const { raceId, racerId, amount } = data;
        await placeBet(socket, raceId, racerId, amount);
      } catch (error) {
        logger.error('Error placing bet:', error);
        socket.emit('error', { message: 'Failed to place bet' });
      }
    });

    // Handle race state requests
    socket.on('get_race_state', async (data) => {
      try {
        const { raceId } = data;
        await sendRaceState(socket, raceId);
      } catch (error) {
        logger.error('Error getting race state:', error);
        socket.emit('error', { message: 'Failed to get race state' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      logger.info(`🔌 User ${userId} disconnected: ${reason}`);
      
      // Remove user from online users
      await gameRedis.removeOnlineUser(userId);
      
      // Leave all race rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room.startsWith('race:')) {
          socket.leave(room);
        }
      });
    });

    // Send initial connection confirmation
    socket.emit('connected', {
      userId: userId,
      timestamp: Date.now()
    });
  });

  // Helper functions
  async function joinRace(socket, raceId) {
    try {
      const race = await db.getRace(raceId);
      if (!race) {
        socket.emit('error', { message: 'Race not found' });
        return;
      }

      // Join race room
      socket.join(`race:${raceId}`);

      // Add user to race participants in Redis
      const raceState = await gameRedis.getRaceState(raceId);
      if (!raceState) {
        await gameRedis.setRaceState(raceId, {
          participants: [socket.userId],
          phase: 'waiting',
          countdown: 0
        });
      } else {
        if (!raceState.participants) {
          raceState.participants = [];
        }
        if (!raceState.participants.includes(socket.userId)) {
          raceState.participants.push(socket.userId);
          await gameRedis.setRaceState(raceId, raceState);
        }
      }

      // Send current race state
      await sendRaceState(socket, raceId);

      // Notify other users
      socket.to(`race:${raceId}`).emit('user_joined', {
        userId: socket.userId,
        username: socket.user.username || `user_${socket.userId.slice(0, 8)}`,
        timestamp: Date.now()
      });

      logger.info(`🏁 User ${socket.userId} joined race ${raceId}`);
    } catch (error) {
      logger.error('Error in joinRace:', error);
      throw error;
    }
  }

  async function leaveRace(socket, raceId) {
    try {
      // Leave race room
      socket.leave(`race:${raceId}`);

      // Remove user from race participants in Redis
      const raceState = await gameRedis.getRaceState(raceId);
      if (raceState && raceState.participants) {
        raceState.participants = raceState.participants.filter(id => id !== socket.userId);
        await gameRedis.setRaceState(raceId, raceState);
      }

      // Notify other users
      socket.to(`race:${raceId}`).emit('user_left', {
        userId: socket.userId,
        timestamp: Date.now()
      });

      logger.info(`🏁 User ${socket.userId} left race ${raceId}`);
    } catch (error) {
      logger.error('Error in leaveRace:', error);
      throw error;
    }
  }

  async function placeBet(socket, raceId, racerId, amount) {
    try {
      // Validate input
      if (!raceId || !racerId || !amount) {
        socket.emit('error', { message: 'Race ID, racer ID, and amount are required' });
        return;
      }

      if (amount <= 0 || amount > 100) {
        socket.emit('error', { message: 'Bet amount must be between 0.1 and 100 SOL' });
        return;
      }

      // Check if user already has a bet
      const existingBets = await gameRedis.getBets(raceId);
      if (existingBets[socket.userId]) {
        socket.emit('error', { message: 'You already have a bet in this race' });
        return;
      }

      // Get user info
      const user = await db.getUser(socket.userId);
      if (!user || !user.wallet_address) {
        socket.emit('error', { message: 'Wallet not connected' });
        return;
      }

      // Create bet data
      const betData = {
        id: `bet_${raceId}_${socket.userId}_${Date.now()}`,
        race_id: raceId,
        user_id: socket.userId,
        racer_id: racerId,
        amount: amount,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Store bet in database
      const bet = await db.createBet(betData);

      // Store bet in Redis
      await gameRedis.addBet(raceId, socket.userId, {
        id: bet.id,
        racerId: racerId,
        amount: amount,
        timestamp: Date.now()
      });

      // Update race total pot
      const race = await db.getRace(raceId);
      const newPot = (race.total_pot || 0) + amount;
      await db.updateRace(raceId, {
        total_pot: newPot,
        total_bets: (race.total_bets || 0) + 1
      });

      // Broadcast bet to all users in race
      io.to(`race:${raceId}`).emit('bet_placed', {
        userId: socket.userId,
        username: user.username,
        racerId: racerId,
        amount: amount,
        totalPot: newPot,
        timestamp: Date.now()
      });

      // Send confirmation to user
      socket.emit('bet_confirmed', {
        betId: bet.id,
        raceId: raceId,
        racerId: racerId,
        amount: amount,
        totalPot: newPot
      });

      logger.info(`💰 Bet placed via WebSocket: ${amount} SOL on racer ${racerId} by user ${socket.userId} in race ${raceId}`);
    } catch (error) {
      logger.error('Error in placeBet:', error);
      throw error;
    }
  }

  async function sendRaceState(socket, raceId) {
    try {
      const race = await db.getRace(raceId);
      if (!race) {
        socket.emit('error', { message: 'Race not found' });
        return;
      }

      // Get race state from Redis
      const raceState = await gameRedis.getRaceState(raceId);
      
      // Get bets for this race
      const bets = await gameRedis.getBets(raceId);
      
      // Get chat history
      const chatHistory = await gameRedis.getChatHistory(raceId, 20);

      const state = {
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
          participants: raceState?.participants || []
        },
        bets: bets,
        chatHistory: chatHistory
      };

      socket.emit('race_state', state);
    } catch (error) {
      logger.error('Error in sendRaceState:', error);
      throw error;
    }
  }

  // Race state broadcasting functions
  async function broadcastRaceUpdate(raceId, update) {
    try {
      io.to(`race:${raceId}`).emit('race_update', {
        ...update,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error broadcasting race update:', error);
    }
  }

  async function broadcastRaceStart(raceId, raceData) {
    try {
      io.to(`race:${raceId}`).emit('race_started', {
        raceId: raceId,
        raceData: raceData,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error broadcasting race start:', error);
    }
  }

  async function broadcastRaceEnd(raceId, winner, results) {
    try {
      io.to(`race:${raceId}`).emit('race_ended', {
        raceId: raceId,
        winner: winner,
        results: results,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error broadcasting race end:', error);
    }
  }

  async function broadcastCountdown(raceId, countdown) {
    try {
      io.to(`race:${raceId}`).emit('countdown', {
        raceId: raceId,
        countdown: countdown,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error broadcasting countdown:', error);
    }
  }

  // Export functions for use by game engine
  return {
    broadcastRaceUpdate,
    broadcastRaceStart,
    broadcastRaceEnd,
    broadcastCountdown
  };
}

module.exports = {
  initializeSocketHandlers
};
