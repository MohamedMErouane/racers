import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
const apiRoutes = require('../routes/api.js');

// Mock dependencies
vi.mock('../server/db.js', () => ({
  redis: {
    getChatMessages: vi.fn().mockResolvedValue([]),
    addChatMessage: vi.fn(),
    getBets: vi.fn().mockResolvedValue([]),
    addBet: vi.fn()
  },
  pg: {
    getUserBalance: vi.fn().mockResolvedValue(0),
    updateUserBalance: vi.fn(),
    logBet: vi.fn()
  }
}));

vi.mock('../server/solana.js', () => ({
  buildDepositTransaction: vi.fn().mockResolvedValue({ success: true }),
  processDepositTransaction: vi.fn().mockResolvedValue({ success: true }),
  buildWithdrawTransaction: vi.fn().mockResolvedValue({ success: true }),
  processWithdrawTransaction: vi.fn().mockResolvedValue({ success: true }),
  getVaultBalance: vi.fn().mockResolvedValue(0),
  initializeVault: vi.fn().mockResolvedValue({ success: true })
}));

describe('API Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);
    
    // Mock game engine
    app.set('gameEngine', {
      getState: vi.fn().mockReturnValue({
        racers: [],
        status: 'idle',
        seed: null,
        tick: 0
      }),
      startRace: vi.fn(),
      stopRace: vi.fn()
    });
  });

  it('should get race state', async () => {
    const response = await request(app)
      .get('/api/race/state')
      .expect(200);
    
    expect(response.body).toHaveProperty('racers');
    expect(response.body).toHaveProperty('status');
  });

  it('should require authentication for race start', async () => {
    await request(app)
      .post('/api/race/start')
      .expect(401);
  });

  it('should require authentication for race stop', async () => {
    await request(app)
      .post('/api/race/stop')
      .expect(401);
  });

  it('should get chat messages', async () => {
    const response = await request(app)
      .get('/api/chat')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should validate chat message input', async () => {
    await request(app)
      .post('/api/chat')
      .send({ message: '', userId: 'test', username: 'test' })
      .expect(400);
  });

  it('should get bets', async () => {
    const response = await request(app)
      .get('/api/bets')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should require authentication for bet placement', async () => {
    await request(app)
      .post('/api/bets')
      .send({ racerId: 1, amount: 1, userId: 'test' })
      .expect(401);
  });

  it('should reject withdraw build when amount exceeds off-chain balance', async () => {
    // Mock user with insufficient balance
    const mockUser = { address: 'test-user-address' };
    const mockReq = { user: mockUser };
    
    // Mock getUserBalance to return insufficient balance
    const { pg } = require('../server/db');
    vi.mocked(pg.getUserBalance).mockResolvedValueOnce(5.0); // User has 5 SOL
    
    const response = await request(app)
      .post('/api/vault/withdraw/build')
      .set('Authorization', 'Bearer valid-token')
      .send({ amount: 10.0 }) // Requesting 10 SOL (more than available)
      .expect(400);
    
    expect(response.body.error).toBe('Insufficient balance');
    expect(response.body.currentBalance).toBe(5.0);
    expect(response.body.requestedAmount).toBe(10.0);
  });

  it('should allow withdraw build when amount is within off-chain balance', async () => {
    // Mock user with sufficient balance
    const mockUser = { address: 'test-user-address' };
    const mockReq = { user: mockUser };
    
    // Mock getUserBalance to return sufficient balance
    const { pg } = require('../server/db');
    vi.mocked(pg.getUserBalance).mockResolvedValueOnce(15.0); // User has 15 SOL
    
    // Mock buildWithdrawTransaction to return success
    const solana = require('../server/solana');
    vi.mocked(solana.buildWithdrawTransaction).mockResolvedValueOnce({
      success: true,
      transaction: 'mock-transaction'
    });
    
    const response = await request(app)
      .post('/api/vault/withdraw/build')
      .set('Authorization', 'Bearer valid-token')
      .send({ amount: 10.0 }) // Requesting 10 SOL (within available balance)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.transaction).toBe('mock-transaction');
  });

  it('should log bets with real race ID instead of placeholder', async () => {
    // Mock game engine state
    const gameEngine = require('../server/gameEngine');
    const mockRaceState = {
      roundId: 123,
      startTime: 1234567890,
      status: 'racing'
    };
    vi.mocked(gameEngine.getState).mockReturnValue(mockRaceState);
    
    // Mock user with sufficient balance
    const { pg } = require('../server/db');
    vi.mocked(pg.getUserBalance).mockResolvedValueOnce(10.0);
    vi.mocked(pg.updateUserBalance).mockResolvedValueOnce();
    vi.mocked(pg.logBet).mockResolvedValueOnce();
    
    // Mock Redis
    const { redis } = require('../server/db');
    vi.mocked(redis.addBet).mockResolvedValueOnce();
    
    await request(app)
      .post('/api/bets')
      .set('Authorization', 'Bearer valid-token')
      .send({ racerId: 1, amount: 5.0 })
      .expect(200);
    
    // Verify logBet was called with real race ID
    expect(pg.logBet).toHaveBeenCalledWith(
      'test-user-address',
      'race_1234567890', // Real race ID format
      1,
      5.0,
      'pending'
    );
  });

  it('should reject bets when race is not in countdown phase', async () => {
    // Mock game engine state with racing status
    const gameEngine = require('../server/gameEngine');
    const mockRaceState = {
      roundId: 123,
      startTime: 1234567890,
      status: 'racing' // Not countdown
    };
    vi.mocked(gameEngine.getState).mockReturnValue(mockRaceState);
    
    // Mock user with sufficient balance
    const { pg } = require('../server/db');
    vi.mocked(pg.getUserBalance).mockResolvedValueOnce(10.0);
    
    const response = await request(app)
      .post('/api/bets')
      .set('Authorization', 'Bearer valid-token')
      .send({ racerId: 1, amount: 5.0 })
      .expect(400);
    
    expect(response.body.error).toBe('Bets are only accepted during countdown phase');
    expect(response.body.currentRaceStatus).toBe('racing');
  });

  it('should accept bets when race is in countdown phase', async () => {
    // Mock game engine state with countdown status
    const gameEngine = require('../server/gameEngine');
    const mockRaceState = {
      roundId: 123,
      startTime: 1234567890,
      status: 'countdown' // Allow bets
    };
    vi.mocked(gameEngine.getState).mockReturnValue(mockRaceState);
    
    // Mock user with sufficient balance
    const { pg } = require('../server/db');
    vi.mocked(pg.getUserBalance).mockResolvedValueOnce(10.0);
    vi.mocked(pg.updateUserBalance).mockResolvedValueOnce();
    vi.mocked(pg.logBet).mockResolvedValueOnce();
    
    const { redis } = require('../server/db');
    vi.mocked(redis.addBet).mockResolvedValueOnce();
    
    const response = await request(app)
      .post('/api/bets')
      .set('Authorization', 'Bearer valid-token')
      .send({ racerId: 1, amount: 5.0 })
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });

  it('should return race state with non-zero pot without BigInt serialization errors', async () => {
    // Mock game engine with non-zero pot
    const mockGameEngine = {
      getState: vi.fn().mockReturnValue({
        racers: [],
        status: 'racing',
        seed: 'test-seed',
        tick: 10,
        startTime: Date.now(),
        endTime: Date.now() + 12000,
        winner: null,
        roundId: 1,
        raceId: 'race_1',
        countdownStartTime: null,
        settled: false,
        totalPotLamports: '1000000000', // 1 SOL in lamports as string
        totalBets: 5
      })
    };

    app.set('gameEngine', mockGameEngine);

    const response = await request(app)
      .get('/api/race/state')
      .expect(200);

    expect(response.body.totalPotLamports).toBe('1000000000');
    expect(response.body.totalBets).toBe(5);
    expect(response.body.status).toBe('racing');
    // Ensure no BigInt serialization errors occur
    expect(JSON.stringify(response.body)).not.toContain('BigInt');
  });

  it('should return race state with current pot totals for mid-race requests', async () => {
    // Mock game engine with mid-race state including pot totals
    const mockGameEngine = {
      getState: vi.fn().mockReturnValue({
        racers: [
          { id: 1, name: 'Racer 1', x: 500, finished: false },
          { id: 2, name: 'Racer 2', x: 300, finished: false }
        ],
        status: 'racing',
        seed: 'mid-race-seed',
        tick: 50,
        startTime: Date.now() - 5000,
        endTime: Date.now() + 7000,
        winner: null,
        roundId: 2,
        raceId: 'race_2',
        countdownStartTime: null,
        settled: false,
        totalPotLamports: '2500000000', // 2.5 SOL in lamports as string
        totalPot: 2.5, // Numeric total pot for clients
        totalBets: 8 // Number of bets placed
      })
    };

    app.set('gameEngine', mockGameEngine);

    const response = await request(app)
      .get('/api/race/state')
      .expect(200);

    // Verify pot totals are included for late-joining clients
    expect(response.body.totalPot).toBe(2.5);
    expect(response.body.totalBets).toBe(8);
    expect(response.body.totalPotLamports).toBe('2500000000');
    expect(response.body.status).toBe('racing');
    expect(response.body.racers).toHaveLength(2);
  });

  it('should reject requests with wallet-less Privy tokens', async () => {
    // Mock Privy token verification to return payload without address
    vi.mocked(verifyPrivyToken).mockResolvedValueOnce({
      userId: 'test-user-id',
      email: 'test@example.com',
      // No address field - wallet not connected
    });

    const response = await request(app)
      .post('/api/bets')
      .set('Authorization', 'Bearer valid-token')
      .send({ racerId: 1, amount: 1.0 })
      .expect(400);

    expect(response.body.error).toBe('Wallet not connected. Please connect your wallet to continue.');
  });
});
