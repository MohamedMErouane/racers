const express = require('express');
const { authMiddleware } = require('../services/privy');
const { db } = require('../services/supabase');
const { gameRedis } = require('../services/redis');
const logger = require('../services/logger');

const router = express.Router();

// Send a chat message
router.post('/send', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { raceId, message, type = 'text' } = req.body;

    // Validate input
    if (!raceId || !message) {
      return res.status(400).json({ error: 'Race ID and message are required' });
    }

    if (message.length > 200) {
      return res.status(400).json({ error: 'Message too long (max 200 characters)' });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Get user info
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if race exists
    const race = await db.getRace(raceId);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    // Check if race is active
    if (!['waiting', 'countdown', 'racing', 'settling'].includes(race.status)) {
      return res.status(400).json({ error: 'Cannot send messages to inactive race' });
    }

    // Check chat cooldown (prevent spam)
    const lastMessageKey = `chat_cooldown:${userId}`;
    const lastMessageTime = await gameRedis.get(lastMessageKey);
    const cooldownPeriod = 2000; // 2 seconds

    if (lastMessageTime && Date.now() - parseInt(lastMessageTime) < cooldownPeriod) {
      const remainingTime = cooldownPeriod - (Date.now() - parseInt(lastMessageTime));
      return res.status(429).json({ 
        error: 'Message cooldown active', 
        remainingTime: Math.ceil(remainingTime / 1000)
      });
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

    // Store message in Redis for real-time access
    await gameRedis.addChatMessage(raceId, messageData);

    // Set cooldown
    await gameRedis.set(lastMessageKey, Date.now().toString(), { expire: 5 });

    // Publish message to Redis pub/sub
    await gameRedis.publish(`race:${raceId}:chat`, {
      type: 'new_message',
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

    logger.info(`💬 Chat message: ${user.username} in race ${raceId}: ${message}`);

    res.json({
      message: 'Message sent successfully',
      chatMessage: {
        id: chatMessage.id,
        username: user.username,
        message: message.trim(),
        type: type,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logger.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get chat history for a race
router.get('/history/:raceId', async (req, res) => {
  try {
    const { raceId } = req.params;
    const { limit = 50 } = req.query;

    // Check if race exists
    const race = await db.getRace(raceId);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    // Get chat history from Redis (faster) or database (fallback)
    let chatHistory;
    try {
      chatHistory = await gameRedis.getChatHistory(raceId, parseInt(limit));
    } catch (error) {
      logger.warn('Failed to get chat from Redis, falling back to database:', error);
      chatHistory = await db.getChatHistory(raceId, parseInt(limit));
    }

    res.json({
      raceId: raceId,
      messages: chatHistory,
      total: chatHistory.length,
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Get recent chat messages across all races
router.get('/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent messages from database
    const { data: messages, error } = await db.getSupabaseAdmin()
      .from('chat_messages')
      .select(`
        *,
        races (
          id,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      messages: messages,
      total: messages.length,
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error getting recent chat messages:', error);
    res.status(500).json({ error: 'Failed to get recent messages' });
  }
});

// Get user's chat statistics
router.get('/stats', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
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

    // Get user's chat statistics
    const { data: messages, error } = await db.getSupabaseAdmin()
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startTime.toISOString());

    if (error) throw error;

    const stats = {
      totalMessages: messages.length,
      averageMessageLength: 0,
      mostActiveHour: 0,
      hourlyActivity: {},
      raceActivity: {}
    };

    if (messages.length > 0) {
      // Calculate average message length
      const totalLength = messages.reduce((sum, msg) => sum + msg.message.length, 0);
      stats.averageMessageLength = totalLength / messages.length;

      // Calculate hourly activity
      messages.forEach(msg => {
        const hour = new Date(msg.created_at).getHours();
        if (!stats.hourlyActivity[hour]) {
          stats.hourlyActivity[hour] = 0;
        }
        stats.hourlyActivity[hour]++;
      });

      // Find most active hour
      stats.mostActiveHour = Object.keys(stats.hourlyActivity).reduce((a, b) => 
        stats.hourlyActivity[a] > stats.hourlyActivity[b] ? a : b
      );

      // Calculate race activity
      messages.forEach(msg => {
        if (!stats.raceActivity[msg.race_id]) {
          stats.raceActivity[msg.race_id] = 0;
        }
        stats.raceActivity[msg.race_id]++;
      });
    }

    res.json({
      timeRange: timeRange,
      stats: stats
    });
  } catch (error) {
    logger.error('Error getting chat statistics:', error);
    res.status(500).json({ error: 'Failed to get chat statistics' });
  }
});

// Delete a chat message (admin only or own message)
router.delete('/message/:messageId', authMiddleware.verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;

    // Get message from database
    const { data: message, error } = await db.getSupabaseAdmin()
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (error) throw error;
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user can delete this message (own message or admin)
    if (message.user_id !== userId) {
      // In a real implementation, check if user is admin
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Delete message from database
    const { error: deleteError } = await db.getSupabaseAdmin()
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) throw deleteError;

    // Publish message deletion to Redis
    await gameRedis.publish(`race:${message.race_id}:chat`, {
      type: 'message_deleted',
      messageId: messageId,
      userId: userId
    });

    logger.info(`🗑️ Chat message deleted: ${messageId} by user ${userId}`);

    res.json({
      message: 'Message deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting chat message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Get online users count
router.get('/online', async (req, res) => {
  try {
    const onlineCount = await gameRedis.getOnlineUserCount();
    
    res.json({
      onlineUsers: onlineCount
    });
  } catch (error) {
    logger.error('Error getting online users count:', error);
    res.status(500).json({ error: 'Failed to get online users count' });
  }
});

module.exports = router;
