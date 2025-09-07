const { PrivyClient } = require('@privy-io/server-auth');
const jose = require('jose');

// Get environment variables
const APP_ID = process.env.PRIVY_APP_ID;
const APP_SECRET = process.env.PRIVY_APP_SECRET;
const JWKS_URL = process.env.PRIVY_JWKS_URL;

if (!APP_ID || !APP_SECRET || !JWKS_URL) {
  throw new Error('Missing required Privy environment variables: PRIVY_APP_ID, PRIVY_APP_SECRET, PRIVY_JWKS_URL');
}

// Initialize Privy client
const privy = new PrivyClient({ 
  appId: APP_ID, 
  appSecret: APP_SECRET 
});

// Verify token using server auth
async function verifyWithServerAuth(token) {
  try {
    return await privy.verifyAuthToken(token);
  } catch (error) {
    console.error('Server auth verification failed:', error);
    throw error;
  }
}

// Verify token using JWKS
async function verifyWithJWKS(token) {
  try {
    const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL));
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: 'https://auth.privy.io',
      audience: APP_ID
    });
    return payload;
  } catch (error) {
    console.error('JWKS verification failed:', error);
    throw error;
  }
}

// Main token verification function
async function verifyPrivyToken(token) {
  try {
    // Try server auth first
    return await verifyWithServerAuth(token);
  } catch (error) {
    // Fallback to JWKS verification
    return await verifyWithJWKS(token);
  }
}

// Extract Bearer token from request
function getBearerToken(req) {
  // Check Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Check cookie
  const cookie = req.headers['cookie'] || '';
  const match = cookie.match(/(?:^|;\s*)privy-token=([^;]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  
  return null;
}

module.exports = {
  verifyPrivyToken,
  getBearerToken
};
