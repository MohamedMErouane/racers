const { verifyPrivyToken } = require('../lib/privy');
const sanitizeHtml = require('sanitize-html');
const { z } = require('zod');

// Rate limiting storage (in production, use Redis)
const messageTimestamps = new Map();

// Validation schema for chat messages
const chatMessageSchema = z.object({
  message: z.string().min(1).max(500),
  username: z.string().min(1).max(50),
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
        
        // Rate limiting: max 10 messages per minute per socket
        const now = Date.now();
        const socketId = socket.id;
        const timestamps = messageTimestamps.get(socketId) || [];
        
        // Remove timestamps older than 1 minute
        const recentTimestamps = timestamps.filter(ts => now - ts < 60000);
        
        if (recentTimestamps.length >= 10) {
          socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
          return;
        }
        
        // Add current timestamp
        recentTimestamps.push(now);
        messageTimestamps.set(socketId, recentTimestamps);
        
        // Verify Privy JWT token
        const payload = await verifyPrivyToken(validationResult.data.token);
        
        // Sanitize message content
        const sanitizedMessage = sanitizeHtml(validationResult.data.message, {
          allowedTags: [],
          allowedAttributes: {}
        });
        
        const sanitizedUsername = sanitizeHtml(validationResult.data.username || 'Anonymous', {
          allowedTags: [],
          allowedAttributes: {}
        });
        
        // Create sanitized message object
        const message = {
          message: sanitizedMessage,
          username: sanitizedUsername,
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
    
    socket.on('disconnect', () => {
      console.log('❌ Chat socket disconnected:', socket.id);
      // Clean up rate limiting data for disconnected socket
      messageTimestamps.delete(socket.id);
    });
  });
  
  console.log('✅ Chat socket handlers initialized');
}

module.exports = {
  initializeChatSocket
};
