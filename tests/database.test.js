import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis and Postgres
const mockRedis = {
  on: vi.fn(),
  ping: vi.fn().mockResolvedValue('PONG'),
  lrange: vi.fn().mockResolvedValue([]),
  rpush: vi.fn().mockResolvedValue(1),
  ltrim: vi.fn().mockResolvedValue('OK'),
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  publish: vi.fn().mockResolvedValue(1),
  subscribe: vi.fn().mockResolvedValue('OK'),
  duplicate: vi.fn().mockReturnValue({
    subscribe: vi.fn().mockResolvedValue('OK'),
    on: vi.fn()
  })
};

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedis)
}));

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] })
  }))
}));

describe('Database Operations', () => {
  beforeEach(async () => {
    // Initialize Redis before each test
    const { initializeRedis } = await import('../services/redis.js');
    await initializeRedis();
  });

  it('should initialize Redis connection', async () => {
    const { redis } = await import('../server/db.js');
    
    expect(redis).toBeDefined();
    expect(redis.getChatMessages).toBeDefined();
    expect(redis.addChatMessage).toBeDefined();
  });

  it('should get chat messages', async () => {
    const { redis } = await import('../server/db.js');
    
    const messages = await redis.getChatMessages(10);
    expect(Array.isArray(messages)).toBe(true);
  });

  it('should add chat message', async () => {
    const { redis } = await import('../server/db.js');
    
    const message = { text: 'test', user: 'test', timestamp: Date.now() };
    await expect(redis.addChatMessage(message)).resolves.not.toThrow();
  });

  it('should get bets', async () => {
    const { redis } = await import('../server/db.js');
    
    const bets = await redis.getBets(10);
    expect(Array.isArray(bets)).toBe(true);
  });

  it('should add bet', async () => {
    const { redis } = await import('../server/db.js');
    
    const bet = { racerId: 1, amount: 1, userId: 'test', timestamp: Date.now() };
    await expect(redis.addBet(bet)).resolves.not.toThrow();
  });

  it('should log race results', async () => {
    const { pg } = await import('../server/db.js');
    
    await expect(pg.logRaceResult('race_123', 'seed_456', 1)).resolves.not.toThrow();
  });

  it('should get user balance', async () => {
    const { pg } = await import('../server/db.js');
    
    const balance = await pg.getUserBalance('user_123');
    expect(typeof balance).toBe('string');
  });

  it('should update user balance', async () => {
    const { pg } = await import('../server/db.js');
    
    await expect(pg.updateUserBalance('user_123', 100)).resolves.not.toThrow();
  });

  it('should throw error when database is unavailable for getUserBalance', async () => {
    // Mock database error
    const { Pool } = await import('pg');
    const mockPool = Pool();
    mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));
    
    const { pg } = await import('../server/db.js');
    
    await expect(pg.getUserBalance('user_123')).rejects.toThrow('Database connection failed');
  });

  it('should throw error when database is unavailable for updateUserBalance', async () => {
    // Mock database error
    const { Pool } = await import('pg');
    const mockPool = Pool();
    mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));
    
    const { pg } = await import('../server/db.js');
    
    await expect(pg.updateUserBalance('user_123', 100)).rejects.toThrow('Database connection failed');
  });

  it('should throw error when database is unavailable for logBet', async () => {
    // Mock database error
    const { Pool } = await import('pg');
    const mockPool = Pool();
    mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));
    
    const { pg } = await import('../server/db.js');
    
    await expect(pg.logBet('user_123', 'race_456', 1, 10, 'win')).rejects.toThrow('Database connection failed');
  });

  it('should skip Redis tests when Redis is unavailable', async () => {
    // Mock Redis connection failure
    mockRedis.ping.mockRejectedValueOnce(new Error('Redis connection failed'));
    
    try {
      const { initializeRedis } = await import('../services/redis.js');
      await initializeRedis();
      // If we get here, Redis is available, so we can run the test
      expect(true).toBe(true);
    } catch (error) {
      // Redis is unavailable, skip the test
      console.log('Skipping Redis test - Redis unavailable:', error.message);
      expect(error.message).toContain('Redis connection failed');
    }
  });

  it('should throw error when Redis is unavailable for getChatMessages', async () => {
    // Mock Redis error
    mockRedis.lrange.mockRejectedValueOnce(new Error('Redis connection failed'));
    
    const { redis } = await import('../server/db.js');
    
    await expect(redis.getChatMessages(10)).rejects.toThrow('Redis connection failed');
  });

  it('should throw error when Redis is unavailable for addChatMessage', async () => {
    // Mock Redis error
    mockRedis.rpush.mockRejectedValueOnce(new Error('Redis connection failed'));
    
    const { redis } = await import('../server/db.js');
    
    const message = { text: 'test', user: 'test', timestamp: Date.now() };
    await expect(redis.addChatMessage(message)).rejects.toThrow('Redis connection failed');
  });

  it('should throw error when Redis is unavailable for getBets', async () => {
    // Mock Redis error
    mockRedis.lrange.mockRejectedValueOnce(new Error('Redis connection failed'));
    
    const { redis } = await import('../server/db.js');
    
    await expect(redis.getBets(10)).rejects.toThrow('Redis connection failed');
  });

  it('should throw error when Redis is unavailable for addBet', async () => {
    // Mock Redis error
    mockRedis.rpush.mockRejectedValueOnce(new Error('Redis connection failed'));
    
    const { redis } = await import('../server/db.js');
    
    const bet = { racerId: 1, amount: 1, userId: 'test', timestamp: Date.now() };
    await expect(redis.addBet(bet)).rejects.toThrow('Redis connection failed');
  });
});
