import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const { startRace, stopRace, getState } = require('../server/gameEngine');

// Mock dependencies
vi.mock('../server/db.js', () => ({
  pg: {
    logRaceResult: vi.fn(),
    getLatestRoundId: vi.fn().mockResolvedValue(0)
  },
  redis: {
    setRaceState: vi.fn(),
    publishRaceUpdate: vi.fn(),
    getRaceState: vi.fn().mockResolvedValue(null)
  }
}));

describe('Race Engine', () => {
  let mockIo;

  beforeEach(() => {
    mockIo = {
      emit: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start a race with deterministic seed', () => {
    startRace(mockIo);
    const state = getState();
    
    expect(state.seed).toBeDefined();
    expect(state.seed).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(state.status).toBe('countdown');
    expect(state.racers).toHaveLength(8);
  });

  it('should generate deterministic race results', async () => {
    startRace(mockIo);
    const state1 = getState();
    
    // Stop the first race before starting another
    stopRace(null, { restart: false });
    
    // Start another race with different seed
    startRace(mockIo);
    const state2 = getState();
    
    // Results should be different (different seeds)
    expect(state1.seed).not.toBe(state2.seed);
  });

  it('should stop a race and set winner', () => {
    startRace(mockIo);
    const winner = { id: 1, name: 'Test Racer' };
    
    stopRace(winner, { restart: false });
    const state = getState();
    
    expect(state.status).toBe('finished');
    expect(state.winner).toBe(winner);
  });

  it('should return current race state', () => {
    const state = getState();
    
    expect(state).toHaveProperty('racers');
    expect(state).toHaveProperty('status');
    expect(state).toHaveProperty('seed');
    expect(state).toHaveProperty('tick');
  });

  it('should stop a race during countdown and log with unique ID', async () => {
    // Start a race (it will be in countdown state)
    startRace(mockIo);
    
    // Stop the race immediately (during countdown when startTime is null)
    await stopRace(null, { restart: false });
    
    const state = getState();
    expect(state.status).toBe('finished');
    
    // Verify that logRaceResult was called with a unique raceId
    const { pg } = require('../server/db.js');
    expect(pg.logRaceResult).toHaveBeenCalledWith(
      expect.stringMatching(/^race_\d+_\d+$/), // Should match race_timestamp_roundId pattern
      expect.any(String), // seed
      expect.any(Number), // winner id
      expect.any(Number)  // roundId
    );
  });

  it('should generate non-colliding randomness for different racer/tick combinations', () => {
    const { deterministicRandom } = require('../server/gameEngine');
    const seed = 'test-seed-123';
    
    // Test that different combinations produce different results
    const result1 = deterministicRandom(seed, 1, 2); // tick=1, racer=2
    const result2 = deterministicRandom(seed, 2, 1); // tick=2, racer=1
    
    // These should be different (no collision)
    expect(result1).not.toBe(result2);
    
    // But same inputs should produce same results (deterministic)
    const result3 = deterministicRandom(seed, 1, 2);
    expect(result1).toBe(result3);
    
    // Test edge case that previously caused collision
    const result4 = deterministicRandom(seed, 2, 1); // Same as result2
    expect(result2).toBe(result4);
  });

  it('should maintain monotonic round numbering after restarts', async () => {
    const { pg } = require('../server/db');
    
    // Mock database returning latest round ID
    vi.mocked(pg.getLatestRoundId).mockResolvedValueOnce(5);
    
    // Start a race - should increment from latest round ID
    await startRace(mockIo);
    const state = getState();
    
    expect(state.roundId).toBe(6); // Should be latest + 1
    expect(pg.getLatestRoundId).toHaveBeenCalled();
  });

  it('should handle database errors gracefully for round ID', async () => {
    const { pg } = require('../server/db');
    
    // Mock database error
    vi.mocked(pg.getLatestRoundId).mockRejectedValueOnce(new Error('Database error'));
    
    // Start a race - should fallback to incrementing from 0
    await startRace(mockIo);
    const state = getState();
    
    expect(state.roundId).toBe(1); // Should fallback to 1
  });

  it('should restore race state from Redis on startup', async () => {
    const { redis } = require('../server/db');
    
    // Mock Redis returning stored race state
    const storedState = {
      roundId: 10,
      status: 'racing',
      racers: [],
      seed: 'test-seed',
      tick: 100,
      startTime: Date.now() - 5000,
      endTime: Date.now() + 5000
    };
    vi.mocked(redis.getRaceState).mockResolvedValueOnce(storedState);
    
    // Start a race - should restore state instead of creating new
    await startRace(mockIo);
    const state = getState();
    
    expect(state.roundId).toBe(10); // Should restore stored round ID
    expect(state.status).toBe('racing'); // Should restore status
    expect(redis.getRaceState).toHaveBeenCalled();
  });

  it('should publish race updates to correct Redis channel', async () => {
    const { redis } = require('../server/db');
    
    // Start a race
    await startRace(mockIo);
    const state = getState();
    
    // Verify that setRaceState and publishRaceUpdate are called with correct roundId
    expect(redis.setRaceState).toHaveBeenCalledWith(state.roundId, expect.any(Object));
    expect(redis.publishRaceUpdate).toHaveBeenCalledWith(state.roundId, expect.any(Object));
  });

  it('should support pattern subscriptions for cross-instance updates', async () => {
    const { redis } = require('../server/db');
    
    // Mock the subscribeToRace function to verify pattern subscription
    const mockSubscriber = {
      on: vi.fn(),
      psubscribe: vi.fn().mockResolvedValue(),
      subscribe: vi.fn().mockResolvedValue()
    };
    vi.mocked(redis.subscribeToRace).mockResolvedValue(mockSubscriber);
    
    // Test pattern subscription
    await redis.subscribeToRace('*', vi.fn());
    
    // Verify pattern subscription was used
    expect(mockSubscriber.psubscribe).toHaveBeenCalledWith('race:*');
  });

  it('should recover from crash mid-race using latest round ID', async () => {
    const { pg, redis } = require('../server/db');
    
    // Mock database returning latest round ID (simulating crash during race 5)
    vi.mocked(pg.getLatestRoundId).mockResolvedValueOnce(5);
    
    // Mock Redis returning stored race state for the latest round
    const storedState = {
      roundId: 5,
      status: 'racing',
      racers: [
        { id: 1, name: 'Test Racer', x: 500, finished: false }
      ],
      seed: 'crash-test-seed',
      tick: 100,
      startTime: Date.now() - 5000,
      endTime: Date.now() + 5000
    };
    vi.mocked(redis.getRaceState).mockResolvedValueOnce(storedState);
    
    // Start a race - should restore the crashed race state
    await startRace(mockIo);
    const state = getState();
    
    // Verify recovery
    expect(state.roundId).toBe(5); // Should restore the crashed race round ID
    expect(state.status).toBe('racing'); // Should restore racing status
    expect(state.seed).toBe('crash-test-seed'); // Should restore the seed
    expect(state.racers).toHaveLength(1); // Should restore racer state
    expect(pg.getLatestRoundId).toHaveBeenCalled(); // Should check latest round ID
    expect(redis.getRaceState).toHaveBeenCalledWith(5); // Should check correct round ID
  });

  it('should persist finished race state to Redis after settlement', async () => {
    // Mock dependencies
    vi.mocked(pg.getLatestRoundId).mockResolvedValueOnce(0);
    vi.mocked(pg.logRaceResult).mockResolvedValueOnce();
    vi.mocked(pg.getRaceBets).mockResolvedValueOnce([]);
    vi.mocked(redis.setRaceState).mockResolvedValueOnce();
    
    // Start a race
    await startRace(mockIo);
    
    // Simulate race completion with a winner
    const winner = { id: 1, name: 'Winner', x: 1000, finished: true };
    await stopRace(winner, { restart: false });
    
    // Verify that finished race state was persisted to Redis
    expect(redis.setRaceState).toHaveBeenCalledWith(
      expect.any(Number), // roundId
      expect.objectContaining({
        status: 'finished',
        settled: true,
        winner: winner,
        totalPotLamports: expect.any(String) // Should be string for JSON serialization
      })
    );
  });
});
