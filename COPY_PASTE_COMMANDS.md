# 📋 COPY & PASTE COMMANDS - READY TO EXECUTE

## **🗄️ DATABASE SETUP (POSTGRESQL)**

### **1. Set up PostgreSQL Database**
- Use your preferred PostgreSQL provider (Railway, Neon, or self-hosted)
- Create a new database
- Note the connection string for `DATABASE_URL`

### **2. Run Database Setup**
- Connect to your PostgreSQL database
- Copy the entire contents of `setup-database.sql` file
- Execute the SQL script to create tables and indexes
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

### **3. Navigate to Project Directory**
```bash
cd racers-vercel-live
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
REDIS_URL=<YOUR_REDIS_URL>
```

```
DATABASE_URL=<YOUR_POSTGRESQL_CONNECTION_STRING>
```

```
PHANTOM_PRIVATE_KEY=<YOUR_PHANTOM_PRIVATE_KEY>
```

```
PHANTOM_PUBLIC_KEY=<YOUR_PHANTOM_PUBLIC_KEY>
```

```
SENTRY_DSN=<YOUR_SENTRY_DSN>
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

### **2. Navigate to Project Directory**
```bash
cd racers-vercel-live
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
- Open your deployed frontend URL in your browser
- Open browser developer tools (F12) and check the Console tab
- Look for WebSocket connection messages
- Verify that races start automatically every 12 seconds

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
- Use your uptime API key: `<YOUR_UPTIME_API_KEY>`

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
