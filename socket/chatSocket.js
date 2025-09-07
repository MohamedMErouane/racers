function initializeChatSocket(io) {
  io.on('connection', (socket) => {
    console.log('✅ Chat socket connected:', socket.id);
    
    // Listen for chat messages
    socket.on('chat:message', async (message) => {
      try {
        // Validate message structure
        if (!message || typeof message.message !== 'string' || !message.userId || !message.username) {
          socket.emit('error', { message: 'Invalid message format' });
          return;
        }
        
        // Broadcast to all clients
        io.emit('chat:message', message);
        
        // Persist message via API (optional - could be done by the sender)
        console.log('📨 Chat message broadcasted:', message.username, message.message);
      } catch (error) {
        console.error('Error handling chat message:', error);
        socket.emit('error', { message: 'Failed to process message' });
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
