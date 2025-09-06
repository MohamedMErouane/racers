const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, transfer } = require('@solana/spl-token');
const bs58 = require('bs58');
const axios = require('axios');
const logger = require('./logger');

let connection = null;
let walletKeypair = null;
let coinbaseClient = null;

async function initializeSolana() {
  try {
    // Initialize Solana connection
    connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      {
        commitment: 'confirmed',
        wsEndpoint: process.env.SOLANA_WS_URL || 'wss://api.mainnet-beta.solana.com'
      }
    );

    // Initialize wallet keypair from private key
    const privateKeyBytes = bs58.decode(process.env.PHANTOM_PRIVATE_KEY);
    walletKeypair = Keypair.fromSecretKey(privateKeyBytes);

    // Initialize Coinbase API client
    coinbaseClient = axios.create({
      baseURL: 'https://api.coinbase.com/v2',
      headers: {
        'Authorization': `Bearer ${process.env.COINBASE_API_KEY_ID}`,
        'Content-Type': 'application/json'
      }
    });

    // Test connection
    const balance = await connection.getBalance(walletKeypair.publicKey);
    logger.info(`✅ Solana connected - Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // Test Coinbase API
    try {
      const response = await coinbaseClient.get('/accounts');
      logger.info('✅ Coinbase API connected');
    } catch (error) {
      logger.warn('⚠️ Coinbase API test failed:', error.message);
    }

  } catch (error) {
    logger.error('❌ Failed to initialize Solana:', error);
    throw error;
  }
}

// Solana utility functions
const solana = {
  // Connection and wallet
  getConnection: () => connection,
  getWallet: () => walletKeypair,
  getWalletAddress: () => walletKeypair.publicKey.toString(),

  // Balance operations
  async getBalance(address) {
    try {
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  },

  async getWalletBalance() {
    try {
      const balance = await connection.getBalance(walletKeypair.publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('Error getting wallet balance:', error);
      throw error;
    }
  },

  // Transaction operations
  async sendSOL(toAddress, amount) {
    try {
      const toPublicKey = new PublicKey(toAddress);
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: walletKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports: lamports,
        })
      );

      const signature = await connection.sendTransaction(transaction, [walletKeypair]);
      await connection.confirmTransaction(signature);

      logger.info(`✅ Sent ${amount} SOL to ${toAddress}, signature: ${signature}`);
      return signature;
    } catch (error) {
      logger.error('Error sending SOL:', error);
      throw error;
    }
  },

  async createTransaction(instructions) {
    try {
      const transaction = new Transaction();
      instructions.forEach(instruction => transaction.add(instruction));
      
      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletKeypair.publicKey;

      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  },

  async signAndSendTransaction(transaction) {
    try {
      transaction.sign(walletKeypair);
      const signature = await connection.sendTransaction(transaction, [walletKeypair]);
      await connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      logger.error('Error signing and sending transaction:', error);
      throw error;
    }
  },

  // Account operations
  async createAccount(space, programId) {
    try {
      const newAccount = Keypair.generate();
      const lamports = await connection.getMinimumBalanceForRentExemption(space);

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: walletKeypair.publicKey,
          newAccountPubkey: newAccount.publicKey,
          lamports: lamports,
          space: space,
          programId: new PublicKey(programId),
        })
      );

      await this.signAndSendTransaction(transaction);
      return newAccount;
    } catch (error) {
      logger.error('Error creating account:', error);
      throw error;
    }
  },

  // Token operations
  async getTokenBalance(mintAddress, ownerAddress) {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const ownerPublicKey = new PublicKey(ownerAddress);
      
      const tokenAddress = await getAssociatedTokenAddress(mintPublicKey, ownerPublicKey);
      const balance = await connection.getTokenAccountBalance(tokenAddress);
      
      return balance.value.uiAmount;
    } catch (error) {
      logger.error('Error getting token balance:', error);
      throw error;
    }
  },

  async transferTokens(mintAddress, fromAddress, toAddress, amount) {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const fromPublicKey = new PublicKey(fromAddress);
      const toPublicKey = new PublicKey(toAddress);

      const fromTokenAddress = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
      const toTokenAddress = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

      const transaction = new Transaction().add(
        transfer(
          fromTokenAddress,
          toTokenAddress,
          fromPublicKey,
          amount
        )
      );

      const signature = await this.signAndSendTransaction(transaction);
      return signature;
    } catch (error) {
      logger.error('Error transferring tokens:', error);
      throw error;
    }
  },

  // Program operations
  async callProgram(programId, instructionData, accounts) {
    try {
      const programPublicKey = new PublicKey(programId);
      const instruction = {
        programId: programPublicKey,
        keys: accounts,
        data: Buffer.from(instructionData)
      };

      const transaction = new Transaction().add(instruction);
      const signature = await this.signAndSendTransaction(transaction);
      return signature;
    } catch (error) {
      logger.error('Error calling program:', error);
      throw error;
    }
  }
};

// Coinbase API operations
const coinbase = {
  async getAccount(accountId) {
    try {
      const response = await coinbaseClient.get(`/accounts/${accountId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting Coinbase account:', error);
      throw error;
    }
  },

  async getAccounts() {
    try {
      const response = await coinbaseClient.get('/accounts');
      return response.data;
    } catch (error) {
      logger.error('Error getting Coinbase accounts:', error);
      throw error;
    }
  },

  async createTransaction(accountId, transactionData) {
    try {
      const response = await coinbaseClient.post(`/accounts/${accountId}/transactions`, transactionData);
      return response.data;
    } catch (error) {
      logger.error('Error creating Coinbase transaction:', error);
      throw error;
    }
  },

  async getTransaction(accountId, transactionId) {
    try {
      const response = await coinbaseClient.get(`/accounts/${accountId}/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting Coinbase transaction:', error);
      throw error;
    }
  },

  async getExchangeRates() {
    try {
      const response = await coinbaseClient.get('/exchange-rates');
      return response.data;
    } catch (error) {
      logger.error('Error getting exchange rates:', error);
      throw error;
    }
  }
};

// Game-specific Solana operations
const gameSolana = {
  // Bet locking operations
  async lockBet(raceId, userId, amount, racerId) {
    try {
      // This would interact with a custom Solana program
      // For now, we'll simulate the transaction
      const betData = {
        raceId,
        userId,
        amount,
        racerId,
        timestamp: Date.now()
      };

      // In a real implementation, this would:
      // 1. Create a bet account on-chain
      // 2. Transfer SOL to the bet account
      // 3. Store bet metadata
      
      logger.info(`🔒 Locking bet: ${amount} SOL on racer ${racerId} for race ${raceId}`);
      
      // Simulate transaction signature
      const signature = `bet_${raceId}_${userId}_${Date.now()}`;
      return signature;
    } catch (error) {
      logger.error('Error locking bet:', error);
      throw error;
    }
  },

  // Payout operations
  async executePayouts(raceId, winnerBets, totalPot) {
    try {
      const houseEdge = totalPot * 0.04; // 4% house edge
      const winnerPool = totalPot * 0.86; // 86% to winners
      const rakebackPool = totalPot * 0.10; // 10% rakeback

      const payouts = [];

      // Calculate winner payouts
      const totalWinnerBets = winnerBets.reduce((sum, bet) => sum + bet.amount, 0);
      
      for (const bet of winnerBets) {
        const share = bet.amount / totalWinnerBets;
        const payout = share * winnerPool;
        const profit = payout - bet.amount;

        payouts.push({
          userId: bet.userId,
          amount: payout,
          profit: profit,
          type: 'winner'
        });
      }

      // Execute payouts (simulated)
      for (const payout of payouts) {
        logger.info(`💰 Payout: ${payout.amount} SOL to user ${payout.userId} (profit: ${payout.profit})`);
        // In real implementation: await solana.sendSOL(payout.userId, payout.amount);
      }

      logger.info(`🏆 Race ${raceId} payouts completed - Total: ${totalPot} SOL`);
      return payouts;
    } catch (error) {
      logger.error('Error executing payouts:', error);
      throw error;
    }
  },

  // Rakeback operations
  async executeRakeback(raceId, losingBets, rakebackPool) {
    try {
      const rakebackPerUser = rakebackPool / losingBets.length;
      const rakebacks = [];

      for (const bet of losingBets) {
        rakebacks.push({
          userId: bet.userId,
          amount: rakebackPerUser,
          type: 'rakeback'
        });
      }

      // Execute rakebacks (simulated)
      for (const rakeback of rakebacks) {
        logger.info(`🔄 Rakeback: ${rakeback.amount} SOL to user ${rakeback.userId}`);
        // In real implementation: await solana.sendSOL(rakeback.userId, rakeback.amount);
      }

      logger.info(`🔄 Race ${raceId} rakebacks completed - Total: ${rakebackPool} SOL`);
      return rakebacks;
    } catch (error) {
      logger.error('Error executing rakebacks:', error);
      throw error;
    }
  }
};

module.exports = {
  initializeSolana,
  solana,
  coinbase,
  gameSolana,
  getConnection: () => connection,
  getWallet: () => walletKeypair
};
