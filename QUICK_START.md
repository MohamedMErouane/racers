# 🚀 RACERS.FUN - QUICK START GUIDE

## **⚡ 5-MINUTE DEPLOYMENT**

### **STEP 1: DATABASE (2 minutes)**
1. Go to: `https://supabase.com/dashboard`
2. Login → Click project `qikxavxbpbdzqttvrtdj`
3. SQL Editor → New Query
4. Copy/paste contents of `setup-database.sql`
5. Click "Run" → Wait for "Success"

### **STEP 2: BACKEND (2 minutes)**
```bash
npm install -g @railway/cli
railway login
cd backend
railway deploy
```
- Copy Railway URL from dashboard
- Add environment variables (see below)

### **STEP 3: FRONTEND (1 minute)**
```bash
npm install -g vercel
# Update URLs in index.html with your Railway URL
vercel --prod
```

---

## **🔑 ENVIRONMENT VARIABLES FOR RAILWAY:**

```
PRIVY_APP_ID=cmermm5bm003bjo0bgsoffojs
PRIVY_APP_SECRET=KM9Y2BNjviK7dhdYHTswsYRWBxkDAZZGD7RsRBHBYTLYEKxUGYrfS5Tz33iAKMkZSPumsCrb5dFwhLJdGHetfK4
REDIS_URL=rediss://default:Ae8CAAIncDFiYmIwYjc1NTVmMDA0MWEyYTgxZDE1NjU4NTVjMzI4M3AxNjExODY@great-glider-61186.upstash.io:6379
SUPABASE_URL=https://qikxavxbpbdzqttvrtdj.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_2FKUmvDvS8Lqgrikdc3RPQ_SKnuKPW0
COINBASE_API_KEY_ID=6b8f09c6-372a-45f7-b3d5-0144eeddc7a0
COINBASE_SECRET=i6uFr+K7wXsqdkQVIX3LytnSRYEyLMKX7xecWyZscuG2HBjfjU9IKmwVD9Xd74XjeHBIhO+a7a+Vn7g7TvrITw==
PHANTOM_PRIVATE_KEY=4mktNT1moTwY3V2pw7iM8GxTuiWgLQDUDyXLknPctXzDQhYeijBuNG946DWrueBdeZqJtfUfXntie8pvvGweGeV5
PHANTOM_PUBLIC_KEY=8LwhbiNnV3VDudffDDn2ia2yt2EAtcL7j93A2RLKu3Fd
SENTRY_DSN=https://1340a806425f98bd5eddab27e3c9e6a2@o4509968691560448.ingest.us.sentry.io/4509968703553536
CORS_ORIGIN=https://racers-vercel-live.vercel.app
```

---

## **🌐 UPDATE FRONTEND URLs:**

In `index.html`, find this section (around line 290):
```javascript
window.CONFIG = {
  WS_URL: 'wss://YOUR-RAILWAY-URL.railway.app',
  API_URL: 'https://YOUR-RAILWAY-URL.railway.app/api',
  RACE_DURATION: 12000,
  COUNTDOWN_DURATION: 10000,
  TICK_RATE: 100
};
```

Replace `YOUR-RAILWAY-URL` with your actual Railway URL.

---

## **✅ TEST YOUR DEPLOYMENT:**

1. **Backend Health:** `https://your-railway-url.railway.app/health`
2. **Frontend:** `https://racers-vercel-live.vercel.app`
3. **WebSocket Test:** Open `test-websocket.html` and connect

---

## **🎯 SUCCESS CRITERIA:**

- ✅ Backend responds to health checks
- ✅ WebSocket connections work
- ✅ Users can connect wallets
- ✅ Races start every 12 seconds
- ✅ Users can place bets
- ✅ Chat messages persist

**That's it! Your platform is live!** 🏁
