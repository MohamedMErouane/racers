
// lib/privy.js
import { PrivyClient } from '@privy-io/server-auth';
import * as jose from 'jose';
const APP_ID = process.env.PRIVY_APP_ID || 'cmermm5bm003bjo0bgsoffojs';
const APP_SECRET = process.env.PRIVY_APP_SECRET || 'KM9Y2BNjviK7dhdYHTswsYRWBxkDAZZGD7RsRBHBYTLYEKxUGYrfS5Tz33iAKMkZSPumsCrb5dFwhLJdGHetfK4';
const JWKS_URL = process.env.PRIVY_JWKS_URL || 'https://auth.privy.io/api/v1/apps/cmermm5bm003bjo0bgsoffojs/jwks.json';
const privy = new PrivyClient({ appId: APP_ID, appSecret: APP_SECRET });
async function verifyWithServerAuth(token) { return await privy.verifyAuthToken(token); }
async function verifyWithJWKS(token) {
  const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL));
  const { payload } = await jose.jwtVerify(token, JWKS, { issuer:'https://auth.privy.io', audience: APP_ID });
  return payload;
}
export async function verifyPrivyToken(token) { try { return await verifyWithServerAuth(token); } catch { return await verifyWithJWKS(token); } }
export function getBearerToken(req) {
  const a=req.headers['authorization']||req.headers['Authorization']; if(a&&a.startsWith('Bearer ')) return a.slice(7);
  const cookie=req.headers['cookie']||''; const m=cookie.match(/(?:^|;\s*)privy-token=([^;]+)/); return m?decodeURIComponent(m[1]):null;
}
