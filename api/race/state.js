
// api/race/state.js
import crypto from 'crypto';
const ROUND_MS = parseInt(process.env.RACE_ROUND_MS || '10000', 10);
const SETTLE_MS = parseInt(process.env.RACE_SETTLE_MS || '2000', 10);
const SECRET = process.env.RACE_SECRET || 'racers_secret_seed_v1';
export default async function handler(_req, res) {
  const now = Date.now();
  const roundId = Math.floor(now / ROUND_MS);
  const startedAt = roundId * ROUND_MS;
  const endsAt = startedAt + ROUND_MS;
  const phase = (now - startedAt) < (ROUND_MS - SETTLE_MS) ? 'running' : 'settling';
  const seed = crypto.createHmac('sha256', SECRET).update(String(roundId)).digest('hex');
  // derive a demo "winner" 0..3 from seed (stable per round)
  const winner = parseInt(seed.slice(0, 8), 16) % 4;
  res.status(200).json({ roundId, phase, startedAt, endsAt, periodMs: ROUND_MS, settleMs: SETTLE_MS, winner, seed });
}
