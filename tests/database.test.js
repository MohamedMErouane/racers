import { describe, it, expect, vi } from 'vitest';

// Mock Redis and Postgres
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
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
  }))
}));

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] })
  }))
}));

describe('Database Operations', () => {
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
    expect(typeof balance).toBe('number');
  });

  it('should update user balance', async () => {
    const { pg } = await import('../server/db.js');
    
    await expect(pg.updateUserBalance('user_123', 100)).resolves.not.toThrow();
  });
});
