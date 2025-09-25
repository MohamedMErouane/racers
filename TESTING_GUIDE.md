# 🧪 Complete Backend Testing Guide

## 🚀 **Quick Test Setup (5 minutes)**

### **Prerequisites**
```bash
# Ensure you have these installed
node --version  # Should be 18+
npm --version
docker --version
git --version
```

### **1. Clone & Setup**
```bash
git clone https://github.com/racersdotfun/racers-vercel-live.git
cd racers-vercel-live
npm install
```

### **2. Local Test Environment**
```bash
# Copy environment template
cp env.example .env

# Start local databases (Docker required)
docker run -d --name test-redis -p 6379:6379 redis:alpine
docker run -d --name test-postgres -p 5432:5432 -e POSTGRES_DB=racers -e POSTGRES_USER=racers -e POSTGRES_PASSWORD=testpass postgres:15-alpine

# Wait for databases to start (30 seconds)
sleep 30

# Setup database schema
docker exec test-postgres psql -U racers -d racers -f /tmp/setup-database.sql
# OR manually: 
# psql -h localhost -U racers -d racers -f setup-database.sql
```

### **3. Configure Test Environment**
Edit `.env` file:
```bash
# Minimal test configuration
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://racers:testpass@localhost:5432/racers
REDIS_URL=redis://localhost:6379
PRIVY_APP_ID=test_app_id
PRIVY_APP_SECRET=test_secret
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### **4. Start Backend**
```bash
npm run dev
# Server should start on http://localhost:3001
```

---

## 🔍 **Testing Methods**

### **Method 1: Automated Test Suite**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (for development)
npm run test:watch

# Specific test files
npm test api.test.js
npm test raceEngine.test.js
npm test database.test.js
npm test solana.test.js
```

### **Method 2: Manual API Testing**

#### **A. Health Check**
```bash
curl http://localhost:3001/health
# Expected: {"status":"healthy","timestamp":"...","uptime":123.45}
```

#### **B. WebSocket Connection Test**
```javascript
// Open browser console on http://localhost:3001
const socket = io();
socket.on('connect', () => console.log('✅ WebSocket connected'));
socket.on('race:state', (data) => console.log('🏁 Race state:', data));
socket.on('chat:message', (data) => console.log('💬 Chat:', data));
```

#### **C. API Endpoints Test**
```bash
# Get current race state
curl http://localhost:3001/api/race/state

# Get chat messages  
curl http://localhost:3001/api/chat/messages

# Test with authentication (need valid Privy token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/user/balance
```

### **Method 3: Browser Testing**
1. Open `http://localhost:3001` in browser
2. Check browser console for errors
3. Test wallet connection (if Privy configured)
4. Watch race progression
5. Test chat functionality

---

## 🎯 **Comprehensive Test Scenarios**

### **Scenario 1: Full Race Cycle Test**
```bash
# 1. Start server
npm run dev

# 2. Monitor race progression
curl -s http://localhost:3001/api/race/state | jq '.status'
# Should cycle: idle → countdown → racing → finished → idle

# 3. Check race timing (races every ~25 seconds)
watch -n 1 'curl -s http://localhost:3001/api/race/state | jq .status'
```

### **Scenario 2: Database Persistence Test**
```bash
# 1. Check database connection
npm run test database.test.js

# 2. Manual database check
psql -h localhost -U racers -d racers -c "SELECT COUNT(*) FROM races;"
psql -h localhost -U racers -d racers -c "SELECT COUNT(*) FROM chat_messages;"

# 3. Redis check
redis-cli -h localhost PING
redis-cli -h localhost LLEN chat
redis-cli -h localhost KEYS "race:*"
```

### **Scenario 3: Authentication Test**
```bash
# 1. Test without auth (should fail)
curl -X POST http://localhost:3001/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
# Expected: 401 Unauthorized

# 2. Test with mock token (for development)
curl -X POST http://localhost:3001/api/chat/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock_token" \
  -d '{"message":"test message"}'
```

