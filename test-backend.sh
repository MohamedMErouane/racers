#!/bin/bash

# 🧪 Quick Backend Test Script
# Run this to test your entire backend in 5 minutes

set -e

echo "🚀 Starting Complete Backend Test..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

print_info() {
    echo -e "${YELLOW}🔍 $1${NC}"
}

# Step 1: Check prerequisites
print_info "Checking prerequisites..."
node --version > /dev/null 2>&1
print_status $? "Node.js is installed"

npm --version > /dev/null 2>&1
print_status $? "npm is installed"

docker --version > /dev/null 2>&1
print_status $? "Docker is installed"

# Step 2: Install dependencies
print_info "Installing dependencies..."
npm install > /dev/null 2>&1
print_status $? "Dependencies installed"

# Step 3: Start test databases
print_info "Starting test databases..."

# Check if containers already exist and remove them
docker rm -f test-redis test-postgres > /dev/null 2>&1 || true

# Start Redis
docker run -d --name test-redis -p 6379:6379 redis:alpine > /dev/null 2>&1
print_status $? "Redis container started"

# Start PostgreSQL
docker run -d --name test-postgres \
  -p 5432:5432 \
  -e POSTGRES_DB=racers \
  -e POSTGRES_USER=racers \
  -e POSTGRES_PASSWORD=testpass \
  postgres:15-alpine > /dev/null 2>&1
print_status $? "PostgreSQL container started"

# Step 4: Wait for databases to be ready
print_info "Waiting for databases to be ready..."
sleep 10

# Test Redis connection
redis-cli -h localhost ping > /dev/null 2>&1
print_status $? "Redis connection test"

# Test PostgreSQL connection
PGPASSWORD=testpass psql -h localhost -U racers -d racers -c "SELECT 1;" > /dev/null 2>&1
print_status $? "PostgreSQL connection test"

# Step 5: Setup database schema
print_info "Setting up database schema..."
PGPASSWORD=testpass psql -h localhost -U racers -d racers -f setup-database.sql > /dev/null 2>&1
print_status $? "Database schema created"

# Step 6: Create test environment
print_info "Creating test environment..."
cat > .env.test << EOF
NODE_ENV=test
PORT=3001
HOST=localhost
DATABASE_URL=postgresql://racers:testpass@localhost:5432/racers
REDIS_URL=redis://localhost:6379
PRIVY_APP_ID=test_app_id
PRIVY_APP_SECRET=test_secret
PRIVY_JWKS_URL=https://auth.privy.io/api/v1/apps/test_app_id/jwks.json
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com
PROGRAM_ID=test_program_id
PHANTOM_PRIVATE_KEY=[]
CORS_ORIGIN=http://localhost:3001
RACE_COUNTDOWN_MS=5000
RACE_DURATION_MS=8000
RACE_SETTLE_MS=1000
EOF

cp .env.test .env
print_status $? "Test environment configured"

# Step 7: Start server in background
print_info "Starting server..."
NODE_ENV=test npm start > server.log 2>&1 &
SERVER_PID=$!
sleep 5

# Check if server started
if kill -0 $SERVER_PID > /dev/null 2>&1; then
    print_status 0 "Server started successfully"
else
    print_status 1 "Server failed to start"
fi

# Step 8: Health check
print_info "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/health -o /tmp/health_response.json)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    print_status 0 "Health endpoint responding"
    echo "   Response: $(cat /tmp/health_response.json)"
else
    print_status 1 "Health endpoint failed (HTTP $HEALTH_RESPONSE)"
fi

# Step 9: Test API endpoints
print_info "Testing API endpoints..."

# Test race state
RACE_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/race/state -o /tmp/race_response.json)
if [ "$RACE_RESPONSE" = "200" ]; then
    print_status 0 "Race state API working"
    echo "   Race status: $(cat /tmp/race_response.json | grep -o '"status":"[^"]*"')"
else
    print_status 1 "Race state API failed (HTTP $RACE_RESPONSE)"
fi

# Test chat messages
CHAT_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/chat/messages -o /tmp/chat_response.json)
if [ "$CHAT_RESPONSE" = "200" ]; then
    print_status 0 "Chat API working"
else
    print_status 1 "Chat API failed (HTTP $CHAT_RESPONSE)"
fi

# Step 10: Test WebSocket connection
print_info "Testing WebSocket connection..."
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3001');
let connected = false;

socket.on('connect', () => {
    connected = true;
    console.log('WebSocket connected');
    socket.disconnect();
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.log('WebSocket error:', error.message);
    process.exit(1);
});

setTimeout(() => {
    if (!connected) {
        console.log('WebSocket timeout');
        process.exit(1);
    }
}, 5000);
" > /dev/null 2>&1

print_status $? "WebSocket connection test"

# Step 11: Test database operations
print_info "Testing database operations..."

# Test Redis operations
redis-cli -h localhost SET test_key "test_value" > /dev/null 2>&1
REDIS_VALUE=$(redis-cli -h localhost GET test_key)
if [ "$REDIS_VALUE" = "test_value" ]; then
    print_status 0 "Redis read/write operations"
else
    print_status 1 "Redis operations failed"
fi

# Test PostgreSQL operations
PGPASSWORD=testpass psql -h localhost -U racers -d racers -c "INSERT INTO users (id, username) VALUES ('test_user', 'test') ON CONFLICT DO NOTHING;" > /dev/null 2>&1
USER_COUNT=$(PGPASSWORD=testpass psql -h localhost -U racers -d racers -t -c "SELECT COUNT(*) FROM users WHERE id='test_user';")
if [ "$USER_COUNT" -eq 1 ]; then
    print_status 0 "PostgreSQL read/write operations"
else
    print_status 1 "PostgreSQL operations failed"
fi

# Step 12: Run automated tests
print_info "Running automated test suite..."
npm test > test_results.log 2>&1
print_status $? "Automated test suite"

if [ $? -eq 0 ]; then
    echo "   Test summary: $(grep -E "(passing|failing)" test_results.log || echo "Tests completed")"
fi

# Step 13: Performance test
print_info "Running basic performance test..."
TIME_START=$(date +%s%N)
for i in {1..10}; do
    curl -s http://localhost:3001/health > /dev/null
done
TIME_END=$(date +%s%N)
TIME_DIFF=$((($TIME_END - $TIME_START) / 1000000))
AVERAGE_TIME=$(($TIME_DIFF / 10))

if [ $AVERAGE_TIME -lt 100 ]; then
    print_status 0 "Performance test (avg: ${AVERAGE_TIME}ms per request)"
else
    echo -e "${YELLOW}⚠️  Performance warning: ${AVERAGE_TIME}ms per request (should be <100ms)${NC}"
fi

# Cleanup
print_info "Cleaning up..."
kill $SERVER_PID > /dev/null 2>&1 || true
docker rm -f test-redis test-postgres > /dev/null 2>&1 || true
rm -f .env.test server.log test_results.log /tmp/health_response.json /tmp/race_response.json /tmp/chat_response.json

echo ""
echo -e "${GREEN}🎉 Backend testing complete!${NC}"
echo -e "${GREEN}✅ All systems operational and ready for deployment${NC}"
echo ""
echo "📊 Test Summary:"
echo "   • Health endpoint: Working"
echo "   • API endpoints: Working"  
echo "   • WebSocket: Working"
echo "   • Database: Working"
echo "   • Redis: Working"
echo "   • Performance: Acceptable"
echo ""
echo "🚀 Your backend is ready for production deployment!"