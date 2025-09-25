const { Connection, PublicKey } = require('@solana/web3.js');
const logger = require('../services/logger');

class TransactionListener {
  constructor() {
    this.connection = null;
    this.programId = null;
    this.isListening = false;
    this.subscriptions = new Map();
  }

  // Initialize the transaction listener
  async initialize() {
    try {
      // Create connection
      this.connection = new Connection(
        process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      );

      if (process.env.PROGRAM_ID) {
        this.programId = new PublicKey(process.env.PROGRAM_ID);
        logger.info('Transaction listener initialized');
        logger.info(`Monitoring program: ${this.programId.toString()}`);
      } else {
        logger.warn('PROGRAM_ID not set, transaction listener disabled');
      }

      return true;
    } catch (error) {
      logger.error('Failed to initialize transaction listener:', error);
      return false;
    }
  }

  // Start listening for transactions
  async startListening() {
    if (!this.connection || !this.programId || this.isListening) {
      return;
    }

    try {
      this.isListening = true;
      
      // Listen for all program account changes
      const subscriptionId = this.connection.onProgramAccountChange(
        this.programId,
        (accountInfo, context) => {
          this.handleAccountChange(accountInfo, context);
        },
        'confirmed'
      );

      this.subscriptions.set('program', subscriptionId);
      logger.info('Started listening for Solana transactions');

    } catch (error) {
      logger.error('Failed to start transaction listener:', error);
      this.isListening = false;
    }
  }

  // Stop listening for transactions
  async stopListening() {
    if (!this.isListening) {
      return;
    }

    try {
      // Unsubscribe from all subscriptions
      for (const [key, subscriptionId] of this.subscriptions) {
        await this.connection.removeAccountChangeListener(subscriptionId);
        logger.info(`Unsubscribed from ${key} listener`);
      }

      this.subscriptions.clear();
      this.isListening = false;
      logger.info('Stopped listening for Solana transactions');

    } catch (error) {
      logger.error('Error stopping transaction listener:', error);
    }
  }

  // Handle account changes (vault balance updates)
  async handleAccountChange(accountInfo, context) {
    try {
      const { pubkey, account } = accountInfo;
      
      // Log the account change
      logger.info(`Vault account updated: ${pubkey.toString()}`);
      logger.info(`New balance: ${account.lamports} lamports`);

      // Decode the account data to get vault information
      const vaultData = this.decodeVaultAccount(account.data);
      if (vaultData) {
        logger.info(`Vault owner: ${vaultData.user.toString()}`);
        logger.info(`Vault balance: ${vaultData.balance} lamports`);
      }

      // Here you could emit events to your application or update database
      // this.emit('vaultUpdate', { pubkey: pubkey.toString(), vaultData });

    } catch (error) {
      logger.error('Error handling account change:', error);
    }
  }

  // Decode vault account data (based on your Rust struct)
  decodeVaultAccount(data) {
    try {
      if (data.length < 57) { // 8 (discriminator) + 32 (user) + 8 (balance) + 8 (total_deposited) + 8 (total_withdrawn) + 1 (bump)
        return null;
      }

      // Skip discriminator (first 8 bytes)
      let offset = 8;

      // Read user (32 bytes)
      const user = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Read balance (8 bytes, little-endian u64)
      const balance = data.readBigUInt64LE(offset);
      offset += 8;

      // Read total_deposited (8 bytes, little-endian u64)
      const totalDeposited = data.readBigUInt64LE(offset);
      offset += 8;

      // Read total_withdrawn (8 bytes, little-endian u64)
      const totalWithdrawn = data.readBigUInt64LE(offset);
      offset += 8;

      // Read bump (1 byte)
      const bump = data.readUInt8(offset);

      return {
        user,
        balance,
        totalDeposited,
        totalWithdrawn,
        bump
      };

    } catch (error) {
      logger.error('Error decoding vault account:', error);
      return null;
    }
  }

  // Listen for specific user's vault changes
  async subscribeToUserVault(userPublicKey, callback) {
    if (!this.connection || !this.programId) {
      return null;
    }

    try {
      // Derive vault address
      const [vaultAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), new PublicKey(userPublicKey).toBuffer()],
        this.programId
      );

      // Subscribe to this specific vault account
      const subscriptionId = this.connection.onAccountChange(
        vaultAddress,
        (accountInfo, context) => {
          const vaultData = this.decodeVaultAccount(accountInfo.data);
          callback({
            address: vaultAddress.toString(),
            data: vaultData,
            context
          });
        },
        'confirmed'
      );

      const subscriptionKey = `user_${userPublicKey}`;
      this.subscriptions.set(subscriptionKey, subscriptionId);
      
      logger.info(`Subscribed to vault for user: ${userPublicKey}`);
      return subscriptionId;

    } catch (error) {
      logger.error('Error subscribing to user vault:', error);
      return null;
    }
  }

  // Unsubscribe from specific user's vault
  async unsubscribeFromUserVault(userPublicKey) {
    const subscriptionKey = `user_${userPublicKey}`;
    const subscriptionId = this.subscriptions.get(subscriptionKey);

    if (subscriptionId) {
      try {
        await this.connection.removeAccountChangeListener(subscriptionId);
        this.subscriptions.delete(subscriptionKey);
        logger.info(`Unsubscribed from vault for user: ${userPublicKey}`);
      } catch (error) {
        logger.error('Error unsubscribing from user vault:', error);
      }
    }
  }

  // Get recent transactions for a user's vault
  async getRecentVaultTransactions(userPublicKey, limit = 10) {
    if (!this.connection || !this.programId) {
      return [];
    }

    try {
      // Derive vault address
      const [vaultAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), new PublicKey(userPublicKey).toBuffer()],
        this.programId
      );

      // Get recent transactions
      const signatures = await this.connection.getSignaturesForAddress(
        vaultAddress,
        { limit }
      );

      const transactions = [];
      for (const sig of signatures) {
        try {
          const tx = await this.connection.getTransaction(sig.signature, {
            commitment: 'confirmed'
          });

          if (tx) {
            transactions.push({
              signature: sig.signature,
              slot: sig.slot,
              blockTime: sig.blockTime,
              transaction: tx
            });
          }
        } catch (error) {
          logger.warn(`Failed to fetch transaction ${sig.signature}:`, error);
        }
      }

      return transactions;

    } catch (error) {
      logger.error('Error getting recent vault transactions:', error);
      return [];
    }
  }
}

// Singleton instance
const transactionListener = new TransactionListener();

module.exports = {
  TransactionListener,
  transactionListener
};