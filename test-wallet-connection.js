// Simple test to verify Solana wallet initialization
require('dotenv').config();
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');

async function testWallet() {
    try {
        console.log('🔍 Testing Solana wallet initialization...');
        
        // Test connection
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        console.log('✅ Connection created');
        
        // Test private key from env
        const privateKey = process.env.PHANTOM_PRIVATE_KEY;
        if (!privateKey) {
            console.error('❌ PHANTOM_PRIVATE_KEY not found in .env');
            return;
        }
        
        console.log('✅ Private key found in .env');
        
        // Test parsing private key
        const privateKeyArray = JSON.parse(privateKey);
        console.log('✅ Private key parsed successfully');
        console.log(`   Array length: ${privateKeyArray.length}`);
        
        // Test creating keypair
        const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
        console.log('✅ Keypair created successfully');
        console.log(`   Public key: ${keypair.publicKey.toString()}`);
        
        // Test connection to devnet
        const balance = await connection.getBalance(keypair.publicKey);
        console.log(`✅ Current balance: ${balance / 1e9} SOL`);
        
        console.log('🎉 All tests passed! Wallet is ready for demo.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('   Stack:', error.stack);
    }
}

testWallet();