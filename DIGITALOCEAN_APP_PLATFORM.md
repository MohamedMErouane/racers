# Deploy Racing Backend to DigitalOcean App Platform

## Prerequisites
- DigitalOcean account (sign up at https://cloud.digitalocean.com)
- GitHub repository with your code pushed
- Privy account credentials
- Solana program deployed

---

## Step 1: Push Code to GitHub

Ensure your latest code is on GitHub:

```bash
git add .
git commit -m "Prepare for DigitalOcean deployment"
git push origin main
```

---

## Step 2: Create App on DigitalOcean

1. **Log in to DigitalOcean** → https://cloud.digitalocean.com
2. Click **"Create"** → **"Apps"**
3. Select **"GitHub"** as source
4. Authorize DigitalOcean to access your GitHub
5. Select repository: **`MohamedMErouane/racers`**
6. Select branch: **`main`**
7. Click **"Next"**

---

## Step 3: Configure Your App

### App Settings:
- **Name**: `racers-backend` (or any name you prefer)
- **Region**: Choose closest to your users (e.g., New York, San Francisco, Amsterdam)
- **Type**: **Web Service**

### Build Settings:
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **HTTP Port**: `3001`
- **Dockerfile Path**: Leave empty (we'll use buildpack)

### Resource Size:
- **Development**: Basic ($12/month) - 512MB RAM
- **Production**: Professional ($24/month) - 1GB RAM ⭐ **Recommended**

---

## Step 4: Add PostgreSQL Database

1. In your App dashboard, click **"Create"** → **"Resources"** → **"Database"**
2. Select **"PostgreSQL"**
3. Choose plan:
   - **Development**: Basic ($15/month) - 1GB RAM, 10GB storage
   - **Production**: Basic ($15/month) is sufficient to start
4. Name it: `racers-postgres`
5. DigitalOcean will auto-generate `DATABASE_URL` environment variable

**Note**: Redis is not required - the app will work without it for development/testing.

---

## Step 5: Configure Environment Variables

In your App settings, go to **"Settings"** → **"App-Level Environment Variables"**

Add these variables:

### Required Variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Privy Configuration (Get from https://dashboard.privy.io)
PRIVY_APP_ID=your_privy_app_id_here
PRIVY_APP_SECRET=your_privy_app_secret_here

# Database (Auto-generated when you add PostgreSQL component)
DATABASE_URL=${db.DATABASE_URL}

# Redis (Optional - leave empty if not using)
REDIS_URL=

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com
PROGRAM_ID=your_solana_program_id_here

# Wallet Configuration
PHANTOM_PRIVATE_KEY=your_phantom_private_key_base58
PHANTOM_PUBLIC_KEY=your_phantom_public_key_base58

# Security
JWT_SECRET=GENERATE_RANDOM_STRING_HERE_MIN_32_CHARS

# Game Configuration
RACE_DURATION_MS=12000
RACE_SETTLE_MS=2000
RACE_COUNTDOWN_MS=10000
HOUSE_EDGE_PERCENT=4
WINNER_PAYOUT_PERCENT=86
RAKEBACK_PERCENT=10

# CORS and URLs (Update after first deployment)
CORS_ORIGIN=https://your-frontend-domain.com,https://racers-backend.ondigitalocean.app
WS_URL=wss://racers-backend.ondigitalocean.app
API_URL=https://racers-backend.ondigitalocean.app/api

# Admin Wallets (comma-separated)
ADMIN_ADDRESSES=your_admin_wallet_address_1,your_admin_wallet_address_2

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn_optional
```

### Important Notes:
- **DATABASE_URL** is auto-populated when you attach PostgreSQL
- **REDIS_URL** can be left empty (app works without it for development)
- **JWT_SECRET**: Generate a secure random string (32+ characters)
- **CORS_ORIGIN**: Add your frontend domain after deploying it
- **WS_URL/API_URL**: Will be `https://your-app-name.ondigitalocean.app` after deployment

---

## Step 6: Generate Secure JWT Secret

Run this command to generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as `JWT_SECRET`

---

## Step 7: Deploy the App

1. Review all settings
2. Click **"Next"** → **"Create Resources"**
3. DigitalOcean will:
   - Build your app
   - Deploy to production
   - Assign a URL: `https://racers-backend-xxxxx.ondigitalocean.app`

**First deployment takes 5-10 minutes**

---

## Step 8: Initialize Database

After successful deployment, you need to initialize your database tables.

### Option A: Using DigitalOcean Console

1. Go to your App → **"Console"** tab
2. Click **"Run command"**
3. Run:
```bash
node -e "require('./server/db').initializeTables()"
```

### Option B: Connect via psql

1. Get database credentials from **"Database"** → **"Connection Details"**
2. Use the `setup-database.sql` script:
```bash
psql "postgresql://user:password@host:port/database" < setup-database.sql
```

---

## Step 9: Verify Deployment

### Check Health Endpoint:
```bash
curl https://racers-backend-xxxxx.ondigitalocean.app/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-26T...",
  "uptime": 123.456,
  "environment": "production"
}
```

### Check App Logs:
1. Go to your App dashboard
2. Click **"Logs"** tab
3. Look for:
   - ✅ Server started
   - ✅ Database connected
   - ✅ WebSocket ready

---

## Step 10: Update Frontend Configuration

Update your frontend `config.js` with the new backend URL:

```javascript
const config = {
  apiUrl: 'https://racers-backend-xxxxx.ondigitalocean.app/api',
  wsUrl: 'wss://racers-backend-xxxxx.ondigitalocean.app',
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
  // ... other config
};
```

---

## Step 11: Set Up Custom Domain (Optional)

1. In App Platform, go to **"Settings"** → **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `api.racers.fun`)
4. Add the CNAME record to your DNS provider:
   - **Type**: CNAME
   - **Name**: `api` (or `@` for root)
   - **Value**: `racers-backend-xxxxx.ondigitalocean.app`
5. DigitalOcean auto-provisions SSL certificate

---

## Step 12: Enable Auto-Deployment

Already configured! Every push to `main` branch will automatically deploy.

To disable auto-deploy:
1. Go to **"Settings"** → **"App Spec"**
2. Change `autodeploy: enabled: true` to `false`

---

## Monitoring & Maintenance

### View Logs:
- **Real-time**: App dashboard → "Logs" tab
- **Historical**: Use DigitalOcean Monitoring

### Scale Your App:
1. Go to **"Settings"** → **"Resources"**
2. Adjust instance size or count
3. Horizontal scaling available on Pro plan

### Database Backups:
- Managed databases include **automatic daily backups**
- Retention: 7 days (Basic plan), 14 days (Professional)
- Manual backups available in Database dashboard

### Health Checks:
- DigitalOcean automatically monitors `/health` endpoint
- Auto-restarts on failures
- Alerts via email/Slack

---

## Cost Breakdown (Monthly)

| Component | Plan | Cost |
|-----------|------|------|
| App Platform (Web Service) | Professional | $24 |
| PostgreSQL Database | Basic | $15 |
| **Total** | | **$39/month** |

### Cost Optimization:
- Start with Basic plan ($12) for development
- Upgrade to Professional ($24) when you have traffic
- Databases scale independently

---

## Troubleshooting

### Build Fails:
- Check **"Build Logs"** for errors
- Ensure `package.json` has correct Node version (>=18.0.0)
- Verify `build.js` script works locally

### App Crashes on Startup:
- Check **"Runtime Logs"**
- Verify all environment variables are set
- Ensure DATABASE_URL is correct

### WebSocket Connection Fails:
- Verify `CORS_ORIGIN` includes your frontend domain
- Check firewall/security group settings
- Ensure WS_URL uses `wss://` (not `ws://`)

### Database Connection Issues:
- Check database is attached to app
- Verify `DATABASE_URL` format
- Check database is in same region as app

---

## Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Test WebSocket connections
3. ✅ Place test bets and run test races
4. ✅ Monitor logs for errors
5. ✅ Set up Sentry for error tracking
6. ✅ Configure backups
7. ✅ Add monitoring alerts
8. ✅ Deploy frontend to DigitalOcean Static Sites or Vercel

---

## Support & Resources

- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/
- **Status Page**: https://status.digitalocean.com/
- **Community**: https://www.digitalocean.com/community

---

## Security Checklist

- [ ] All environment variables set correctly
- [ ] JWT_SECRET is strong and random
- [ ] Private keys stored securely in environment variables
- [ ] CORS_ORIGIN restricted to your domains only
- [ ] Database credentials not committed to Git
- [ ] SSL/HTTPS enabled (auto by DigitalOcean)
- [ ] Rate limiting configured (already in server.js)
- [ ] Helmet security headers enabled (already in server.js)

---

**You're all set! Your racing backend is now live on DigitalOcean! 🚀**
