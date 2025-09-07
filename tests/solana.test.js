import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    idl: {
      instructionDiscriminator: vi.fn((name) => {
        if (name === 'deposit') return Buffer.from([0x8f, 0x4f, 0x8c, 0x8a, 0x8b, 0x8d, 0x8e, 0x8f]);
        if (name === 'withdraw') return Buffer.from([0x9f, 0x5f, 0x9c, 0x9a, 0x9b, 0x9d, 0x9e, 0x9f]);
        return Buffer.alloc(8);
      })
    }
  }
}));

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
});
