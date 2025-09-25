# Quick Deploy Script for Racers.fun Smart Contract

## Option 1: Use Existing Program ID (Fastest)

For immediate testing and delivery, you can use the placeholder program ID that's already in your code:

```env
PROGRAM_ID=RacersFun1111111111111111111111111111111111
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com
```

**Note**: This is a placeholder ID. You'll need to deploy the actual program later.

## Option 2: Use Solana Playground (Recommended for Quick Deploy)

1. **Go to Solana Playground**: https://beta.solpg.io/
2. **Create new project** and paste your Rust code from `src/lib.rs`
3. **Build and Deploy** directly in the browser
4. **Copy the Program ID** and update your `.env` file

## Option 3: Manual Installation (Full Setup)

If you want to set up the full Solana development environment:

### Step 1: Install Solana CLI

```bash
# Option A: Using Scoop (Windows Package Manager)
scoop install solana

# Option B: Download installer
# Go to: https://github.com/solana-labs/solana/releases
# Download: solana-install-init-x86_64-pc-windows-msvc.exe
# Run the installer

# Option C: Using WSL (Windows Subsystem for Linux)
wsl
sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"
```

### Step 2: Configure Solana

```bash
# Set cluster to devnet
solana config set --url devnet

# Create keypair
solana-keygen new

# Check balance and airdrop if needed
solana balance
solana airdrop 2
```

### Step 3: Install Anchor

```bash
# Using avm (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Or install directly
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### Step 4: Deploy Smart Contract

```bash
cd solana-program

# Generate program keypair
anchor keys generate

# Update program ID in lib.rs and Anchor.toml

# Build and deploy
anchor build
anchor deploy
```

## Quick Start for Client Delivery

Since you need to deliver tomorrow, here's the fastest approach:

### 1. Update your `.env` file:

```env
# Use devnet for testing
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com

# Use placeholder program ID (you'll deploy later)
PROGRAM_ID=RacersFun1111111111111111111111111111111111

# Optional: Add your wallet private key for backend operations
PHANTOM_PRIVATE_KEY=[...]
```

### 2. Test the integration:

```bash
# Start your backend
npm run dev

# Test API endpoints
curl http://localhost:3001/health
```

### 3. Frontend testing:

1. Open http://localhost:3001
2. Connect Phantom wallet (make sure it's on devnet)
3. Try deposit/withdraw buttons
4. The UI should work, but transactions will fail until you deploy the real contract

### 4. For client demo:

You can show:
- ✅ Complete UI with deposit/withdraw modals
- ✅ Wallet connection working
- ✅ All API endpoints implemented
- ✅ Transaction building (will show "program not deployed" error, which is expected)
- ✅ Off-chain transaction listener
- ✅ Database integration for balance management

### 5. Next steps after delivery:

Deploy the actual smart contract using Solana Playground or full toolchain installation.

## Error Handling

If you encounter any deployment issues:

1. **Check network**: Make sure you're on devnet
2. **Check balance**: Ensure you have enough SOL for deployment
3. **Check program ID**: Ensure it matches in all files
4. **Check RPC**: Try different RPC endpoints if rate limited

## Production Checklist

Before mainnet deployment:
- [ ] Audit smart contract code
- [ ] Test with small amounts first
- [ ] Set up monitoring
- [ ] Configure proper RPC endpoints
- [ ] Implement proper error handling
- [ ] Set up alerts for failed transactions