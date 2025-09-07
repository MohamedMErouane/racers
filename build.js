const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

// Read the config template file
const templatePath = path.join(__dirname, 'public', 'js', 'config.template.js');
const configPath = path.join(__dirname, 'public', 'js', 'config.js');

let configContent = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders with environment variables
configContent = configContent.replace(
  /PRIVY_APP_ID: '<YOUR_PRIVY_APP_ID>'/g,
  `PRIVY_APP_ID: '${process.env.PRIVY_APP_ID || '<YOUR_PRIVY_APP_ID>'}'`
);

// Write the generated config.js file
fs.writeFileSync(configPath, configContent);

console.log('✅ Config file generated with environment variables');
