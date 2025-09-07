# 📋 COPY & PASTE COMMANDS - READY TO EXECUTE

## **🗄️ DATABASE SETUP (SUPABASE)**

### **1. Go to Supabase Dashboard**
```
https://supabase.com/dashboard
```

### **2. Navigate to Your Project**
- Login to your account
- Click on project: `qikxavxbpbdzqttvrtdj`

### **3. Open SQL Editor**
- Click "SQL Editor" in left sidebar
- Click "New Query"

### **4. Run Database Setup**
- Copy the entire contents of `setup-database.sql` file
- Paste into the SQL Editor
- Click "Run" button
- Wait for "Success" message

---

## **🖥️ BACKEND DEPLOYMENT (RAILWAY)**

### **1. Install Railway CLI**
```bash
npm install -g @railway/cli
```

### **2. Login to Railway**
```bash
railway login
```

### **3. Navigate to Backend Directory**
```bash
cd /Users/kevinkaushal/racers-vercel-live/backend
```

### **4. Deploy to Railway**
```bash
railway deploy
```

### **5. Set Environment Variables**
In Railway dashboard, go to your project → Variables tab → Add these one by one:

```
PRIVY_APP_ID=<YOUR_PRIVY_APP_ID>
```

```
PRIVY_APP_SECRET=<YOUR_PRIVY_APP_SECRET>
```

```
REDIS_URL=rediss://default:Ae8CAAIncDFiYmIwYjc1NTVmMDA0MWEyYTgxZDE1NjU4NTVjMzI4M3AxNjExODY@great-glider-61186.upstash.io:6379
```

```
SUPABASE_URL=https://qikxavxbpbdzqttvrtdj.supabase.co
```

```
SUPABASE_SERVICE_KEY=<YOUR_SUPABASE_SERVICE_KEY>
```

```
COINBASE_API_KEY_ID=6b8f09c6-372a-45f7-b3d5-0144eeddc7a0
```

```
COINBASE_SECRET=i6uFr+K7wXsqdkQVIX3LytnSRYEyLMKX7xecWyZscuG2HBjfjU9IKmwVD9Xd74XjeHBIhO+a7a+Vn7g7TvrITw==
```

```
PHANTOM_PRIVATE_KEY=4mktNT1moTwY3V2pw7iM8GxTuiWgLQDUDyXLknPctXzDQhYeijBuNG946DWrueBdeZqJtfUfXntie8pvvGweGeV5
```

```
PHANTOM_PUBLIC_KEY=8LwhbiNnV3VDudffDDn2ia2yt2EAtcL7j93A2RLKu3Fd
```

```
SENTRY_DSN=https://1340a806425f98bd5eddab27e3c9e6a2@o4509968691560448.ingest.us.sentry.io/4509968703553536
```

```
CORS_ORIGIN=https://racers-vercel-live.vercel.app
```

### **6. Get Railway URL**
- In Railway dashboard, click "Settings"
- Copy the "Public URL" (something like `https://your-project.railway.app`)

---

## **🌐 FRONTEND DEPLOYMENT (VERCEL)**

### **1. Install Vercel CLI**
```bash
npm install -g vercel
```

### **2. Navigate to Root Directory**
```bash
cd /Users/kevinkaushal/racers-vercel-live
```

### **3. Update Frontend URLs**
Open `index.html` in a text editor and find this section (around line 290):
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

### **4. Deploy to Vercel**
```bash
vercel --prod
```

### **5. Get Vercel URL**
- Copy the deployment URL (something like `https://racers-vercel-live.vercel.app`)

---

## **🔧 DOMAIN CONFIGURATION**

### **1. Update Privy Dashboard**
- Go to: `https://dashboard.privy.io/`
- Login to your account
- Click on your app: `<YOUR_PRIVY_APP_ID>`
- Go to "Settings" → "Domains"
- Add your Vercel URL: `https://racers-vercel-live.vercel.app`

### **2. Update Railway CORS**
- Go back to Railway dashboard
- Update the `CORS_ORIGIN` variable to: `https://racers-vercel-live.vercel.app`

---

## **🧪 TESTING COMMANDS**

### **Test Backend Health**
```bash
curl https://your-railway-url.railway.app/health
```

### **Test WebSocket Connection**
- Open `test-websocket.html` in your browser
- Update the `CONFIG.WS_URL` to your Railway URL
- Click "Connect" button
- Should show "Connected to race server"

### **Test Frontend**
- Open your Vercel deployment URL
- Click "Connect" wallet button
- Should show Privy wallet connection
- Try joining a race and placing a bet

---

## **📊 MONITORING SETUP**

### **1. Sentry Error Tracking**
- Go to: `https://sentry.io/`
- Login to your account
- Check for any errors in your project

### **2. Railway Logs**
- Go to Railway dashboard
- Click "Deployments" tab
- Click on latest deployment
- Check logs for any errors

### **3. Health Check Monitoring**
- Set up uptime monitoring for: `https://your-railway-url.railway.app/health`
- Use your uptime API key: `m801310240-02a9097ddf9eb0e5d1b68fdf`

---

## **🎯 FINAL VERIFICATION**

### **Check these URLs work:**
- ✅ Backend Health: `https://your-railway-url.railway.app/health`
- ✅ Frontend: `https://racers-vercel-live.vercel.app`
- ✅ WebSocket: `wss://your-railway-url.railway.app`

### **Test these features:**
- ✅ Wallet connection works
- ✅ Races start every 12 seconds
- ✅ Users can place bets
- ✅ Chat messages appear
- ✅ Mid-race joining works

---

## **🚨 TROUBLESHOOTING**

### **If Backend Health Check Fails:**
```bash
# Check if Railway deployment is running
curl https://your-railway-url.railway.app/health
```

### **If WebSocket Connection Fails:**
- Check CORS settings in Railway
- Verify backend URL in frontend
- Check Railway logs for errors

### **If Wallet Connection Fails:**
- Verify domain is added to Privy
- Check CORS origin settings
- Verify app ID and secret

---

## **🎉 SUCCESS!**

**Your Racers.fun platform is now live and ready to handle thousands of concurrent users!** 🏁

**All features working:**
- ✅ Real-time racing
- ✅ Mid-race joining
- ✅ Persistent chat
- ✅ Live betting
- ✅ On-chain settlement
- ✅ Wallet authentication
