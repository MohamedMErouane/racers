const { verifyPrivyToken } = require('../lib/privy');
const sanitizeHtml = require('sanitize-html');

function initializeChatSocket(io) {
  io.on('connection', (socket) => {
    console.log('✅ Chat socket connected:', socket.id);
    
    // Listen for chat messages
    socket.on('chat:message', async (data) => {
      try {
        // Validate data structure
        if (!data || !data.message || !data.token) {
          socket.emit('error', { message: 'Invalid message format' });
          return;
        }
        
        // Verify Privy JWT token
        const payload = await verifyPrivyToken(data.token);
        
        // Sanitize message content
        const sanitizedMessage = sanitizeHtml(data.message, {
          allowedTags: [],
          allowedAttributes: {}
        });
        
        const sanitizedUsername = sanitizeHtml(data.username || 'Anonymous', {
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
    });
  });
  
  console.log('✅ Chat socket handlers initialized');
}

module.exports = {
  initializeChatSocket
};
