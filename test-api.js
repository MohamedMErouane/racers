// 🧪 Quick Backend API Test
// Run this in Node.js to test your backend APIs

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

class BackendTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async test(name, testFunction) {
    try {
      console.log(`🔍 Testing: ${name}`);
      await testFunction();
      console.log(`✅ PASSED: ${name}`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${name} - ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Backend API Tests...\n');

    // Test 1: Health Check
    await this.test('Health Endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      if (response.status !== 200) throw new Error('Health check failed');
      if (!response.data.status) throw new Error('No status in response');
    });

    // Test 2: Race State API
    await this.test('Race State API', async () => {
      const response = await axios.get(`${BASE_URL}/api/race/state`);
      if (response.status !== 200) throw new Error('Race state API failed');
      if (!response.data.status) throw new Error('No race status in response');
    });

    // Test 3: Chat Messages API
    await this.test('Chat Messages API', async () => {
      const response = await axios.get(`${BASE_URL}/api/chat/messages`);
      if (response.status !== 200) throw new Error('Chat API failed');
      if (!Array.isArray(response.data)) throw new Error('Chat response not an array');
    });

    // Test 4: WebSocket Connection
    await this.test('WebSocket Connection', () => {
      return new Promise((resolve, reject) => {
        const socket = io(BASE_URL, { timeout: 5000 });
        
        socket.on('connect', () => {
          socket.disconnect();
          resolve();
        });
        
        socket.on('connect_error', (error) => {
          reject(new Error(`WebSocket connection failed: ${error.message}`));
        });

        setTimeout(() => {
          socket.disconnect();
          reject(new Error('WebSocket connection timeout'));
        }, 5000);
      });
    });

    // Test 5: Race Events
    await this.test('Race WebSocket Events', () => {
      return new Promise((resolve, reject) => {
        const socket = io(BASE_URL);
        let receivedRaceState = false;
        
        socket.on('connect', () => {
          // Request race state
          socket.emit('join_race');
        });
        
        socket.on('race:state', (data) => {
          if (data && data.status) {
            receivedRaceState = true;
            socket.disconnect();
            resolve();
          }
        });
        
        socket.on('connect_error', (error) => {
          reject(new Error(`WebSocket error: ${error.message}`));
        });

        setTimeout(() => {
          socket.disconnect();
          if (!receivedRaceState) {
            reject(new Error('No race state received'));
          }
        }, 5000);
      });
    });

    // Test 6: API Response Times
    await this.test('API Response Times', async () => {
      const start = Date.now();
      await axios.get(`${BASE_URL}/health`);
      const responseTime = Date.now() - start;
      
      if (responseTime > 1000) {
        throw new Error(`Slow response time: ${responseTime}ms (should be <1000ms)`);
      }
    });

    // Test 7: CORS Headers
    await this.test('CORS Headers', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      const corsHeader = response.headers['access-control-allow-origin'];
      if (!corsHeader) {
        throw new Error('Missing CORS headers');
      }
    });

    // Test 8: Error Handling
    await this.test('Error Handling', async () => {
      try {
        await axios.get(`${BASE_URL}/api/nonexistent`);
        throw new Error('Should have returned 404');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          // Expected 404 error
          return;
        }
        throw error;
      }
    });

    // Test 9: Rate Limiting (if enabled)
    await this.test('Rate Limiting', async () => {
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(axios.get(`${BASE_URL}/health`).catch(e => e.response));
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r && r.status === 429);
      
      // Should have some rate limiting, but allow if not configured
      console.log(`   📊 Rate limit responses: ${rateLimitedResponses.length}/20`);
    });

    // Test 10: Content Type Headers
    await this.test('Content Type Headers', async () => {
      const response = await axios.get(`${BASE_URL}/api/race/state`);
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid content type header');
      }
    });

    this.printResults();
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🎯 Overall Status:', this.results.failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    if (this.results.failed === 0) {
      console.log('🚀 Your backend is ready for production!');
    } else {
      console.log('🔧 Please fix the failing tests before deployment.');
    }
  }
}

// Run tests
async function main() {
  if (require.main === module) {
    const tester = new BackendTester();
    try {
      await tester.runAllTests();
    } catch (error) {
      console.error('Test runner error:', error.message);
      process.exit(1);
    }
  }
}

main();

module.exports = BackendTester;