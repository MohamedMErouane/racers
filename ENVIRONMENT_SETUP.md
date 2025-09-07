# 🔧 ENVIRONMENT SETUP - COPY & PASTE READY

## **🗄️ POSTGRESQL DATABASE SETUP**

### **Step 1: Set up PostgreSQL Database**
- Use your preferred PostgreSQL provider (Railway, Neon, or self-hosted)
- Create a new database
- Note the connection string for `DATABASE_URL`

### **Step 2: Run SQL Script**
- Connect to your PostgreSQL database
- Copy the entire contents of `setup-database.sql` file
- Execute the SQL script to create tables and indexes
- Wait for "Success" message

---

## **📋 REQUIRED SERVICES**

### **Core Services (Required)**
- **PostgreSQL**: Database for user balances, bet history, and race results
- **Redis**: Real-time pub/sub for chat, bets, and race updates
- **Solana**: Blockchain for vault operations and on-chain transactions
- **Privy**: Web3 authentication and wallet integration

### **Hosting Services (Required)**
- **Railway**: Backend hosting and deployment
- **Vercel**: Frontend hosting and deployment

### **Optional Services**
- **Sentry**: Error tracking and monitoring

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
# Required Services
DATABASE_URL=<YOUR_POSTGRESQL_CONNECTION_STRING>
REDIS_URL=<YOUR_REDIS_URL>
PRIVY_APP_ID=<YOUR_PRIVY_APP_ID>
PRIVY_APP_SECRET=<YOUR_PRIVY_APP_SECRET>

# Solana Configuration
PHANTOM_PRIVATE_KEY=<YOUR_PHANTOM_PRIVATE_KEY>
PHANTOM_PUBLIC_KEY=<YOUR_PHANTOM_PUBLIC_KEY>

# Optional Services
SENTRY_DSN=<YOUR_SENTRY_DSN>
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
- Test WebSocket connection in the main application
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

### **Database & Backend**
- ✅ PostgreSQL database created and tables initialized
- ✅ Redis instance configured and connected
- ✅ Backend deployed to Railway
- ✅ Environment variables set (PostgreSQL, Redis, Privy, Solana)
- ✅ Health check responds at `/health`

### **Frontend & Integration**
- ✅ Frontend deployed to Vercel
- ✅ URLs updated in frontend configuration
- ✅ Privy domain configured for authentication
- ✅ CORS settings updated in Railway

### **Functionality Tests**
- ✅ WebSocket connects successfully
- ✅ Wallet connection works via Privy
- ✅ Races start automatically every 12 seconds
- ✅ Users can place bets with balance validation
- ✅ Chat messages persist and display correctly
- ✅ Vault operations (deposit/withdraw) function properly

**Your Racers.fun platform is now live with the current architecture!** 🚀
