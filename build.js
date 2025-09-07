const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

// Read the config.js file
const configPath = path.join(__dirname, 'public', 'js', 'config.js');
let configContent = fs.readFileSync(configPath, 'utf8');

// Replace placeholders with environment variables
configContent = configContent.replace(
  /PRIVY_APP_ID: '<YOUR_PRIVY_APP_ID>'/g,
  `PRIVY_APP_ID: '${process.env.PRIVY_APP_ID || '<YOUR_PRIVY_APP_ID>'}'`
);

// Write the updated config.js file
fs.writeFileSync(configPath, configContent);

console.log('✅ HTML file updated with environment variables');
