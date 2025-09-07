import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const { startRace, stopRace, getState } = require('../server/gameEngine');

// Mock dependencies
vi.mock('../server/db.js', () => ({
  pg: {
    logRaceResult: vi.fn()
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
});
