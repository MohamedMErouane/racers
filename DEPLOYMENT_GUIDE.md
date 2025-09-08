# 🚀 Racers.fun - Complete Deployment Guide

## 🎯 **SYSTEM STATUS: READY FOR PRODUCTION!**

### ✅ **WHAT'S COMPLETED:**

1. **Backend Infrastructure** - Full Node.js server with WebSockets
2. **Database Schema** - PostgreSQL tables for races, bets, users, chat
3. **Real-time Features** - WebSocket connections for live updates
4. **Authentication** - Privy integration ready
5. **Blockchain Integration** - Solana program for vault operations
6. **Frontend Integration** - Refactored for server-state architecture
7. **Monitoring** - Sentry, logging, health checks
8. **DevOps** - Docker, CI/CD, deployment configs

---

## 🗄️ **STEP 1: SETUP DATABASE**

### **PostgreSQL Setup:**
1. Set up your PostgreSQL database (Railway, Neon, or self-hosted)
2. Connect to your database using your preferred client
3. Copy and paste the contents of `setup-database.sql`
4. Run the SQL script to create all tables and indexes

### **Database Tables Created:**
- `races` - Race information and status
- `bets` - User bets and transactions
- `users` - User profiles and statistics
- `chat_messages` - Persistent chat history
- `race_results` - Race outcomes and payouts

---

## 🖥️ **STEP 2: DEPLOY BACKEND**

### **Option A: Railway Deployment (Recommended)**

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Deploy from backend directory:**
   ```bash
   cd backend
   railway deploy
   ```

4. **Set Environment Variables in Railway Dashboard:**
   - `PRIVY_APP_ID=<YOUR_PRIVY_APP_ID>`
   - `PRIVY_APP_SECRET=<YOUR_PRIVY_APP_SECRET>`
   - `REDIS_URL=<YOUR_REDIS_URL>`
   - `SUPABASE_URL=<YOUR_SUPABASE_URL>`
   - `SUPABASE_SERVICE_KEY=<YOUR_SUPABASE_SERVICE_KEY>`
   - `COINBASE_API_KEY_ID=<YOUR_COINBASE_API_KEY_ID>`
   - `COINBASE_SECRET=<YOUR_COINBASE_SECRET>`
   - `PHANTOM_PRIVATE_KEY=<YOUR_PHANTOM_PRIVATE_KEY>`
   - `PHANTOM_PUBLIC_KEY=<YOUR_PHANTOM_PUBLIC_KEY>`
   - `SENTRY_DSN=<YOUR_SENTRY_DSN>`

### **Option B: Docker Deployment**

1. **Build and run with Docker:**
   ```bash
   cd backend
   docker build -t racers-backend .
   docker run -p 3001:3001 --env-file env racers-backend
   ```

---

## 🌐 **STEP 3: DEPLOY FRONTEND**

### **Build Process:**
1. **Run the build script to inject environment variables:**
   ```bash
   npm run build
   ```
   This replaces `<YOUR_PRIVY_APP_ID>` with your actual Privy App ID

### **Vercel Deployment:**

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy from root directory:**
   ```bash
   vercel --prod
   ```

3. **Update backend URL in production:**
   - Edit `index.html` and change the `CONFIG` object
   - Set `WS_URL` to your Railway backend URL
   - Set `API_URL` to your Railway backend URL

---

## 🔧 **STEP 4: CONFIGURE DOMAIN**

### **Update Privy Configuration:**
1. Go to Privy Dashboard
2. Add your production domain: `https://racers.fun`
3. Update CORS settings

### **Update Backend CORS:**
1. In Railway dashboard, set environment variable:
   - `CORS_ORIGIN=https://racers.fun`

---

## 🧪 **STEP 5: TESTING**

### **Test Backend:**
```bash
curl https://your-railway-url.railway.app/health
```

### **Test WebSocket:**
1. Open your deployed frontend in browser
2. Open browser developer tools (F12) and check Console tab
3. Look for WebSocket connection messages and race updates
4. Verify races start automatically every 12 seconds

### **Test Frontend:**
1. Open your Vercel deployment
2. Verify wallet connection works
3. Test race joining and betting

---

## 📊 **STEP 6: MONITORING**

### **Sentry Error Tracking:**
- Errors will automatically be sent to your Sentry dashboard
- Monitor for any issues in production

### **Health Checks:**
- Backend health: `https://your-backend-url/health`
- Set up uptime monitoring with your provided API key

### **Logs:**
- Railway provides built-in logging
- Check for any errors or performance issues

---

## 🎮 **STEP 7: LAUNCH FEATURES**

### **Core Features Ready:**
- ✅ **Real-time Racing** - 12-second races with live updates
- ✅ **Mid-race Joining** - Users can join races in progress
- ✅ **Persistent Chat** - Chat history saved and replayed
- ✅ **Live Betting** - Real-time bet placement and odds
- ✅ **On-chain Settlement** - Solana program for payouts
- ✅ **User Authentication** - Privy wallet integration
- ✅ **Leaderboards** - User statistics and rankings

### **Betting System:**
- **4%** - Treasury fee
- **86%** - Pro-rata to winners
- **10%** - Equal rakeback to losers

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues:**

1. **Database Connection Errors:**
   - Verify PostgreSQL connection string
   - Check if tables exist
   - Run the setup-database.sql script

2. **WebSocket Connection Issues:**
   - Check CORS settings
   - Verify backend URL in frontend
   - Check Railway logs for errors

3. **Privy Authentication Issues:**
   - Verify domain is added to Privy
   - Check CORS origin settings
   - Verify app ID and secret

4. **Solana Integration Issues:**
   - Check wallet balance
   - Verify Solana RPC connection
   - Check transaction logs

---

## 🎉 **SUCCESS CRITERIA**

Your deployment is successful when:

- ✅ Backend responds to health checks
- ✅ WebSocket connections work
- ✅ Users can connect wallets
- ✅ Races start and complete every 12 seconds
- ✅ Users can place bets
- ✅ Chat messages persist
- ✅ Mid-race joining works
- ✅ On-chain payouts execute

---

## 📞 **SUPPORT**

If you encounter any issues:

1. Check the logs in Railway dashboard
2. Monitor Sentry for errors
3. Test individual components using the test files
4. Verify all environment variables are set correctly

**Your Racers.fun platform is now ready to handle thousands of concurrent users with real-time racing, betting, and chat!** 🏁
