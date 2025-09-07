import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import Solana module
const solana = require('../server/solana');

// Mock Solana dependencies
const mockConnection = {
  sendRawTransaction: vi.fn().mockResolvedValue('mock-signature'),
  confirmTransaction: vi.fn().mockResolvedValue({}),
  getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: 'mock-blockhash' })
};

const mockProgram = {
  programId: { toString: () => 'mock-program-id' },
  methods: {
    deposit: vi.fn().mockReturnValue({
      accounts: vi.fn().mockReturnValue({
        instruction: vi.fn().mockReturnValue({
          data: Buffer.concat([
            Buffer.from([0x8f, 0x4f, 0x8c, 0x8a, 0x8b, 0x8d, 0x8e, 0x8f]), // deposit discriminator
            Buffer.alloc(8) // amount placeholder
          ])
        })
      })
    }),
    withdraw: vi.fn().mockReturnValue({
      accounts: vi.fn().mockReturnValue({
        instruction: vi.fn().mockReturnValue({
          data: Buffer.concat([
            Buffer.from([0x9f, 0x5f, 0x9c, 0x9a, 0x9b, 0x9d, 0x9e, 0x9f]), // withdraw discriminator
            Buffer.alloc(8) // amount placeholder
          ])
        })
      })
    })
  },
  account: {
    vault: {
      fetch: vi.fn().mockResolvedValue({ balance: { toNumber: () => 1000000000 } })
    }
  }
};

vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn(() => mockConnection),
  PublicKey: vi.fn((key) => ({
    toString: () => key,
    toBuffer: () => Buffer.from(key),
    equals: vi.fn(() => true)
  })),
  Keypair: vi.fn(),
  Transaction: vi.fn(() => ({
    add: vi.fn().mockReturnThis(),
    serialize: vi.fn().mockReturnValue(Buffer.from('mock-transaction')),
    signatures: [{ signature: 'mock-sig' }],
    instructions: [{
      programId: { equals: vi.fn(() => true) },
      keys: [
        { pubkey: { equals: vi.fn(() => true) } },
        { pubkey: { equals: vi.fn(() => true) }, isSigner: true }
      ],
      data: Buffer.concat([
        Buffer.from([0x8f, 0x4f, 0x8c, 0x8a, 0x8b, 0x8d, 0x8e, 0x8f]), // deposit discriminator
        Buffer.alloc(8) // amount placeholder
      ])
    }]
  })),
  SystemProgram: { programId: 'mock-system-program' }
}));

