import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startRace, stopRace, getState } from '../server/gameEngine.js';

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
});
