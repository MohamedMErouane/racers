const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

// Check required environment variables
if (!process.env.PRIVY_APP_ID) {
  console.error('❌ PRIVY_APP_ID environment variable is required');
  console.error('Please set PRIVY_APP_ID before running npm run build');
  process.exit(1);
}

if (!process.env.WS_URL) {
  console.error('❌ WS_URL environment variable is required');
  console.error('Please set WS_URL before running npm run build');
  process.exit(1);
}

if (!process.env.API_URL) {
  console.error('❌ API_URL environment variable is required');
  console.error('Please set API_URL before running npm run build');
  process.exit(1);
}

// Read the config template file
const templatePath = path.join(__dirname, 'public', 'js', 'config.template.js');
const configPath = path.join(__dirname, 'public', 'js', 'config.js');

let configContent = fs.readFileSync(templatePath, 'utf8');

// Use environment variables (validation ensures they exist)
const wsUrl = process.env.WS_URL;
const apiUrl = process.env.API_URL;

// Replace placeholders with environment variables and generated URLs
configContent = configContent.replace(
  /PRIVY_APP_ID: '<YOUR_PRIVY_APP_ID>'/g,
  `PRIVY_APP_ID: '${process.env.PRIVY_APP_ID}'`
);

configContent = configContent.replace(
  /WS_URL: '<WS_URL>'/g,
  `WS_URL: '${wsUrl}'`
);

configContent = configContent.replace(
  /API_URL: '<API_URL>'/g,
  `API_URL: '${apiUrl}'`
);

// Write the generated config.js file
fs.writeFileSync(configPath, configContent);

console.log('✅ Config file generated with environment variables');
console.log(`   WS_URL: ${wsUrl}`);
console.log(`   API_URL: ${apiUrl}`);
