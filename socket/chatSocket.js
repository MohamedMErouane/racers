const { verifyPrivyToken } = require('../lib/privy');
const sanitizeHtml = require('sanitize-html');
const { z } = require('zod');
const { getRedis } = require('../services/redis');

// Validation schema for chat messages
const chatMessageSchema = z.object({
  message: z.string().min(1).max(500),
  token: z.string().min(1)
});

function initializeChatSocket(io) {
  io.on('connection', (socket) => {
    console.log('✅ Chat socket connected:', socket.id);
    
    // Listen for chat messages
    socket.on('chat:message', async (data) => {
      try {
        // Validate data structure using Zod schema
        const validationResult = chatMessageSchema.safeParse(data);
        if (!validationResult.success) {
          socket.emit('error', { message: 'Invalid message format or length' });
          return;
        }
        
        // Rate limiting: max 10 messages per minute per socket using Redis
        const redis = getRedis();
        const now = Date.now();
        const socketId = socket.id;
        const rateLimitKey = `chat_rate_limit:${socketId}`;
        
        try {
          if (redis) {
            // Get current timestamps from Redis
            const timestamps = await redis.lrange(rateLimitKey, 0, -1);
            
            // Remove timestamps older than 1 minute
            const recentTimestamps = timestamps.filter(ts => now - parseInt(ts) < 60000);
            
            if (recentTimestamps.length >= 10) {
              socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
              return;
            }
            
            // Add current timestamp to Redis list
            await redis.lpush(rateLimitKey, now.toString());
            await redis.expire(rateLimitKey, 60); // Expire after 1 minute
          }
        } catch (error) {
          console.error('Redis rate limiting error:', error);
          // Fallback: allow message if Redis is unavailable
        }
        
        // Verify Privy JWT token
        const payload = await verifyPrivyToken(validationResult.data.token);
        
        // Generate username from email or use address as fallback
        let username = 'Anonymous';
        if (payload.email) {
          username = payload.email.split('@')[0]; // Use email prefix as username
        } else if (payload.address) {
          username = `User_${payload.address.slice(0, 8)}`; // Use first 8 chars of address
        }
        
        // Sanitize message content
        const sanitizedMessage = sanitizeHtml(validationResult.data.message, {
          allowedTags: [],
          allowedAttributes: {}
        });
        
        // Create sanitized message object
        const message = {
          message: sanitizedMessage,
          username: username,
          userId: payload.address,
          timestamp: Date.now()
        };
        
        // Persist message to Redis
        const { redis } = require('../server/db');
        await redis.addChatMessage(message);
        
        // Broadcast to all clients (excluding sender to avoid duplicates)
        socket.broadcast.emit('chat:message', message);
        
        console.log('📨 Chat message broadcasted:', message.username, message.message);
      } catch (error) {
        console.error('Error handling chat message:', error);
        socket.emit('error', { message: 'Authentication failed or invalid message' });
      }
    });
    
    socket.on('disconnect', async () => {
      console.log('❌ Chat socket disconnected:', socket.id);
      // Clean up rate limiting data for disconnected socket
      try {
        const redis = getRedis();
        if (redis) {
          const rateLimitKey = `chat_rate_limit:${socket.id}`;
          await redis.del(rateLimitKey);
        }
      } catch (error) {
        console.error('Error cleaning up rate limit key:', error);
      }
    });
  });
  
  console.log('✅ Chat socket handlers initialized');
}

module.exports = {
  initializeChatSocket
};
