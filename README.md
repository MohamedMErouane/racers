# 🏁 Racers.fun - Real-time Anime Racing Platform

A production-ready, on-chain anime racing platform with server-side race engine, persistent chat/bets, Privy wallet login, and Solana program for deposits/withdrawals.

## 🚀 Features

- **24/7 Always-on Backend** - Never stops running
- **Real-time Racing** - 12-second races with live updates
- **Mid-race Joining** - Users can join races in progress
- **Persistent Chat** - Chat history saved and replayed
- **Live Betting** - Real-time bet placement and odds
- **On-chain Settlement** - Solana program for payouts
- **Verified Authentication** - Privy wallet integration
- **Live Leaderboards** - User statistics and rankings

## 🛠️ Tech Stack

- **Backend**: Node.js + Express + Socket.IO
- **Database**: PostgreSQL + Redis
- **Blockchain**: Solana
- **Auth**: Privy Web3 authentication
- **Frontend**: HTML5 + Canvas + WebSockets
- **Deployment**: Railway + Vercel
- **Monitoring**: Sentry + Winston + Health checks

## 📋 Prerequisites

- Node.js 20+
- Redis instance
- PostgreSQL database
- Solana program deployed
- Privy app configured

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd racers-vercel-live
npm install
```

### 2. Environment Setup

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Required environment variables:
- `PRIVY_APP_ID` - Your Privy app ID
- `PRIVY_APP_SECRET` - Your Privy app secret
- `REDIS_URL` - Redis connection string
- `DATABASE_URL` - PostgreSQL connection string
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `PROGRAM_ID` - Your Solana program ID
- `PHANTOM_PRIVATE_KEY` - Phantom wallet private key

### 3. Database Setup

Run the SQL schema in your PostgreSQL database:

```sql
-- Copy contents from setup-database.sql
```

### 4. Start Development

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 🐳 Docker Deployment

### Build and Run

```bash
npm run docker:build
npm run docker:run
```

### Docker Compose

```bash
docker-compose up -d
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🔧 Development

### Project Structure

```
├── server.js              # Main server file
├── server/
│   ├── gameEngine.js      # Race engine logic
│   ├── db.js             # Database operations
│   └── solana.js         # Solana integration
├── routes/
│   └── api.js            # API routes
├── public/
│   ├── index.html        # Frontend
│   ├── styles.css        # Styles
│   └── js/               # Frontend modules
│       ├── main.js       # Main app
│       ├── raceClient.js # Race client
│       ├── chatClient.js # Chat client
│       ├── walletClient.js # Wallet client
│       └── ui.js         # UI helpers
├── solana-program/       # Solana program
└── tests/               # Test files
```

### API Endpoints

- `GET /api/race/state` - Get current race state
- `POST /api/race/start` - Start a race (auth required)
- `POST /api/race/stop` - Stop a race (auth required)
- `GET /api/chat` - Get chat messages
- `POST /api/chat` - Send chat message
- `GET /api/bets` - Get bets
- `POST /api/bets` - Place bet (auth required)
- `POST /api/vault/deposit` - Deposit to vault (auth required)
- `POST /api/vault/withdraw` - Withdraw from vault (auth required)
- `GET /api/vault/balance/:userPublicKey` - Get vault balance
- `POST /api/vault/initialize` - Initialize user vault (auth required)

### Socket Events

- `race:state` - Request current race state
- `race:update` - Race progress updates
- `race:start` - Race started
- `race:end` - Race finished
- `chat:message` - New chat message

## 🚀 Production Deployment

### Railway (Backend)

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway deploy`
4. Set environment variables in Railway dashboard

### Vercel (Frontend)

1. Install Vercel CLI: `npm install -g vercel`
2. Deploy: `vercel --prod`
3. Update URLs in `public/index.html`

### Environment Variables

Set these in your deployment platform:

```bash
PORT=3000
NODE_ENV=production
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
REDIS_URL=your_redis_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SOLANA_RPC_URL=your_solana_rpc_url
PROGRAM_ID=your_program_id
PHANTOM_PRIVATE_KEY=your_phantom_private_key
CORS_ORIGIN=your_frontend_url
```

## 🔒 Security

- Rate limiting on all endpoints
- Input validation with Zod
- HTML sanitization
- CORS configuration
- Helmet security headers
- JWT authentication

## 📊 Monitoring

- Health check endpoint: `/health`
- Sentry error tracking
- Winston logging
- Redis monitoring
- Database monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Check the troubleshooting guide in `COPY_PASTE_COMMANDS.md`
- Review the deployment guide in `DEPLOYMENT_GUIDE.md`
- Check logs in Railway dashboard
- Monitor Sentry for errors

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ Backend responds to health checks
- ✅ WebSocket connections work
- ✅ Users can connect wallets
- ✅ Races start and complete every 12 seconds
- ✅ Users can place bets
- ✅ Chat messages persist
- ✅ Mid-race joining works
- ✅ On-chain payouts execute

**Your Racers.fun platform is now ready to handle thousands of concurrent users with professional-grade infrastructure!** 🏁🚀
