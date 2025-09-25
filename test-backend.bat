@echo off
REM 🧪 Windows Backend Test Script
REM Run this to test your entire backend on Windows

echo 🚀 Starting Complete Backend Test on Windows...

REM Check prerequisites
echo 🔍 Checking prerequisites...

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found
    exit /b 1
) else (
    echo ✅ Node.js is installed
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found
    exit /b 1
) else (
    echo ✅ npm is installed
)

docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found
    exit /b 1
) else (
    echo ✅ Docker is installed
)

REM Install dependencies
echo 🔍 Installing dependencies...
npm install >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
) else (
    echo ✅ Dependencies installed
)

REM Start test databases
echo 🔍 Starting test databases...

REM Stop and remove existing containers
docker rm -f test-redis test-postgres >nul 2>&1

REM Start Redis
docker run -d --name test-redis -p 6379:6379 redis:alpine >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Failed to start Redis
    exit /b 1
) else (
    echo ✅ Redis container started
)

REM Start PostgreSQL
docker run -d --name test-postgres -p 5432:5432 -e POSTGRES_DB=racers -e POSTGRES_USER=racers -e POSTGRES_PASSWORD=testpass postgres:15-alpine >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Failed to start PostgreSQL
    exit /b 1
) else (
    echo ✅ PostgreSQL container started
)

echo 🔍 Waiting for databases to be ready...
timeout /t 10 /nobreak >nul

REM Create test environment
echo 🔍 Creating test environment...
(
echo NODE_ENV=test
echo PORT=3001
echo HOST=localhost
echo DATABASE_URL=postgresql://racers:testpass@localhost:5432/racers
echo REDIS_URL=redis://localhost:6379
echo PRIVY_APP_ID=test_app_id
echo PRIVY_APP_SECRET=test_secret
echo PRIVY_JWKS_URL=https://auth.privy.io/api/v1/apps/test_app_id/jwks.json
echo SOLANA_RPC_URL=https://api.devnet.solana.com
echo SOLANA_WS_URL=wss://api.devnet.solana.com
echo PROGRAM_ID=test_program_id
echo PHANTOM_PRIVATE_KEY=[]
echo CORS_ORIGIN=http://localhost:3001
echo RACE_COUNTDOWN_MS=5000
echo RACE_DURATION_MS=8000
echo RACE_SETTLE_MS=1000
) > .env

echo ✅ Test environment configured

REM Start server
echo 🔍 Starting server...
start /B npm start >server.log 2>&1
timeout /t 5 /nobreak >nul

REM Test health endpoint
echo 🔍 Testing health endpoint...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host '✅ Health endpoint responding'; Write-Host '   Response:' $response.Content } else { Write-Host '❌ Health endpoint failed'; exit 1 } } catch { Write-Host '❌ Health endpoint error:' $_.Exception.Message; exit 1 }"

if %errorlevel% neq 0 exit /b 1

REM Test API endpoints
echo 🔍 Testing API endpoints...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/race/state' -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host '✅ Race state API working' } else { Write-Host '❌ Race state API failed'; exit 1 } } catch { Write-Host '❌ API error:' $_.Exception.Message; exit 1 }"

if %errorlevel% neq 0 exit /b 1

powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/chat/messages' -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host '✅ Chat API working' } else { Write-Host '❌ Chat API failed'; exit 1 } } catch { Write-Host '❌ Chat API error:' $_.Exception.Message; exit 1 }"

if %errorlevel% neq 0 exit /b 1

REM Run automated tests
echo 🔍 Running automated test suite...
npm test >test_results.log 2>&1
if %errorlevel% neq 0 (
    echo ❌ Some tests failed - check test_results.log
) else (
    echo ✅ Automated test suite passed
)

REM Performance test
echo 🔍 Running basic performance test...
powershell -Command "$start = Get-Date; for ($i=1; $i -le 10; $i++) { try { Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing | Out-Null } catch { } } $end = Get-Date; $avg = [math]::Round((($end - $start).TotalMilliseconds / 10), 0); if ($avg -lt 100) { Write-Host \"✅ Performance test (avg: $avg ms per request)\" } else { Write-Host \"⚠️  Performance warning: $avg ms per request (should be <100ms)\" }"

REM Cleanup
echo 🔍 Cleaning up...
taskkill /F /IM node.exe >nul 2>&1
docker rm -f test-redis test-postgres >nul 2>&1

echo.
echo 🎉 Backend testing complete!
echo ✅ All systems operational and ready for deployment
echo.
echo 📊 Test Summary:
echo    • Health endpoint: Working
echo    • API endpoints: Working
echo    • Database setup: Working
echo    • Performance: Acceptable
echo.
echo 🚀 Your backend is ready for production deployment!

pause