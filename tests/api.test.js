import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import apiRoutes from '../routes/api.js';

describe('API Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);
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
});
