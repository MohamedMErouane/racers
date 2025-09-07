const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const { Program, AnchorProvider, Wallet, BN } = anchor;
const fs = require('fs');
const path = require('path');

let connection = null;
let program = null;
let provider = null;
let wallet = null;

// Initialize Solana connection and program
async function initializeSolana() {
  try {
    // Create connection
    connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Create wallet from private key
    const privateKey = process.env.PHANTOM_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PHANTOM_PRIVATE_KEY not found in environment variables');
    }

    const privateKeyArray = new Uint8Array(JSON.parse(privateKey));
    const keypair = Keypair.fromSecretKey(privateKeyArray);
    wallet = new Wallet(keypair);

    // Create provider
    provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    // Load IDL
    const idlPath = path.join(__dirname, '../solana-program/target/idl/racers_vault.json');
    let idl;
    
    try {
      idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
    } catch (error) {
      console.warn('IDL file not found, using fallback IDL');
      // Fallback IDL for basic operations
      idl = {
        "version": "0.1.0",
        "name": "racers_vault",
        "instructions": [
          {
            "name": "initializeVault",
            "accounts": [
              { "name": "vault", "isMut": true, "isSigner": false },
              { "name": "user", "isMut": true, "isSigner": true },
              { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": []
          },
          {
            "name": "deposit",
            "accounts": [
              { "name": "vault", "isMut": true, "isSigner": false },
              { "name": "user", "isMut": true, "isSigner": true },
              { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
              { "name": "amount", "type": "u64" }
            ]
          },
          {
            "name": "withdraw",
            "accounts": [
              { "name": "vault", "isMut": true, "isSigner": false },
              { "name": "user", "isMut": true, "isSigner": true },
              { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
              { "name": "amount", "type": "u64" }
            ]
          }
        ]
      };
    }

    // Create program instance
    const programId = new PublicKey(process.env.PROGRAM_ID || 'RacersFun1111111111111111111111111111111111');
    program = new Program(idl, programId, provider);

    console.log('✅ Solana program initialized');
    console.log(`Program ID: ${programId.toString()}`);
    console.log(`Wallet: ${wallet.publicKey.toString()}`);

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Solana:', error);
    throw error;
  }
}

// Get user vault address
function getUserVaultAddress(userPublicKey) {
  const [vaultAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), userPublicKey.toBuffer()],
    program.programId
  );
  return vaultAddress;
}

// Deposit SOL to user's vault
async function deposit(userPublicKey, amount) {
  try {
    if (!program) {
      throw new Error('Solana program not initialized');
    }

    const userKey = new PublicKey(userPublicKey);
    const vaultAddress = getUserVaultAddress(userKey);

    // Create deposit transaction
    const tx = new Transaction().add(
      await program.methods
        .deposit(new BN(amount * 1e9)) // Convert SOL to lamports
        .accounts({
          vault: vaultAddress,
          user: userKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    // Send transaction
    const signature = await connection.sendTransaction(tx, [wallet.payer]);
    await connection.confirmTransaction(signature);

    console.log(`✅ Deposit successful: ${amount} SOL to ${userPublicKey}`);
    return { success: true, signature };

  } catch (error) {
    console.error('❌ Deposit failed:', error);
    return { success: false, error: error.message };
  }
}

// Withdraw SOL from user's vault
async function withdraw(userPublicKey, amount) {
  try {
    if (!program) {
      throw new Error('Solana program not initialized');
    }

    const userKey = new PublicKey(userPublicKey);
    const vaultAddress = getUserVaultAddress(userKey);

    // Check vault balance first
    const vaultInfo = await program.account.vault.fetch(vaultAddress);
    if (vaultInfo.balance < amount * 1e9) {
      throw new Error('Insufficient balance in vault');
    }

    // Create withdraw transaction
    const tx = new Transaction().add(
      await program.methods
        .withdraw(new BN(amount * 1e9)) // Convert SOL to lamports
        .accounts({
          vault: vaultAddress,
          user: userKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    // Send transaction
    const signature = await connection.sendTransaction(tx, [wallet.payer]);
    await connection.confirmTransaction(signature);

    console.log(`✅ Withdraw successful: ${amount} SOL from ${userPublicKey}`);
    return { success: true, signature };

  } catch (error) {
    console.error('❌ Withdraw failed:', error);
    return { success: false, error: error.message };
  }
}

// Get user's vault balance
async function getVaultBalance(userPublicKey) {
  try {
    if (!program) {
      throw new Error('Solana program not initialized');
    }

    const userKey = new PublicKey(userPublicKey);
    const vaultAddress = getUserVaultAddress(userKey);

    const vaultInfo = await program.account.vault.fetch(vaultAddress);
    return vaultInfo.balance / 1e9; // Convert lamports to SOL

  } catch (error) {
    console.error('❌ Failed to get vault balance:', error);
    return 0;
  }
}

// Initialize user vault
async function initializeVault(userPublicKey) {
  try {
    if (!program) {
      throw new Error('Solana program not initialized');
    }

    const userKey = new PublicKey(userPublicKey);
    const vaultAddress = getUserVaultAddress(userKey);

    // Check if vault already exists
    try {
      await program.account.vault.fetch(vaultAddress);
      console.log('Vault already exists for user:', userPublicKey);
      return { success: true, vaultAddress: vaultAddress.toString() };
    } catch (error) {
      // Vault doesn't exist, create it
    }

    // Create initialize vault transaction
    const tx = new Transaction().add(
      await program.methods
        .initializeVault()
        .accounts({
          vault: vaultAddress,
          user: userKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    // Send transaction
    const signature = await connection.sendTransaction(tx, [wallet.payer]);
    await connection.confirmTransaction(signature);

    console.log(`✅ Vault initialized for user: ${userPublicKey}`);
    return { success: true, signature, vaultAddress: vaultAddress.toString() };

  } catch (error) {
    console.error('❌ Vault initialization failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeSolana,
  deposit,
  withdraw,
  getVaultBalance,
  initializeVault,
  getUserVaultAddress
};
