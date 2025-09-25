// Quick Solana Wallet Generator for Testing
// Run with: node generate-wallet.js

const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

console.log('🎌 Generating Solana Test Wallet...\n');

// Generate a new keypair
const keypair = Keypair.generate();

// Get the public key (wallet address)
const publicKey = keypair.publicKey.toString();

// Get the private key (secret key) as array
const secretKey = Array.from(keypair.secretKey);

// Get the private key as base58 string (for Phantom wallet import)
const bs58 = require('bs58');
const base58PrivateKey = bs58.default.encode(keypair.secretKey);

console.log('✅ Wallet Generated Successfully!\n');
console.log('📍 PUBLIC KEY (Wallet Address):');
console.log(publicKey);
console.log('\n🔑 PRIVATE KEY (Keep Secret!):');
console.log('[' + secretKey.join(',') + ']');
console.log('\n🔑 PRIVATE KEY (Base58 - for Phantom):');
console.log(base58PrivateKey);

// Save to file for easy access
const walletData = {
    publicKey: publicKey,
    secretKey: secretKey,
    base58PrivateKey: base58PrivateKey,
    network: 'devnet',
    created: new Date().toISOString()
};

fs.writeFileSync('test-wallet.json', JSON.stringify(walletData, null, 2));

console.log('\n💾 Wallet saved to: test-wallet.json');

console.log('\n🚀 Next Steps:');
console.log('1. Install Phantom wallet browser extension');
console.log('2. Import wallet using the Base58 private key above');
console.log('3. Switch to Devnet in Phantom settings');
console.log('4. Get test SOL: https://faucet.solana.com');
console.log('5. Enter your wallet address to get free devnet SOL');

console.log('\n🎯 For Client Demo:');
console.log('- Use this wallet address in your .env file');
console.log('- Update PHANTOM_PRIVATE_KEY with the Base58 key');
console.log('- Your racing platform can now test deposits/withdrawals!');

// Update .env file automatically
const envPath = '.env';
if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update the phantom private key if it exists
    if (envContent.includes('PHANTOM_PRIVATE_KEY=')) {
        envContent = envContent.replace(
            /PHANTOM_PRIVATE_KEY=.*/,
            `PHANTOM_PRIVATE_KEY=${base58PrivateKey}`
        );
    } else {
        envContent += `\n# Test Wallet\nPHANTOM_PRIVATE_KEY=${base58PrivateKey}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Updated .env file with your test wallet private key');
}