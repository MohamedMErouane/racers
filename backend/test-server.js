const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString()
  });
});

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  
  socket.emit('connected', {
    message: 'Connected to Racers.fun backend!',
    timestamp: new Date().toISOString()
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
  
  socket.on('test', (data) => {
    console.log('📨 Test message received:', data);
    socket.emit('test_response', {
      message: 'Test response from server',
      data: data,
      timestamp: new Date().toISOString()
    });
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Test server running on ${HOST}:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Test API: http://localhost:${PORT}/api/test`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});
