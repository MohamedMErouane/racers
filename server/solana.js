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
    if (!process.env.PROGRAM_ID) {
      throw new Error('PROGRAM_ID environment variable is required');
    }
    const programId = new PublicKey(process.env.PROGRAM_ID);
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

// Build unsigned deposit transaction for client signing
async function buildDepositTransaction(userPublicKey, amount) {
  try {
    if (!program) {
      throw new Error('Solana program not initialized');
    }

    const userKey = new PublicKey(userPublicKey);
    const vaultAddress = getUserVaultAddress(userKey);

    // Create deposit transaction (unsigned)
    const tx = new Transaction().add(
      await program.methods
        .deposit(new BN(Math.round(amount * 1e9))) // Convert SOL to lamports with proper rounding
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

    console.log(`📝 Deposit transaction built for ${userPublicKey}: ${amount} SOL`);
    return { 
      success: true, 
      transaction: serializedTx,
      vaultAddress: vaultAddress.toString()
    };

  } catch (error) {
    console.error('❌ Failed to build deposit transaction:', error);
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
    
    // Extract the actual amount from the transaction
    let verifiedAmount = 0;
    if (tx.instructions.length > 0) {
      const instruction = tx.instructions[0];
      // For custom racers_vault program, decode the instruction data
      if (instruction.programId.equals(program.programId)) {
        // Custom program instruction data format: [discriminator (8 bytes), amount (8 bytes)]
        const data = instruction.data;
        if (data.length >= 16) {
          // Extract the 8-byte amount (little-endian) after the 8-byte discriminator
          verifiedAmount = data.readBigUInt64LE(8) / BigInt(1e9); // Convert lamports to SOL
        }
      }
    }
    
    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature);

    console.log(`✅ Deposit transaction confirmed: ${signature}, amount: ${verifiedAmount} SOL`);
    return { success: true, signature, verifiedAmount: Number(verifiedAmount) };

  } catch (error) {
    console.error('❌ Deposit transaction failed:', error);
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
    const requestedAmount = new BN(Math.round(amount * 1e9));
    if (vaultInfo.balance.lt(requestedAmount)) {
      throw new Error('Insufficient balance in vault');
    }

    // Create withdraw transaction (unsigned)
    const tx = new Transaction().add(
      await program.methods
        .withdraw(new BN(Math.round(amount * 1e9))) // Convert SOL to lamports with proper rounding
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

    console.log(`📝 Withdraw transaction built for ${userPublicKey}: ${amount} SOL`);
    return { 
      success: true, 
      transaction: serializedTx,
      vaultAddress: vaultAddress.toString()
    };

  } catch (error) {
    console.error('❌ Failed to build withdraw transaction:', error);
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
    
    // Extract the actual amount from the transaction
    let verifiedAmount = 0;
    if (tx.instructions.length > 0) {
      const instruction = tx.instructions[0];
      // For custom racers_vault program, decode the instruction data
      if (instruction.programId.equals(program.programId)) {
        // Custom program instruction data format: [discriminator (8 bytes), amount (8 bytes)]
        const data = instruction.data;
        if (data.length >= 16) {
          // Extract the 8-byte amount (little-endian) after the 8-byte discriminator
          verifiedAmount = data.readBigUInt64LE(8) / BigInt(1e9); // Convert lamports to SOL
        }
      }
    }
    
    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature);

    console.log(`✅ Withdraw transaction confirmed: ${signature}, amount: ${verifiedAmount} SOL`);
    return { success: true, signature, verifiedAmount: Number(verifiedAmount) };

  } catch (error) {
    console.error('❌ Withdraw transaction failed:', error);
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
    // Convert BN to number safely, guarding against large values
    const balanceNumber = vaultInfo.balance.toNumber();
    if (balanceNumber > Number.MAX_SAFE_INTEGER) {
      console.warn('Vault balance exceeds safe integer range, using string conversion');
      return parseFloat(vaultInfo.balance.toString()) / 1e9;
    }
    return balanceNumber / 1e9; // Convert lamports to SOL

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
  buildDepositTransaction,
  processDepositTransaction,
  buildWithdrawTransaction,
  processWithdrawTransaction,
  getVaultBalance,
  initializeVault,
  getUserVaultAddress
};
