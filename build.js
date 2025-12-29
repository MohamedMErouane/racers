const fs = require('fs');
const path = require('path');

// Try to load dotenv, but don't fail if it's not available (Docker build)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, environment variables should come from Docker/system
  console.log('Running without dotenv (using system environment variables)');
}

// Check required environment variables and use defaults if not set
const PRIVY_APP_ID = process.env.PRIVY_APP_ID;

// Auto-detect URLs - use APP_URL if WS_URL/API_URL not explicitly set
const APP_URL = process.env.APP_URL;
let WS_URL = process.env.WS_URL;
let API_URL = process.env.API_URL;

// If APP_URL is set, derive WS_URL and API_URL from it
if (APP_URL && !WS_URL) {
  WS_URL = APP_URL.replace('https://', 'wss://').replace('http://', 'ws://');
}
if (APP_URL && !API_URL) {
  API_URL = `${APP_URL}/api`;
}

// Final defaults - use empty string to trigger auto-detection on client side
WS_URL = WS_URL || '';
API_URL = API_URL || '/api';

if (!PRIVY_APP_ID) {
  console.error('❌ PRIVY_APP_ID environment variable is required');
  console.error('Please set PRIVY_APP_ID before running npm run build');
  process.exit(1);
}

console.log('✓ Building with:');
console.log('  PRIVY_APP_ID:', PRIVY_APP_ID);
console.log('  APP_URL:', APP_URL || '(not set)');
console.log('  WS_URL:', WS_URL || '(auto-detect)');
console.log('  API_URL:', API_URL);

// Read the config template file
const templatePath = path.join(__dirname, 'public', 'js', 'config.template.js');
const configPath = path.join(__dirname, 'public', 'js', 'config.js');

let configContent = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders with environment variables
configContent = configContent.replace(
  /PRIVY_APP_ID: '<YOUR_PRIVY_APP_ID>'/g,
  `PRIVY_APP_ID: '${PRIVY_APP_ID}'`
);

configContent = configContent.replace(
  /WS_URL: '<WS_URL>'/g,
  `WS_URL: '${WS_URL}'`
);

configContent = configContent.replace(
  /API_URL: '<API_URL>'/g,
  `API_URL: '${API_URL}'`
);

// Write the generated config.js file
fs.writeFileSync(configPath, configContent);

console.log('✅ Config file generated successfully');
