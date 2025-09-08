const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const { Program, AnchorProvider, Wallet, BN } = anchor;
const fs = require('fs');
const path = require('path');
const logger = require('../services/logger');
const { solToLamports } = require('../utils/lamports');

let connection = null;
let program = null;
let provider = null;
let wallet = null;

// Helper function to compute instruction discriminators
function computeDiscriminator(instructionName) {
  const hash = anchor.utils.sha256.hash(`global:${instructionName}`);
  return Buffer.from(hash.slice(0, 16), 'hex');
}

// Helper function to convert BigInt to BN for Solana compatibility
function bigIntToBN(bigIntValue) {
  return new BN(bigIntValue.toString());
}

// Cache instruction discriminators at module scope
const DEPOSIT_DISCRIMINATOR = computeDiscriminator('deposit');
const WITHDRAW_DISCRIMINATOR = computeDiscriminator('withdraw');

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
      logger.warn('IDL file not found, using fallback IDL');
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
        ],
        "accounts": [
          {
            "name": "Vault",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "user",
                  "type": "publicKey"
                },
                {
                  "name": "balance",
                  "type": "u64"
                }
              ]
            }
          }
        ]
      };
    }

    // Create program instance
    if (!process.env.PROGRAM_ID) {
      throw new Error('PROGRAM_ID environment variable is required');
    }
    const programId = new PublicKey(process.env.PROGRAM_ID);
    program = new Program(idl, programId, provider);

    // Verify IDL has required account definitions
    if (!idl.accounts || !idl.accounts.find(acc => acc.name === 'Vault')) {
      logger.error('IDL missing required Vault account definition');
      logger.error('Please ensure target/idl/racers_vault.json exists or extend the fallback IDL');
      process.exit(1);
    }

    logger.info('Solana program initialized');
    logger.info(`Program ID: ${programId.toString()}`);
    logger.info(`Wallet: ${wallet.publicKey.toString()}`);

    return true;
  } catch (error) {
    logger.error('Failed to initialize Solana:', error);
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

// Build unsigned deposit transaction for client signing
async function buildDepositTransaction(userPublicKey, amount) {
  try {
    if (!program) {
      throw new Error('Solana program not initialized');
    }

    const userKey = new PublicKey(userPublicKey);
    const vaultAddress = getUserVaultAddress(userKey);

    // Check if vault exists before building transaction
    try {
      await program.account.vault.fetch(vaultAddress);
    } catch (error) {
      if (error.message.includes('Account does not exist') || error.message.includes('Invalid account discriminator')) {
        throw new Error('Vault does not exist. Please initialize your vault first by running the vault initialization flow.');
      }
      throw error; // Re-throw other errors
    }

    // Create deposit transaction (unsigned)
    const tx = new Transaction().add(
      await program.methods
        .deposit(bigIntToBN(solToLamports(amount))) // Convert SOL to lamports with precise conversion
        .accounts({
          vault: vaultAddress,
          user: userKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userKey; // User pays the fee

    // Serialize transaction for client signing
    const serializedTx = tx.serialize({ requireAllSignatures: false }).toString('base64');

    logger.info(`Deposit transaction built for ${userPublicKey}: ${amount} SOL`);
    return { 
      success: true, 
      transaction: serializedTx,
      vaultAddress: vaultAddress.toString()
    };

  } catch (error) {
    logger.error('Failed to build deposit transaction:', error);
    return { success: false, error: error.message };
  }
}

// Verify and process signed deposit transaction
async function processDepositTransaction(signedTransaction, expectedUserAddress) {
  try {
    // Deserialize the signed transaction
    const tx = Transaction.from(Buffer.from(signedTransaction, 'base64'));
    
    // Verify the transaction signer matches the expected user
    if (tx.signatures.length === 0) {
      throw new Error('Transaction has no signatures');
    }
    
    // Get the expected vault address for the user
    const expectedUserKey = new PublicKey(expectedUserAddress);
    const expectedVaultAddress = getUserVaultAddress(expectedUserKey);
    
    // Verify that the expected user's public key is present in the signatures
    const expectedUserKeyString = expectedUserKey.toString();
    const hasExpectedSigner = tx.signatures.some(sig => {
      // Check if this signature corresponds to the expected user
      // In Solana, signatures are indexed by the order of signers in the transaction
      return sig.publicKey && sig.publicKey.toString() === expectedUserKeyString;
    });
    
    if (!hasExpectedSigner) {
      throw new Error('Transaction not signed by expected user');
    }
    
    // Verify transaction has exactly one instruction
    if (tx.instructions.length !== 1) {
      throw new Error(`Transaction must contain exactly one instruction, found ${tx.instructions.length}`);
    }
    
    // Verify the instruction accounts match expected vault and user
    const instruction = tx.instructions[0];
    
    // Enforce program ID validation - must match vault program
    if (!instruction.programId.equals(program.programId)) {
      throw new Error(`Invalid program ID: expected ${program.programId.toString()}, got ${instruction.programId.toString()}`);
    }
    
    if (instruction.programId.equals(program.programId)) {
      // Verify instruction discriminator matches deposit
      const data = instruction.data;
      if (data.length >= 8) {
        const discriminator = data.slice(0, 8);
        if (!discriminator.equals(DEPOSIT_DISCRIMINATOR)) {
          throw new Error('Invalid instruction type: expected deposit');
        }
      }
      
      // Verify vault account matches expected vault
      if (!instruction.keys[0].pubkey.equals(expectedVaultAddress)) {
        throw new Error('Vault address mismatch');
      }
      // Verify user account matches expected user and is a signer
      if (!instruction.keys[1].pubkey.equals(expectedUserKey) || !instruction.keys[1].isSigner) {
        throw new Error('User address mismatch or not a signer');
      }
    }
    
    // Extract the actual amount from the transaction
    let verifiedAmountLamports = BigInt(0);
    if (tx.instructions.length > 0) {
      const instruction = tx.instructions[0];
      // For custom racers_vault program, decode the instruction data
      if (instruction.programId.equals(program.programId)) {
        // Custom program instruction data format: [discriminator (8 bytes), amount (8 bytes)]
        const data = instruction.data;
        if (data.length >= 16) {
          // Extract the 8-byte amount (little-endian) after the 8-byte discriminator
          verifiedAmountLamports = data.readBigUInt64LE(8);
        }
      }
    }
    
    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature);

    // Convert to decimal SOL only if safe, otherwise return null
    let verifiedAmount = null;
    if (verifiedAmountLamports <= BigInt(Number.MAX_SAFE_INTEGER)) {
      verifiedAmount = Number(verifiedAmountLamports) / 1e9;
      logger.info(`Deposit transaction confirmed: ${signature}, amount: ${verifiedAmount} SOL`);
    } else {
      logger.info(`Deposit transaction confirmed: ${signature}, amount: ${verifiedAmountLamports} lamports (large amount)`);
    }
    
    return { 
      success: true, 
      signature, 
      verifiedAmountLamports: verifiedAmountLamports.toString(), // Convert to string for JSON serialization
      verifiedAmount: verifiedAmount
    };

  } catch (error) {
    logger.error('Deposit transaction failed:', error);
    return { success: false, error: error.message };
  }
}

// Build unsigned withdraw transaction for client signing
async function buildWithdrawTransaction(userPublicKey, amount) {
  try {
    if (!program) {
      throw new Error('Solana program not initialized');
    }

    const userKey = new PublicKey(userPublicKey);
    const vaultAddress = getUserVaultAddress(userKey);

    // Check vault balance first
    const vaultInfo = await program.account.vault.fetch(vaultAddress);
    const requestedAmount = bigIntToBN(solToLamports(amount));
    if (vaultInfo.balance.lt(requestedAmount)) {
      throw new Error('Insufficient balance in vault');
    }

    // Create withdraw transaction (unsigned)
    const tx = new Transaction().add(
      await program.methods
        .withdraw(bigIntToBN(solToLamports(amount))) // Convert SOL to lamports with precise conversion
        .accounts({
          vault: vaultAddress,
          user: userKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userKey; // User pays the fee

    // Serialize transaction for client signing
    const serializedTx = tx.serialize({ requireAllSignatures: false }).toString('base64');

    logger.info(`Withdraw transaction built for ${userPublicKey}: ${amount} SOL`);
    return { 
      success: true, 
      transaction: serializedTx,
      vaultAddress: vaultAddress.toString()
    };

  } catch (error) {
    logger.error('Failed to build withdraw transaction:', error);
    return { success: false, error: error.message };
  }
}

// Verify and process signed withdraw transaction
async function processWithdrawTransaction(signedTransaction, expectedUserAddress) {
  try {
    // Deserialize the signed transaction
    const tx = Transaction.from(Buffer.from(signedTransaction, 'base64'));
    
    // Verify the transaction signer matches the expected user
    if (tx.signatures.length === 0) {
      throw new Error('Transaction has no signatures');
    }
    
    // Get the expected vault address for the user
    const expectedUserKey = new PublicKey(expectedUserAddress);
    const expectedVaultAddress = getUserVaultAddress(expectedUserKey);
    
    // Verify that the expected user's public key is present in the signatures
    const expectedUserKeyString = expectedUserKey.toString();
    const hasExpectedSigner = tx.signatures.some(sig => {
      // Check if this signature corresponds to the expected user
      // In Solana, signatures are indexed by the order of signers in the transaction
      return sig.publicKey && sig.publicKey.toString() === expectedUserKeyString;
    });
    
    if (!hasExpectedSigner) {
      throw new Error('Transaction not signed by expected user');
    }
    
    // Verify transaction has exactly one instruction
    if (tx.instructions.length !== 1) {
      throw new Error(`Transaction must contain exactly one instruction, found ${tx.instructions.length}`);
    }
    
    // Verify the instruction accounts match expected vault and user
    const instruction = tx.instructions[0];
    
    // Enforce program ID validation - must match vault program
    if (!instruction.programId.equals(program.programId)) {
      throw new Error(`Invalid program ID: expected ${program.programId.toString()}, got ${instruction.programId.toString()}`);
    }
    
    if (instruction.programId.equals(program.programId)) {
      // Verify instruction discriminator matches withdraw
      const data = instruction.data;
      if (data.length >= 8) {
        const discriminator = data.slice(0, 8);
        if (!discriminator.equals(WITHDRAW_DISCRIMINATOR)) {
          throw new Error('Invalid instruction type: expected withdraw');
        }
      }
      
      // Verify vault account matches expected vault
      if (!instruction.keys[0].pubkey.equals(expectedVaultAddress)) {
        throw new Error('Vault address mismatch');
      }
      // Verify user account matches expected user and is a signer
      if (!instruction.keys[1].pubkey.equals(expectedUserKey) || !instruction.keys[1].isSigner) {
        throw new Error('User address mismatch or not a signer');
      }
    }
    
    // Extract the actual amount from the transaction
    let verifiedAmountLamports = BigInt(0);
    if (tx.instructions.length > 0) {
      const instruction = tx.instructions[0];
      // For custom racers_vault program, decode the instruction data
      if (instruction.programId.equals(program.programId)) {
        // Custom program instruction data format: [discriminator (8 bytes), amount (8 bytes)]
        const data = instruction.data;
        if (data.length >= 16) {
          // Extract the 8-byte amount (little-endian) after the 8-byte discriminator
          verifiedAmountLamports = data.readBigUInt64LE(8);
        }
      }
    }
    
    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature);

    // Convert to decimal SOL only if safe, otherwise return null
    let verifiedAmount = null;
    if (verifiedAmountLamports <= BigInt(Number.MAX_SAFE_INTEGER)) {
      verifiedAmount = Number(verifiedAmountLamports) / 1e9;
      logger.info(`Withdraw transaction confirmed: ${signature}, amount: ${verifiedAmount} SOL`);
    } else {
      logger.info(`Withdraw transaction confirmed: ${signature}, amount: ${verifiedAmountLamports} lamports (large amount)`);
    }
    
    return { 
      success: true, 
      signature, 
      verifiedAmountLamports: verifiedAmountLamports.toString(), // Convert to string for JSON serialization
      verifiedAmount: verifiedAmount
    };

  } catch (error) {
    logger.error('Withdraw transaction failed:', error);
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
    // Convert BN to string to avoid precision loss, then parse as BigInt
    const balanceString = vaultInfo.balance.toString();
    const balanceBigInt = BigInt(balanceString);
    
    // Check if the value is within safe integer range for display
    if (balanceBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
      logger.warn('Vault balance exceeds safe integer range, returning as string');
      return balanceString; // Return as string for large values
    }
    
    // Convert to decimal SOL for display only after ensuring safe range
    return Number(balanceBigInt) / 1e9; // Convert lamports to SOL

  } catch (error) {
    logger.error('Failed to get vault balance:', error);
    throw error;
  }
}

// Build unsigned vault initialization transaction for client signing
async function buildInitializeVaultTransaction(userPublicKey) {
  try {
    if (!program) {
      throw new Error('Solana program not initialized');
    }

    const userKey = new PublicKey(userPublicKey);
    const vaultAddress = getUserVaultAddress(userKey);

    // Check if vault already exists
    try {
      await program.account.vault.fetch(vaultAddress);
      logger.info('Vault already exists for user:', userPublicKey);
      return { success: true, vaultAddress: vaultAddress.toString(), alreadyExists: true };
    } catch (error) {
      // Vault doesn't exist, create it
    }

    // Create initialize vault transaction (unsigned)
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

    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userKey; // User pays the fee

    // Serialize transaction for client signing
    const serializedTx = tx.serialize({ requireAllSignatures: false }).toString('base64');

    logger.info(`Vault initialization transaction built for ${userPublicKey}`);
    return { 
      success: true, 
      transaction: serializedTx,
      vaultAddress: vaultAddress.toString()
    };

  } catch (error) {
    logger.error('Failed to build vault initialization transaction:', error);
    return { success: false, error: error.message };
  }
}

// Process signed vault initialization transaction
async function processInitializeVaultTransaction(signedTransaction, expectedUserAddress) {
  try {
    // Deserialize the signed transaction
    const tx = Transaction.from(Buffer.from(signedTransaction, 'base64'));
    
    // Verify the transaction signer matches the expected user
    if (tx.signatures.length === 0) {
      throw new Error('Transaction has no signatures');
    }
    
    // Get the expected vault address for the user
    const expectedUserKey = new PublicKey(expectedUserAddress);
    const expectedVaultAddress = getUserVaultAddress(expectedUserKey);
    
    // Verify the instruction accounts match expected vault and user
    if (tx.instructions.length > 0) {
      const instruction = tx.instructions[0];
      if (instruction.programId.equals(program.programId)) {
        // Verify vault account matches expected vault
        if (!instruction.keys[0].pubkey.equals(expectedVaultAddress)) {
          throw new Error('Vault address mismatch');
        }
        // Verify user account matches expected user and is a signer
        if (!instruction.keys[1].pubkey.equals(expectedUserKey) || !instruction.keys[1].isSigner) {
          throw new Error('User address mismatch or not a signer');
        }
      }
    }
    
    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature);

    logger.info(`Vault initialization confirmed: ${signature}`);
    return { success: true, signature };

  } catch (error) {
    logger.error('Vault initialization transaction failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeSolana,
  buildDepositTransaction,
  processDepositTransaction,
  buildWithdrawTransaction,
  processWithdrawTransaction,
  getVaultBalance,
  buildInitializeVaultTransaction,
  processInitializeVaultTransaction,
  getUserVaultAddress,
  computeDiscriminator
};
