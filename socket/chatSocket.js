const { getRedis } = require('../services/redis');

function initializeChatSocket(io) {
  io.on('connection', (socket) => {
    console.log('✅ Chat socket connected:', socket.id);
    
    // Note: Chat messages are handled via HTTP POST /api/chat, not via socket events
    
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
