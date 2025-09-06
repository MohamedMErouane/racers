const { db } = require('../services/supabase');
const { gameRedis } = require('../services/redis');
const logger = require('../services/logger');

function initializeChatSocket(io) {
  // Chat-specific socket handlers
  io.of('/chat').on('connection', async (socket) => {
    const userId = socket.userId;
    const user = socket.user;

    logger.info(`💬 User ${userId} connected to chat`);

    // Join user to their personal chat room
    socket.join(`chat:user:${userId}`);

    // Handle joining race chat
    socket.on('join_race_chat', async (data) => {
      try {
        const { raceId } = data;
        
        // Verify race exists
        const race = await db.getRace(raceId);
        if (!race) {
          socket.emit('error', { message: 'Race not found' });
          return;
        }

        // Join race chat room
        socket.join(`chat:race:${raceId}`);

        // Send chat history
        const chatHistory = await gameRedis.getChatHistory(raceId, 50);
        socket.emit('chat_history', {
          raceId: raceId,
          messages: chatHistory
        });

        // Notify other users
        socket.to(`chat:race:${raceId}`).emit('user_joined_chat', {
          userId: userId,
          username: user.username || `user_${userId.slice(0, 8)}`,
          timestamp: Date.now()
        });

        logger.info(`💬 User ${userId} joined race chat ${raceId}`);
      } catch (error) {
        logger.error('Error joining race chat:', error);
        socket.emit('error', { message: 'Failed to join race chat' });
      }
    });

    // Handle leaving race chat
    socket.on('leave_race_chat', async (data) => {
      try {
        const { raceId } = data;
        
        // Leave race chat room
        socket.leave(`chat:race:${raceId}`);

        // Notify other users
        socket.to(`chat:race:${raceId}`).emit('user_left_chat', {
          userId: userId,
          timestamp: Date.now()
        });

        logger.info(`💬 User ${userId} left race chat ${raceId}`);
      } catch (error) {
        logger.error('Error leaving race chat:', error);
        socket.emit('error', { message: 'Failed to leave race chat' });
      }
    });

    // Handle sending chat message
    socket.on('send_message', async (data) => {
      try {
        const { raceId, message, type = 'text' } = data;

        // Validate input
        if (!raceId || !message) {
          socket.emit('error', { message: 'Race ID and message are required' });
          return;
        }

        if (message.length > 200) {
          socket.emit('error', { message: 'Message too long (max 200 characters)' });
          return;
        }

        if (message.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        // Get user info
        const user = await db.getUser(userId);
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Check if race exists and is active
        const race = await db.getRace(raceId);
        if (!race) {
          socket.emit('error', { message: 'Race not found' });
          return;
        }

        if (!['waiting', 'countdown', 'racing', 'settling'].includes(race.status)) {
          socket.emit('error', { message: 'Cannot send messages to inactive race' });
          return;
        }

        // Check chat cooldown
        const lastMessageKey = `chat_cooldown:${userId}`;
        const lastMessageTime = await gameRedis.get(lastMessageKey);
        const cooldownPeriod = 2000; // 2 seconds

        if (lastMessageTime && Date.now() - parseInt(lastMessageTime) < cooldownPeriod) {
          const remainingTime = cooldownPeriod - (Date.now() - parseInt(lastMessageTime));
          socket.emit('error', { 
            message: 'Message cooldown active', 
            remainingTime: Math.ceil(remainingTime / 1000)
          });
          return;
        }

        // Create message data
        const messageData = {
          id: `msg_${raceId}_${userId}_${Date.now()}`,
          race_id: raceId,
          user_id: userId,
          username: user.username,
          message: message.trim(),
          type: type,
          created_at: new Date().toISOString(),
          timestamp: Date.now()
        };

        // Store message in database
        const chatMessage = await db.createChatMessage(messageData);

        // Store message in Redis
        await gameRedis.addChatMessage(raceId, messageData);

        // Set cooldown
        await gameRedis.set(lastMessageKey, Date.now().toString(), { expire: 5 });

        // Broadcast message to all users in race chat
        io.of('/chat').to(`chat:race:${raceId}`).emit('new_message', {
          message: {
            id: chatMessage.id,
            userId: userId,
            username: user.username,
            message: message.trim(),
            type: type,
            timestamp: Date.now(),
            createdAt: chatMessage.created_at
          }
        });

        // Send confirmation to sender
        socket.emit('message_sent', {
          messageId: chatMessage.id,
          timestamp: Date.now()
        });

        logger.info(`💬 Chat message: ${user.username} in race ${raceId}: ${message}`);
      } catch (error) {
        logger.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing_start', (data) => {
      const { raceId } = data;
      socket.to(`chat:race:${raceId}`).emit('user_typing', {
        userId: userId,
        username: user.username || `user_${userId.slice(0, 8)}`,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { raceId } = data;
      socket.to(`chat:race:${raceId}`).emit('user_typing', {
        userId: userId,
        username: user.username || `user_${userId.slice(0, 8)}`,
        isTyping: false
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`💬 User ${userId} disconnected from chat: ${reason}`);
      
      // Leave all chat rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room.startsWith('chat:race:')) {
          socket.leave(room);
          // Notify other users
          socket.to(room).emit('user_left_chat', {
            userId: userId,
            timestamp: Date.now()
          });
        }
      });
    });

    // Send initial connection confirmation
    socket.emit('chat_connected', {
      userId: userId,
      timestamp: Date.now()
    });
  });

  // Chat broadcasting functions
  async function broadcastChatMessage(raceId, message) {
    try {
      io.of('/chat').to(`chat:race:${raceId}`).emit('new_message', {
        message: message,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error broadcasting chat message:', error);
    }
  }

  async function broadcastSystemMessage(raceId, message, type = 'info') {
    try {
      const systemMessage = {
        id: `system_${raceId}_${Date.now()}`,
        userId: 'system',
        username: 'System',
        message: message,
        type: 'system',
        systemType: type,
        timestamp: Date.now()
      };

      // Store system message in Redis
      await gameRedis.addChatMessage(raceId, systemMessage);

      // Broadcast to all users in race chat
      io.of('/chat').to(`chat:race:${raceId}`).emit('new_message', {
        message: systemMessage,
        timestamp: Date.now()
      });

      logger.info(`💬 System message in race ${raceId}: ${message}`);
    } catch (error) {
      logger.error('Error broadcasting system message:', error);
    }
  }

  async function broadcastRaceEvent(raceId, event, data) {
    try {
      let message;
      let type = 'info';

      switch (event) {
        case 'race_started':
          message = '🏁 Race has started! Good luck to all racers!';
          type = 'success';
          break;
        case 'race_ended':
          message = `🏆 Race finished! Winner: ${data.winner}`;
          type = 'success';
          break;
        case 'bet_placed':
          message = `💰 ${data.username} bet ${data.amount} SOL on ${data.racerName}`;
          type = 'info';
          break;
        case 'countdown':
          if (data.countdown <= 3) {
            message = `⏰ Race starting in ${data.countdown} seconds!`;
            type = 'warning';
          }
          break;
        default:
          message = `📢 ${event}: ${JSON.stringify(data)}`;
      }

      if (message) {
        await broadcastSystemMessage(raceId, message, type);
      }
    } catch (error) {
      logger.error('Error broadcasting race event:', error);
    }
  }

  // Export functions for use by other modules
  return {
    broadcastChatMessage,
    broadcastSystemMessage,
    broadcastRaceEvent
  };
}

module.exports = {
  initializeChatSocket
};
