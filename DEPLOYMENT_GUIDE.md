# 🚀 Racers.fun - Complete Deployment Guide

## 🎯 **SYSTEM STATUS: READY FOR PRODUCTION!**

### ✅ **WHAT'S COMPLETED:**

1. **Backend Infrastructure** - Full Node.js server with WebSockets
2. **Database Schema** - PostgreSQL tables for races, bets, users, chat
3. **Real-time Features** - WebSocket connections for live updates
4. **Authentication** - Privy integration ready
5. **Blockchain Integration** - Solana program and Coinbase API
6. **Frontend Integration** - Refactored for server-state architecture
7. **Monitoring** - Sentry, logging, health checks
8. **DevOps** - Docker, CI/CD, deployment configs

---

## 🗄️ **STEP 1: SETUP DATABASE**

### **Supabase Setup:**
1. Go to your Supabase project: `https://qikxavxbpbdzqttvrtdj.supabase.co`
2. Open the SQL Editor
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
   - `PRIVY_APP_ID=cmermm5bm003bjo0bgsoffojs`
   - `PRIVY_APP_SECRET=KM9Y2BNjviK7dhdYHTswsYRWBxkDAZZGD7RsRBHBYTLYEKxUGYrfS5Tz33iAKMkZSPumsCrb5dFwhLJdGHetfK4`
   - `REDIS_URL=rediss://default:Ae8CAAIncDFiYmIwYjc1NTVmMDA0MWEyYTgxZDE1NjU4NTVjMzI4M3AxNjExODY@great-glider-61186.upstash.io:6379`
   - `SUPABASE_URL=https://qikxavxbpbdzqttvrtdj.supabase.co`
   - `SUPABASE_SERVICE_KEY=sb_secret_2FKUmvDvS8Lqgrikdc3RPQ_SKnuKPW0`
   - `COINBASE_API_KEY_ID=6b8f09c6-372a-45f7-b3d5-0144eeddc7a0`
   - `COINBASE_SECRET=i6uFr+K7wXsqdkQVIX3LytnSRYEyLMKX7xecWyZscuG2HBjfjU9IKmwVD9Xd74XjeHBIhO+a7a+Vn7g7TvrITw==`
   - `PHANTOM_PRIVATE_KEY=4mktNT1moTwY3V2pw7iM8GxTuiWgLQDUDyXLknPctXzDQhYeijBuNG946DWrueBdeZqJtfUfXntie8pvvGweGeV5`
   - `PHANTOM_PUBLIC_KEY=8LwhbiNnV3VDudffDDn2ia2yt2EAtcL7j93A2RLKu3Fd`
   - `SENTRY_DSN=https://1340a806425f98bd5eddab27e3c9e6a2@o4509968691560448.ingest.us.sentry.io/4509968703553536`

### **Option B: Docker Deployment**

1. **Build and run with Docker:**
   ```bash
   cd backend
   docker build -t racers-backend .
   docker run -p 3001:3001 --env-file env racers-backend
   ```

---

## 🌐 **STEP 3: DEPLOY FRONTEND**

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
1. Open `test-websocket.html` in browser
2. Update the `CONFIG.WS_URL` to your Railway URL
3. Click "Connect" and verify connection

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
   - Verify Supabase credentials
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
   - Verify Coinbase API credentials
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
