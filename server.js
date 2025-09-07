const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import custom modules
const { initializeRedis } = require('./services/redis');
const { initializeSentry } = require('./services/sentry');
const { initializePrivy } = require('./services/privy');

// Import socket handlers
const { initializeChatSocket } = require('./socket/chatSocket');

// Import game engine
const gameEngine = require('./server/gameEngine');

// Import API routes
const apiRoutes = require('./routes/api');

// Import database
const { initializeTables } = require('./server/db');

// Import Solana service
const { initializeSolana } = require('./server/solana');

const app = express();
const server = http.createServer(app);

// Initialize Sentry first
initializeSentry(app);

// Parse Solana RPC URL for CSP
function getSolanaRpcOrigin() {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) return null;
  
  try {
    const url = new URL(rpcUrl);
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    console.warn('Invalid SOLANA_RPC_URL format:', rpcUrl);
    return null;
  }
}

// Security middleware
const connectSrc = [
  "'self'", 
  "https://api.privy.io", 
  "https://auth.privy.io", 
  "https://api.mainnet-beta.solana.com", 
  "https://api.devnet.solana.com"
];

// Add WebSocket connections based on environment variables
function getWebSocketOrigins() {
  const origins = [];
  
  // Add CORS_ORIGIN WebSocket connections
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    corsOrigin.split(',').forEach(origin => {
      origin = origin.trim();
      if (origin.startsWith('http://')) {
        origins.push(origin.replace('http://', 'ws://'));
      } else if (origin.startsWith('https://')) {
        origins.push(origin.replace('https://', 'wss://'));
      }
    });
  }
  
  // Add SOLANA_WS_URL if configured
  const solanaWsUrl = process.env.SOLANA_WS_URL;
  if (solanaWsUrl) {
    origins.push(solanaWsUrl);
  }
  
  return origins;
}

// Add WebSocket origins to connectSrc
connectSrc.push(...getWebSocketOrigins());

// Add custom Solana RPC URL to CSP if configured
const solanaRpcOrigin = getSolanaRpcOrigin();
if (solanaRpcOrigin) {
  connectSrc.push(solanaRpcOrigin);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: connectSrc,
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://auth.privy.io", "https://cdn.socket.io", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'https://racers.fun'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api', apiRoutes);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'https://racers.fun'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize services
async function initializeServices() {
  try {
    console.log('🚀 Initializing services...');
    
    // Initialize Redis
    await initializeRedis();
    console.log('✅ Redis connected');
    
    
    // Initialize Solana
    await initializeSolana();
    console.log('✅ Solana connected');
    
    // Initialize Privy
    const { initPrivy } = require('./lib/privy');
    initPrivy();
    console.log('✅ Privy initialized');
    
    // Initialize database tables
    await initializeTables();
    console.log('✅ Database tables initialized');
    
    // Initialize Socket handlers
    initializeChatSocket(io);
    
    // Handle race state requests
    io.on('connection', (socket) => {
      socket.on('race:state', () => {
        const state = gameEngine.getState();
        socket.emit('race:state', state);
      });
    });
    
    console.log('✅ Socket handlers initialized');
    
    // Initialize Game Engine
    app.set('gameEngine', gameEngine);
    app.set('io', io);
    console.log('✅ Game engine initialized');
    
    // Start the race engine
    gameEngine.startRace(io);
    console.log('✅ Race engine started');
    
    console.log('🎉 All services initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  await initializeServices();
  
  server.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on ${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || 'https://racers.fun'}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer().catch(console.error);

module.exports = { app, server, io };
