
// lib/redis.js
import { Redis } from '@upstash/redis';
export const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL || 'https://great-glider-61186.upstash.io', token: process.env.UPSTASH_REDIS_REST_TOKEN || 'Ae8CAAIncDFiYmIwYjc1NTVmMDA0MWEyYTgxZDE1NjU4NTVjMzI4M3AxNjExODY' });
