# 🔧 ENVIRONMENT SETUP - COPY & PASTE READY

## **🗄️ SUPABASE DATABASE SETUP**

### **Step 1: Go to Supabase**
- URL: `https://supabase.com/dashboard`
- Login with your account
- Click on project: `qikxavxbpbdzqttvrtdj`

### **Step 2: Run SQL Script**
- Click "SQL Editor" in left sidebar
- Click "New Query"
- Copy the entire contents of `setup-database.sql` file
- Paste into the editor
- Click "Run" button
- Wait for "Success" message

---

## **🖥️ RAILWAY BACKEND DEPLOYMENT**

### **Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
```

### **Step 2: Login to Railway**
```bash
railway login
```

### **Step 3: Deploy Backend**
```bash
cd backend
railway deploy
```

### **Step 4: Set Environment Variables**
In Railway dashboard, go to your project → Variables tab → Add these:

```
PRIVY_APP_ID=<YOUR_PRIVY_APP_ID>
PRIVY_APP_SECRET=<YOUR_PRIVY_APP_SECRET>
REDIS_URL=rediss://default:Ae8CAAIncDFiYmIwYjc1NTVmMDA0MWEyYTgxZDE1NjU4NTVjMzI4M3AxNjExODY@great-glider-61186.upstash.io:6379
SUPABASE_URL=https://qikxavxbpbdzqttvrtdj.supabase.co
SUPABASE_SERVICE_KEY=<YOUR_SUPABASE_SERVICE_KEY>
COINBASE_API_KEY_ID=6b8f09c6-372a-45f7-b3d5-0144eeddc7a0
COINBASE_SECRET=i6uFr+K7wXsqdkQVIX3LytnSRYEyLMKX7xecWyZscuG2HBjfjU9IKmwVD9Xd74XjeHBIhO+a7a+Vn7g7TvrITw==
PHANTOM_PRIVATE_KEY=4mktNT1moTwY3V2pw7iM8GxTuiWgLQDUDyXLknPctXzDQhYeijBuNG946DWrueBdeZqJtfUfXntie8pvvGweGeV5
PHANTOM_PUBLIC_KEY=8LwhbiNnV3VDudffDDn2ia2yt2EAtcL7j93A2RLKu3Fd
SENTRY_DSN=https://1340a806425f98bd5eddab27e3c9e6a2@o4509968691560448.ingest.us.sentry.io/4509968703553536
CORS_ORIGIN=https://racers-vercel-live.vercel.app
```

### **Step 5: Get Railway URL**
- In Railway dashboard, click "Settings"
- Copy the "Public URL" (something like `https://your-project.railway.app`)

---

## **🌐 VERCEL FRONTEND DEPLOYMENT**

### **Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

### **Step 2: Update Frontend URLs**
Open `index.html` and find this section (around line 290):
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

### **Step 3: Deploy to Vercel**
```bash
vercel --prod
```

### **Step 4: Get Vercel URL**
- Copy the deployment URL (something like `https://racers-vercel-live.vercel.app`)

---

## **🔧 DOMAIN CONFIGURATION**

### **Step 1: Update Privy**
- Go to: `https://dashboard.privy.io/`
- Login → Click app: `<YOUR_PRIVY_APP_ID>`
- Settings → Domains → Add your Vercel URL

### **Step 2: Update Railway CORS**
- Go back to Railway dashboard
- Update `CORS_ORIGIN` variable to your Vercel URL

---

## **🧪 TESTING COMMANDS**

### **Test Backend Health**
```bash
curl https://your-railway-url.railway.app/health
```

### **Test WebSocket**
- Open `test-websocket.html` in browser
- Update `CONFIG.WS_URL` to your Railway URL
- Click "Connect"

### **Test Frontend**
- Open your Vercel deployment URL
- Click "Connect" wallet button
- Try joining a race and placing a bet

---

## **📊 MONITORING**

### **Sentry Error Tracking**
- Go to: `https://sentry.io/`
- Check for errors in your project

### **Railway Logs**
- Railway dashboard → Deployments → Latest deployment → Logs

### **Health Check**
- Monitor: `https://your-railway-url.railway.app/health`

---

## **🎯 SUCCESS CHECKLIST**

- ✅ Database tables created in Supabase
- ✅ Backend deployed to Railway
- ✅ Environment variables set
- ✅ Frontend deployed to Vercel
- ✅ URLs updated in frontend
- ✅ Privy domain configured
- ✅ CORS settings updated
- ✅ Health check responds
- ✅ WebSocket connects
- ✅ Wallet connection works
- ✅ Races start automatically
- ✅ Users can place bets
- ✅ Chat messages persist

**Your Racers.fun platform is now live!** 🚀
