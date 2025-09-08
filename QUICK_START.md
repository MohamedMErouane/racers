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
PRIVY_APP_ID=<YOUR_PRIVY_APP_ID>
PRIVY_APP_SECRET=<YOUR_PRIVY_APP_SECRET>
REDIS_URL=<YOUR_REDIS_URL>
SUPABASE_URL=<YOUR_SUPABASE_URL>
SUPABASE_SERVICE_KEY=<YOUR_SUPABASE_SERVICE_KEY>
COINBASE_API_KEY_ID=<YOUR_COINBASE_API_KEY_ID>
COINBASE_SECRET=<YOUR_COINBASE_SECRET>
PHANTOM_PRIVATE_KEY=<YOUR_PHANTOM_PRIVATE_KEY>
PHANTOM_PUBLIC_KEY=<YOUR_PHANTOM_PUBLIC_KEY>
SENTRY_DSN=<YOUR_SENTRY_DSN>
CORS_ORIGIN=<YOUR_CORS_ORIGIN>
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
  TICK_RATE: 16
};
```

Replace `YOUR-RAILWAY-URL` with your actual Railway URL.

---

## **✅ TEST YOUR DEPLOYMENT:**

1. **Backend Health:** `https://your-railway-url.railway.app/health`
2. **Frontend:** `https://racers-vercel-live.vercel.app`
3. **WebSocket Test:** Open frontend and check browser console for WebSocket connection

---

## **🎯 SUCCESS CRITERIA:**

- ✅ Backend responds to health checks
- ✅ WebSocket connections work
- ✅ Users can connect wallets
- ✅ Races start every 12 seconds
- ✅ Users can place bets
- ✅ Chat messages persist

**That's it! Your platform is live!** 🏁