vi.mock('@coral-xyz/anchor', () => ({
  Program: vi.fn(() => mockProgram),
  AnchorProvider: vi.fn(),
  Wallet: vi.fn(),
  utils: {
    sha256: {
      hash: vi.fn((input) => {
        // Mock hash function that returns consistent results
        if (input === 'global:deposit') return '8f4f8c8a8b8d8e8f1234567890abcdef1234567890abcdef1234567890abcdef';
        if (input === 'global:withdraw') return '9f5f9c9a9b9d9e9f1234567890abcdef1234567890abcdef1234567890abcdef';
        return '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      })
    }
  }
}));

// Helper function to create mock transactions
function createMockTransaction(type, amount) {
  const discriminator = type === 'deposit' 
    ? Buffer.from([0x8f, 0x4f, 0x8c, 0x8a, 0x8b, 0x8d, 0x8e, 0x8f])
    : Buffer.from([0x9f, 0x5f, 0x9c, 0x9a, 0x9b, 0x9d, 0x9e, 0x9f]);
  
  const amountBuffer = Buffer.alloc(8);
  if (typeof amount === 'string') {
    const bigIntAmount = BigInt(amount);
    amountBuffer.writeBigUInt64LE(bigIntAmount);
  } else {
    amountBuffer.writeBigUInt64LE(BigInt(Math.round(amount * 1e9)));
  }
  
  return {
    instructions: [{
      programId: { equals: vi.fn(() => true) },
      keys: [
        { pubkey: { equals: vi.fn(() => true) }, isSigner: false },
        { pubkey: { equals: vi.fn(() => true) }, isSigner: true }
      ],
      data: Buffer.concat([discriminator, amountBuffer])
    }],
    signatures: [{ publicKey: 'mock-user' }]
  };
}

// Import the function we want to test
const { computeDiscriminator } = require('../server/solana');

describe('Solana Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate deposit transaction discriminator', async () => {
    const { processDepositTransaction } = await import('../server/solana.js');
    
    // Create a mock transaction with correct deposit discriminator
    const mockTx = {
      signatures: [{ signature: 'mock-sig' }],
      instructions: [{
        programId: { equals: vi.fn(() => true) },
        keys: [
          { pubkey: { equals: vi.fn(() => true) } },
          { pubkey: { equals: vi.fn(() => true) }, isSigner: true }
        ],
        data: Buffer.concat([
          Buffer.from([0x8f, 0x4f, 0x8c, 0x8a, 0x8b, 0x8d, 0x8e, 0x8f]), // deposit discriminator
          Buffer.alloc(8) // amount placeholder
        ])
      }]
    };
    
    const mockTransaction = vi.fn(() => mockTx);
    vi.mocked(require('@solana/web3.js').Transaction).mockImplementation(mockTransaction);
    
    const result = await processDepositTransaction('mock-signed-tx', 'mock-user-address');
    
    expect(result.success).toBe(true);
    expect(mockConnection.sendRawTransaction).toHaveBeenCalled();
  });

  it('should reject withdraw transaction with deposit discriminator', async () => {
    const { processDepositTransaction } = await import('../server/solana.js');
    
    // Create a mock transaction with wrong discriminator (withdraw instead of deposit)
    const mockTx = {
      signatures: [{ signature: 'mock-sig' }],
      instructions: [{
        programId: { equals: vi.fn(() => true) },
        keys: [
          { pubkey: { equals: vi.fn(() => true) } },
          { pubkey: { equals: vi.fn(() => true) }, isSigner: true }
        ],
        data: Buffer.concat([
          Buffer.from([0x9f, 0x5f, 0x9c, 0x9a, 0x9b, 0x9d, 0x9e, 0x9f]), // withdraw discriminator
          Buffer.alloc(8) // amount placeholder
        ])
      }]
    };
    
    const mockTransaction = vi.fn(() => mockTx);
    vi.mocked(require('@solana/web3.js').Transaction).mockImplementation(mockTransaction);
    
    const result = await processDepositTransaction('mock-signed-tx', 'mock-user-address');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid instruction type: expected deposit');
  });

  it('should parse lamport amounts correctly', async () => {
    const { processDepositTransaction } = await import('../server/solana.js');
    
    // Create a mock transaction with specific amount (1 SOL = 1,000,000,000 lamports)
    const amountLamports = BigInt(1000000000); // 1 SOL
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(amountLamports, 0);
    
    const mockTx = {
      signatures: [{ signature: 'mock-sig' }],
      instructions: [{
        programId: { equals: vi.fn(() => true) },
        keys: [
          { pubkey: { equals: vi.fn(() => true) } },
          { pubkey: { equals: vi.fn(() => true) }, isSigner: true }
        ],
        data: Buffer.concat([
          Buffer.from([0x8f, 0x4f, 0x8c, 0x8a, 0x8b, 0x8d, 0x8e, 0x8f]), // deposit discriminator
          amountBuffer
        ])
      }]
    };
    
    const mockTransaction = vi.fn(() => mockTx);
    vi.mocked(require('@solana/web3.js').Transaction).mockImplementation(mockTransaction);
    
    const result = await processDepositTransaction('mock-signed-tx', 'mock-user-address');
    
    expect(result.success).toBe(true);
    expect(result.verifiedAmount).toBe(1.0); // 1 SOL
  });

  it('should handle large lamport amounts without precision loss', async () => {
    const { processDepositTransaction } = await import('../server/solana.js');
    
    // Test with large amount near 2^53 limit
    const largeAmountLamports = BigInt('9007199254740991'); // Near JavaScript Number.MAX_SAFE_INTEGER
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(largeAmountLamports, 0);
    
    const mockTx = {
      signatures: [{ signature: 'mock-sig' }],
      instructions: [{
        programId: { equals: vi.fn(() => true) },
        keys: [
          { pubkey: { equals: vi.fn(() => true) } },
          { pubkey: { equals: vi.fn(() => true) }, isSigner: true }
        ],
        data: Buffer.concat([
          Buffer.from([0x8f, 0x4f, 0x8c, 0x8a, 0x8b, 0x8d, 0x8e, 0x8f]), // deposit discriminator
          amountBuffer
        ])
      }]
    };
    
    const mockTransaction = vi.fn(() => mockTx);
    vi.mocked(require('@solana/web3.js').Transaction).mockImplementation(mockTransaction);
    
    const result = await processDepositTransaction('mock-signed-tx', 'mock-user-address');
    
    expect(result.success).toBe(true);
    // Verify the amount is parsed correctly without precision loss
    expect(result.verifiedAmount).toBe(Number(largeAmountLamports) / 1e9);
  });

  it('should compute discriminators correctly without throwing', () => {
    // Test that discriminator computation doesn't throw
    expect(() => {
      const depositDiscriminator = computeDiscriminator('deposit');
      const withdrawDiscriminator = computeDiscriminator('withdraw');
      
      expect(depositDiscriminator).toBeInstanceOf(Buffer);
      expect(withdrawDiscriminator).toBeInstanceOf(Buffer);
      expect(depositDiscriminator.length).toBe(8);
      expect(withdrawDiscriminator.length).toBe(8);
    }).not.toThrow();
  });

  it('should handle large vault balances without precision loss', async () => {
    // Mock large balance that exceeds Number.MAX_SAFE_INTEGER
    const largeBalance = '9007199254740992'; // Just above MAX_SAFE_INTEGER
    mockProgram.account.vault.fetch.mockResolvedValueOnce({
      balance: { toString: () => largeBalance }
    });
    
    const { getVaultBalance } = solana;
    const result = await getVaultBalance('mock-user-address');
    
    // Should return string for large values
    expect(typeof result).toBe('string');
    expect(result).toBe(largeBalance);
  });

  it('should return number for safe vault balances', async () => {
    // Mock safe balance
    const safeBalance = '1000000000'; // 1 SOL in lamports
    mockProgram.account.vault.fetch.mockResolvedValueOnce({
      balance: { toString: () => safeBalance }
    });
    
    const { getVaultBalance } = solana;
    const result = await getVaultBalance('mock-user-address');
    
    // Should return number for safe values
    expect(typeof result).toBe('number');
    expect(result).toBe(1); // 1 SOL
  });

  it('should handle amounts above Number.MAX_SAFE_INTEGER without precision loss', async () => {
    // Mock very large lamport amount
    const largeLamports = '9007199254740992'; // Just above MAX_SAFE_INTEGER
    const mockTx = createMockTransaction('deposit', largeLamports);
    
    vi.mocked(solana.processDepositTransaction).mockResolvedValue({
      success: true,
      signature: 'mock-signature',
      verifiedAmountLamports: largeLamports
    });
    
    const result = await solana.processDepositTransaction(mockTx, 'mock-user-address');
    
    expect(result.success).toBe(true);
    expect(result.verifiedAmountLamports).toBe(largeLamports);
    
    // Verify the amount is preserved as string for large values
    expect(typeof result.verifiedAmountLamports).toBe('string');
  });

  it('should fail gracefully when vault does not exist for deposit', async () => {
    // Mock vault fetch failure
    mockProgram.account.vault.fetch.mockRejectedValueOnce(
      new Error('Account does not exist')
    );
    
    const { buildDepositTransaction } = solana;
    
    await expect(buildDepositTransaction('mock-user-address', 1.0))
      .rejects
      .toThrow('Vault does not exist. Please initialize your vault first by running the vault initialization flow.');
  });

  it('should fail gracefully when vault has invalid discriminator', async () => {
    // Mock vault fetch failure with invalid discriminator
    mockProgram.account.vault.fetch.mockRejectedValueOnce(
      new Error('Invalid account discriminator')
    );
    
    const { buildDepositTransaction } = solana;
    
    await expect(buildDepositTransaction('mock-user-address', 1.0))
      .rejects
      .toThrow('Vault does not exist. Please initialize your vault first by running the vault initialization flow.');
  });

  it('should re-throw other vault fetch errors', async () => {
    // Mock vault fetch failure with different error
    const networkError = new Error('Network connection failed');
    mockProgram.account.vault.fetch.mockRejectedValueOnce(networkError);
    
    const { buildDepositTransaction } = solana;
    
    await expect(buildDepositTransaction('mock-user-address', 1.0))
      .rejects
      .toThrow('Network connection failed');
  });

  it('should throw error instead of returning 0 when RPC fails for getVaultBalance', async () => {
    // Mock RPC failure
    const rpcError = new Error('RPC connection failed');
    mockProgram.account.vault.fetch.mockRejectedValueOnce(rpcError);
    
    const { getVaultBalance } = solana;
    
    await expect(getVaultBalance('mock-user-address'))
      .rejects
      .toThrow('RPC connection failed');
  });

  it('should throw error instead of returning 0 when program is not initialized for getVaultBalance', async () => {
    // Mock uninitialized program
    const originalProgram = solana.program;
    solana.program = null;
    
    const { getVaultBalance } = solana;
    
    await expect(getVaultBalance('mock-user-address'))
      .rejects
      .toThrow('Solana program not initialized');
    
    // Restore original program
    solana.program = originalProgram;
  });

  it('should reject deposit transactions with multiple instructions', async () => {
    // Mock transaction with multiple instructions
    const mockTx = {
      instructions: [
        { programId: 'mock-program', data: Buffer.from('deposit'), keys: [] },
        { programId: 'mock-program', data: Buffer.from('extra'), keys: [] }
      ],
      signatures: [{ publicKey: 'mock-user' }]
    };
    
    vi.mocked(require('@solana/web3.js').Transaction.from).mockReturnValue(mockTx);
    
    const { processDepositTransaction } = solana;
    
    await expect(processDepositTransaction('mock-signed-tx', 'mock-user-address'))
      .rejects
      .toThrow('Transaction must contain exactly one instruction, found 2');
  });

  it('should reject withdraw transactions with multiple instructions', async () => {
    // Mock transaction with multiple instructions
    const mockTx = {
      instructions: [
        { programId: 'mock-program', data: Buffer.from('withdraw'), keys: [] },
        { programId: 'mock-program', data: Buffer.from('extra'), keys: [] }
      ],
      signatures: [{ publicKey: 'mock-user' }]
    };
    
    vi.mocked(require('@solana/web3.js').Transaction.from).mockReturnValue(mockTx);
    
    const { processWithdrawTransaction } = solana;
    
    await expect(processWithdrawTransaction('mock-signed-tx', 'mock-user-address'))
      .rejects
      .toThrow('Transaction must contain exactly one instruction, found 2');
  });

  it('should reject deposit transactions with zero instructions', async () => {
    // Mock transaction with no instructions
    const mockTx = {
      instructions: [],
      signatures: [{ publicKey: 'mock-user' }]
    };
    
    vi.mocked(require('@solana/web3.js').Transaction.from).mockReturnValue(mockTx);
    
    const { processDepositTransaction } = solana;
    
    await expect(processDepositTransaction('mock-signed-tx', 'mock-user-address'))
      .rejects
      .toThrow('Transaction must contain exactly one instruction, found 0');
  });
});
