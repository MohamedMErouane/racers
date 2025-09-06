# 🏁 Racers.fun Backend

Real-time anime racing betting platform with Web3 integration, built with Node.js, Socket.IO, Redis, Supabase, and Solana.

## 🚀 Features

- **Real-time Racing**: 12-second races with live position updates
- **Web3 Integration**: Privy authentication with Solana wallet support
- **On-chain Betting**: Solana program for secure bet locking and payouts
- **Live Chat**: Real-time chat with message history and spam protection
- **Mid-race Joining**: Join races at any time during countdown
- **Persistent State**: Redis for real-time data, Supabase for persistence
- **Auto-scaling**: Horizontal scaling with Redis pub/sub
- **Monitoring**: Comprehensive logging, error tracking, and metrics

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Blockchain    │
│   (Vercel)      │◄──►│   (Railway)     │◄──►│   (Solana)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Database      │
                       │   (Supabase)    │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Cache/PubSub  │
                       │   (Redis)       │
                       └─────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **Redis** - Caching and pub/sub
- **Supabase** - PostgreSQL database
- **Privy** - Web3 authentication
- **Solana** - Blockchain integration

### Infrastructure
- **Railway** - Backend hosting
- **Vercel** - Frontend hosting
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboard

## 📦 Installation

### Prerequisites
- Node.js 18+
- Redis instance
- Supabase project
- Solana wallet
- Privy app

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/racersdotfun/racersdotfun.git
   cd racersdotfun/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your credentials
   ```

4. **Start Redis**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Or use your Redis instance
   ```

5. **Run database migrations**
   ```bash
   # Supabase will auto-create tables on first run
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=production
HOST=0.0.0.0

# Privy Configuration
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
PRIVY_JWKS_URL=your_privy_jwks_url

# Redis Configuration
REDIS_URL=your_redis_url

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Solana Configuration
SOLANA_RPC_URL=your_solana_rpc_url
PHANTOM_PRIVATE_KEY=your_phantom_private_key
PHANTOM_PUBLIC_KEY=your_phantom_public_key

# Game Configuration
RACE_DURATION_MS=12000
RACE_SETTLE_MS=2000
RACE_COUNTDOWN_MS=10000
HOUSE_EDGE_PERCENT=4
WINNER_PAYOUT_PERCENT=86
RAKEBACK_PERCENT=10
```

## 🚀 Deployment

### Railway Deployment

1. **Connect to Railway**
   ```bash
   railway login
   railway link
   ```

2. **Set environment variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PRIVY_APP_ID=your_app_id
   # ... set all other variables
   ```

3. **Deploy**
   ```bash
   railway up
   ```

### Docker Deployment

1. **Build the image**
   ```bash
   docker build -t racers-backend .
   ```

2. **Run with docker-compose**
   ```bash
   docker-compose up -d
   ```

## 📊 API Endpoints

### Authentication
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/connect-wallet` - Connect wallet
- `POST /api/auth/logout` - Logout user

### Races
- `GET /api/race/current` - Get current race
- `GET /api/race/history` - Get race history
- `GET /api/race/:id` - Get specific race
- `POST /api/race/join` - Join race
- `POST /api/race/leave` - Leave race

### Betting
- `POST /api/bets/place` - Place bet
- `GET /api/bets/race/:id` - Get user's bet for race
- `GET /api/bets/race/:id/all` - Get all bets for race
- `GET /api/bets/history` - Get betting history
- `DELETE /api/bets/cancel/:id` - Cancel bet

### Chat
- `POST /api/chat/send` - Send message
- `GET /api/chat/history/:raceId` - Get chat history
- `GET /api/chat/recent` - Get recent messages
- `GET /api/chat/stats` - Get chat statistics

### Statistics
- `GET /api/stats/platform` - Platform statistics
- `GET /api/stats/races` - Race statistics
- `GET /api/stats/betting` - Betting statistics
- `GET /api/stats/users` - User statistics
- `GET /api/stats/leaderboard` - Leaderboard
- `GET /api/stats/realtime` - Real-time statistics

## 🔌 WebSocket Events

### Race Events
- `race_state` - Current race state
- `race_update` - Race progress update
- `race_started` - Race started
- `race_ended` - Race finished
- `countdown_update` - Countdown update
- `bet_placed` - New bet placed
- `user_joined` - User joined race
- `user_left` - User left race

### Chat Events
- `chat_history` - Chat message history
- `new_message` - New chat message
- `user_typing` - User typing indicator
- `user_joined_chat` - User joined chat
- `user_left_chat` - User left chat

## 🎮 Game Logic

### Race Flow
1. **Waiting Phase** (0-10s) - Users can join and place bets
2. **Countdown Phase** (10s) - Betting locked, countdown begins
3. **Racing Phase** (12s) - Race runs with position updates
4. **Settlement Phase** (2s) - Calculate and distribute payouts

### Betting Model
- **House Edge**: 4% of total pot
- **Winner Payout**: 86% of total pot (pro-rata)
- **Rakeback**: 10% of total pot (equal distribution to losers)

### Racer Stats
- **8 Anime Characters** with unique stats
- **Speed**: Base movement speed
- **Acceleration**: Speed increase over time
- **Special Abilities**: Unique race mechanics
- **Rarity**: Legendary, Epic, Rare classifications

## 🔒 Security

### Authentication
- **Privy JWT** verification on all protected routes
- **CORS** configured for production domain
- **Rate limiting** on API endpoints
- **Input validation** on all user inputs

### Data Protection
- **Encrypted** sensitive data in database
- **Secure** WebSocket connections
- **Audit logging** for all user actions
- **Error tracking** with Sentry

## 📈 Monitoring

### Health Checks
- `GET /health` - Application health status
- **Prometheus** metrics collection
- **Grafana** dashboards
- **Uptime monitoring** with external service

### Logging
- **Winston** structured logging
- **File rotation** for log management
- **Error tracking** with Sentry
- **Performance monitoring**

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### Integration Tests
```bash
npm run test:integration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.racers.fun](https://docs.racers.fun)
- **Discord**: [discord.gg/racers](https://discord.gg/racers)
- **Twitter**: [@racersdotfun](https://twitter.com/racersdotfun)
- **Email**: support@racers.fun

## 🎯 Roadmap

- [ ] **Mobile App** - React Native application
- [ ] **Tournament Mode** - Multi-race tournaments
- [ ] **NFT Integration** - Racer NFTs and collections
- [ ] **Cross-chain** - Multi-blockchain support
- [ ] **AI Racers** - AI-powered racer behavior
- [ ] **Social Features** - Friends, teams, and guilds

---

**Built with ❤️ by the Racers.fun team**
