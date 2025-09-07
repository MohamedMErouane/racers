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

// Read the config template file
const templatePath = path.join(__dirname, 'public', 'js', 'config.template.js');
const configPath = path.join(__dirname, 'public', 'js', 'config.js');

let configContent = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders with environment variables
configContent = configContent.replace(
  /PRIVY_APP_ID: '<YOUR_PRIVY_APP_ID>'/g,
  `PRIVY_APP_ID: '${process.env.PRIVY_APP_ID}'`
);

// Write the generated config.js file
fs.writeFileSync(configPath, configContent);

console.log('✅ Config file generated with environment variables');
