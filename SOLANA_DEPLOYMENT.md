# Solana Smart Contract Deployment Guide

This guide walks you through deploying the Racers.fun Solana smart contract for deposit/withdraw functionality.

## Prerequisites

1. **Install Solana CLI**: https://docs.solana.com/cli/install-solana-cli-tools
2. **Install Anchor CLI**: https://www.anchor-lang.com/docs/installation
3. **Install Rust**: https://rustup.rs/

## Setup

### 1. Configure Solana CLI

```bash
# Set to devnet for testing
solana config set --url devnet

# Create a new keypair (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Check your configuration
solana config get

# Request airdrop for devnet testing
solana airdrop 2
```

### 2. Configure Anchor

```bash
cd solana-program

# Install dependencies
npm install

# Generate a new program keypair
anchor keys generate

# Update Anchor.toml with the new program ID
# The program ID will be displayed after running the keys generate command
```

### 3. Update Program ID

1. Copy the program ID from `anchor keys generate`
2. Update `solana-program/src/lib.rs`:
   ```rust
   declare_id!("YOUR_GENERATED_PROGRAM_ID_HERE");
   ```
3. Update `solana-program/Anchor.toml`:
   ```toml
   [programs.devnet]
   racers_vault = "YOUR_GENERATED_PROGRAM_ID_HERE"
   ```

## Deployment

### 1. Build the Program

```bash
cd solana-program
anchor build
```

### 2. Deploy to Devnet

```bash
# Deploy the program
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show YOUR_PROGRAM_ID --url devnet
```

### 3. Generate IDL

```bash
# Generate TypeScript client
anchor build
```

The IDL file will be generated at `target/idl/racers_vault.json`.

## Environment Configuration

Update your `.env` file with the deployed program information:

```env
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com
PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID_HERE

# Server keypair for program interaction (optional)
PHANTOM_PRIVATE_KEY=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64]
```

## Testing

### 1. Run Anchor Tests

```bash
cd solana-program
anchor test
```

### 2. Test with Frontend

1. Start your backend server:
   ```bash
   npm run dev
   ```

2. Open your frontend and test:
   - Connect wallet
   - Try deposit (small amount first)
   - Try withdraw
   - Check transaction on Solana Explorer

## Mainnet Deployment

### 1. Switch to Mainnet

```bash
# Configure for mainnet
solana config set --url mainnet-beta

# Ensure you have enough SOL for deployment (approximately 2-3 SOL)
solana balance

# Request more SOL if needed (not available on mainnet - you'll need to buy/transfer)
```

### 2. Update Configuration

Update `Anchor.toml`:

```toml
[programs.mainnet]
racers_vault = "YOUR_PROGRAM_ID"

[provider]
cluster = "mainnet"
```

### 3. Deploy to Mainnet

```bash
anchor deploy --provider.cluster mainnet-beta
```

### 4. Update Environment

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com
```

## Verification

### 1. Verify Program

Visit Solana Explorer and search for your program ID:
- Devnet: https://explorer.solana.com/?cluster=devnet
- Mainnet: https://explorer.solana.com/

### 2. Test Transactions

1. Perform a small deposit
2. Check the transaction hash on Solana Explorer
3. Verify vault account creation
4. Test withdrawal

## Troubleshooting

### Common Issues

1. **Insufficient SOL for deployment**
   - Solution: Request airdrop (devnet) or transfer more SOL

2. **Program ID mismatch**
   - Solution: Ensure `declare_id!()` matches `Anchor.toml`

3. **RPC rate limits**
   - Solution: Use a dedicated RPC provider (QuickNode, Alchemy)

4. **Transaction timeouts**
   - Solution: Increase timeout in client or retry logic

### Logs

Check logs for debugging:

```bash
# Server logs
tail -f logs/app.log

# Solana program logs
solana logs YOUR_PROGRAM_ID
```

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **Program Updates**: Use upgrade authority carefully
3. **Rate Limiting**: Implement proper rate limiting for deposits/withdrawals
4. **Balance Checks**: Always verify balances before transactions
5. **Error Handling**: Implement comprehensive error handling

## Next Steps

1. Set up monitoring for transactions
2. Implement proper error handling in frontend
3. Add transaction history features
4. Consider implementing multi-sig for program upgrades
5. Set up alerting for failed transactions