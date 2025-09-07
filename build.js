const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

// Read the HTML file
const htmlPath = path.join(__dirname, 'public', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Replace placeholders with environment variables
htmlContent = htmlContent.replace(
  /PRIVY_APP_ID: '<YOUR_PRIVY_APP_ID>'/g,
  `PRIVY_APP_ID: '${process.env.PRIVY_APP_ID || '<YOUR_PRIVY_APP_ID>'}'`
);

// Write the updated HTML file
fs.writeFileSync(htmlPath, htmlContent);

console.log('✅ HTML file updated with environment variables');
