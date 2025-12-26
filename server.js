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
const logger = require('./services/logger');
const { initializeSentry } = require('./services/sentry');

// Import socket handlers
// Chat is handled via HTTP POST, no socket handler needed

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

// Health check endpoint (must be before other routes)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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
  "https://auth.privy.io"
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
      scriptSrc: ["'self'", "https://auth.privy.io", "https://unpkg.com", "https://cdn.socket.io"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
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
    logger.info('🚀 Initializing services...');
    
    // Initialize Redis
    await initializeRedis();
    logger.info('✅ Redis connected');
    
    
    // Initialize Solana
    await initializeSolana();
    logger.info('✅ Solana connected');
    
    // Initialize Privy
    const { initPrivy } = require('./lib/privy');
    initPrivy();
    logger.info('✅ Privy initialized');
    
    // Initialize database tables
    await initializeTables();
    logger.info('✅ Database tables initialized');
    
    // Initialize Socket handlers
    // Chat is handled via HTTP POST, no socket handler needed
    
    // Handle race state requests
    io.on('connection', (socket) => {
      socket.on('race:state', () => {
        const state = gameEngine.getState();
        socket.emit('race:state', state);
      });
    });
    
    logger.info('✅ Socket handlers initialized');
    
    // Initialize Game Engine
    app.set('gameEngine', gameEngine);
    app.set('io', io);
    logger.info('✅ Game engine initialized');
    
    // Initialize the race engine (includes restoration and starting)
    await gameEngine.initRaceEngine(io);
    logger.info('✅ Race engine initialized');
    
    // Initialize transaction listener for Solana deposits/withdrawals
    const { transactionListener } = require('./server/transactionListener');
    const listenerInitialized = await transactionListener.initialize();
    if (listenerInitialized) {
      await transactionListener.startListening();
      logger.info('✅ Solana transaction listener started');
    } else {
      logger.warn('⚠️ Solana transaction listener disabled');
    }
    
    // Subscribe to race updates for horizontal scaling
    try {
      const { redis } = require('./server/db');
      await redis.subscribeToRace('*', (update, channel) => {
        // Broadcast race updates to all connected clients
        // Only emit if this is a race update (not other race events)
        if (update.racers && update.tick !== undefined) {
          io.emit('race:update', update);
        }
      });
      logger.info('✅ Race pub/sub subscription initialized (pattern: race:*)');
    } catch (error) {
      logger.error('❌ Failed to initialize race pub/sub:', error);
    }
    
    // Check admin configuration
    const adminAddresses = process.env.ADMIN_ADDRESSES;
    if (!adminAddresses || adminAddresses.trim() === '') {
      logger.error('❌ ADMIN_ADDRESSES environment variable is required but not set');
      logger.error('Please set ADMIN_ADDRESSES to a comma-separated list of admin wallet addresses');
      process.exit(1);
    }
    logger.info('✅ Admin configuration validated');
    
    logger.info('🎉 All services initialized successfully!');
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
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
  try {
    logger.info('🔧 Starting server initialization...');
    await initializeServices();
    logger.info('✅ Services initialized successfully');
    
    server.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on ${HOST}:${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || 'https://racers.fun'}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer().catch(logger.error);

module.exports = { app, server, io };