### **Scenario 4: Load Testing**
```bash
# Install artillery for load testing
npm install -g artillery

# Create load test config
cat > loadtest.yml << EOF
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Health check load test"
    requests:
      - get:
          url: "/health"
  - name: "Race state load test"  
    requests:
      - get:
          url: "/api/race/state"
EOF

# Run load test
artillery run loadtest.yml
```

---

## 🔧 **Debugging & Troubleshooting**

### **Common Issues & Solutions**

#### **1. Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres
# Restart if needed
docker restart test-postgres

# Check connection
psql -h localhost -U racers -d racers -c "SELECT 1;"
```

#### **2. Redis Connection Failed**
```bash
# Check Redis
docker ps | grep redis
redis-cli -h localhost ping
# Should return: PONG
```

#### **3. Port Already in Use**
```bash
# Find process using port 3001
lsof -i :3001
# Kill process
kill -9 PID_NUMBER
```

#### **4. WebSocket Connection Issues**
```bash
# Check if Socket.IO is working
curl -s "http://localhost:3001/socket.io/?EIO=4&transport=polling"
# Should return Socket.IO response
```

### **Log Analysis**
```bash
# Enable debug logging
DEBUG=* npm run dev

# Watch logs in real-time
tail -f logs/combined.log

# Filter specific logs
grep "ERROR" logs/combined.log
grep "race:" logs/combined.log
```

---

## 📊 **Performance Testing**

### **1. Memory Usage**
```bash
# Monitor Node.js memory
curl http://localhost:3001/health
# Check process memory
ps aux | grep node
```

### **2. Response Times**
```bash
# Test API response times
time curl http://localhost:3001/api/race/state
time curl http://localhost:3001/health

# WebSocket latency test
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3001');
const start = Date.now();
socket.on('connect', () => {
  console.log('WebSocket latency:', Date.now() - start, 'ms');
  process.exit(0);
});
"
```

### **3. Concurrent Connections**
```bash
# Test multiple WebSocket connections
for i in {1..10}; do
  node -e "
    const io = require('socket.io-client');
    const socket = io('http://localhost:3001');
    socket.on('connect', () => console.log('Connection $i: OK'));
  " &
done
```

---

## 🎯 **Production Testing Checklist**

### **Before Deployment:**
- [ ] All unit tests pass (`npm test`)
- [ ] Integration tests pass
- [ ] Load testing completed
- [ ] Security scan completed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates valid

### **After Deployment:**
- [ ] Health endpoint responds (`/health`)
- [ ] WebSocket connections work
- [ ] Database connections stable
- [ ] Redis connections stable
- [ ] Authentication working
- [ ] Race engine cycling properly
- [ ] Chat system functional
- [ ] Monitoring alerts configured

---

## 🚨 **Emergency Testing (Production Issues)**

### **Quick Health Check**
```bash
# 1-minute production health test
curl -f https://your-domain.com/health || echo "❌ Health check failed"
curl -f https://your-domain.com/api/race/state || echo "❌ API failed"
curl -I https://your-domain.com || echo "❌ Server unreachable"
```

### **WebSocket Test**
```javascript
// Run in browser console on your domain
const socket = io();
socket.on('connect', () => console.log('✅ Production WebSocket OK'));
socket.on('disconnect', () => console.log('❌ WebSocket disconnected'));
```

### **Database Check**
```bash
# If you have database access
psql $DATABASE_URL -c "SELECT COUNT(*) FROM races WHERE created_at > NOW() - INTERVAL '1 hour';"
```

---

## 📈 **Monitoring Setup**

### **Health Monitoring Script**
```bash
#!/bin/bash
# save as monitor.sh
ENDPOINT="https://your-domain.com"

while true; do
  STATUS=$(curl -s -w "%{http_code}" $ENDPOINT/health -o /dev/null)
  if [ $STATUS -eq 200 ]; then
    echo "$(date): ✅ Backend healthy"
  else
    echo "$(date): ❌ Backend unhealthy (HTTP $STATUS)"
    # Add alert logic here (email, Slack, etc.)
  fi
  sleep 30
done
```

### **Run Monitor**
```bash
chmod +x monitor.sh
./monitor.sh
```

This comprehensive testing suite ensures your backend is production-ready! 🚀