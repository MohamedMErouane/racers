# Milestone 2 Testing Checklist

## ✅ Smart Contract Functions

### 1. Deposit Function
- [ ] Accepts SOL amount parameter
- [ ] Validates amount > 0
- [ ] Transfers SOL from user to vault
- [ ] Updates vault balance
- [ ] Emits deposit event
- [ ] Handles insufficient funds error

### 2. Withdraw Function  
- [ ] Accepts SOL amount parameter
- [ ] Validates amount > 0
- [ ] Validates sufficient vault balance
- [ ] Transfers SOL from vault to user
- [ ] Updates vault balance
- [ ] Emits withdraw event
- [ ] Handles insufficient balance error

## ✅ Backend Integration

### 1. Solana Connection
- [ ] Connects to devnet/mainnet RPC
- [ ] Loads program IDL
- [ ] Initializes Anchor provider
- [ ] Handles connection errors gracefully

### 2. Transaction Building
- [ ] `/api/vault/deposit/build` endpoint works
- [ ] `/api/vault/withdraw/build` endpoint works
- [ ] `/api/vault/initialize/build` endpoint works
- [ ] Returns unsigned transactions as base64

### 3. Transaction Processing
- [ ] `/api/vault/deposit/process` verifies and processes deposits
- [ ] `/api/vault/withdraw/process` verifies and processes withdrawals
- [ ] `/api/vault/initialize/process` processes vault initialization
- [ ] Updates off-chain balance after confirmation
- [ ] Logs vault transactions to database

### 4. Balance Management
- [ ] `/api/balance` returns user's off-chain balance
- [ ] `/api/vault/balance/:userPublicKey` returns on-chain vault balance
- [ ] Balances sync correctly between on-chain and off-chain

## ✅ Frontend Integration

### 1. Wallet Connection
- [ ] Connects to Phantom wallet
- [ ] Displays connected wallet address
- [ ] Handles connection errors
- [ ] Shows wallet balance

### 2. Deposit Flow
- [ ] Deposit button opens modal
- [ ] Shows wallet SOL balance
- [ ] Validates deposit amount
- [ ] Builds and signs transaction
- [ ] Processes transaction
- [ ] Updates balance display
- [ ] Shows success/error messages

### 3. Withdraw Flow
- [ ] Withdraw button opens modal
- [ ] Shows platform balance
- [ ] Validates withdraw amount
- [ ] Builds and signs transaction
- [ ] Processes transaction
- [ ] Updates balance display
- [ ] Shows success/error messages

## ✅ Off-Chain Listener

### 1. Transaction Monitoring
- [ ] Listens for program account changes
- [ ] Decodes vault account data
- [ ] Logs transaction events
- [ ] Handles connection errors

### 2. User-Specific Monitoring
- [ ] Can subscribe to individual user vaults
- [ ] Handles vault updates in real-time
- [ ] Unsubscribes properly to prevent memory leaks

## 🧪 Testing Commands

### 1. Deploy Smart Contract

```bash
cd solana-program

# Generate new keypair (save the program ID)
anchor keys generate

# Update lib.rs with new program ID
# Update Anchor.toml with new program ID

# Build and deploy
anchor build
anchor deploy --provider.cluster devnet

# Test the program
anchor test
```

### 2. Start Backend

```bash
# Update .env with your program ID
echo "PROGRAM_ID=YOUR_PROGRAM_ID_HERE" >> .env
echo "SOLANA_RPC_URL=https://api.devnet.solana.com" >> .env

# Start server
npm run dev
```

### 3. Test API Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Test balance (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/balance

# Test deposit build (requires auth token)
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"amount": 0.1}' \
     http://localhost:3001/api/vault/deposit/build
```

### 4. Frontend Testing

1. **Open frontend**: http://localhost:3001
2. **Connect wallet**: Click "Connect" button
3. **Test deposit**:
   - Click "Deposit" button
   - Enter amount (e.g., 0.01 SOL)  
   - Click "DEPOSIT NOW"
   - Sign transaction in Phantom
   - Verify success message
4. **Test withdraw**:
   - Click "Withdraw" button
   - Enter amount
   - Click "WITHDRAW NOW"
   - Sign transaction in Phantom
   - Verify success message

## 🐛 Common Issues & Solutions

### 1. Program ID Mismatch
**Error**: `Invalid program ID`
**Solution**: Ensure `declare_id!()` in lib.rs matches Anchor.toml and .env

### 2. Insufficient SOL
**Error**: `Insufficient funds`
**Solution**: Request devnet airdrop: `solana airdrop 2`

### 3. Phantom Not Connected
**Error**: `Phantom wallet not found`
**Solution**: Install Phantom browser extension and connect to devnet

### 4. RPC Rate Limits
**Error**: `Too many requests`
**Solution**: Use dedicated RPC endpoint (QuickNode, Alchemy)

### 5. Transaction Timeouts
**Error**: `Transaction timeout`
**Solution**: Retry or check network congestion

## 📋 Delivery Checklist

- [ ] Smart contract deployed to devnet
- [ ] All API endpoints working
- [ ] Frontend deposit/withdraw flows complete
- [ ] Transaction listener running
- [ ] Environment variables configured
- [ ] Documentation complete
- [ ] Testing completed
- [ ] Error handling implemented
- [ ] Balance synchronization working
- [ ] Security validations in place

## 🚀 Production Deployment

Before going to mainnet:

1. **Security Review**: Audit smart contract code
2. **Load Testing**: Test with multiple concurrent users  
3. **Monitoring**: Set up alerts for failed transactions
4. **Backup**: Ensure database backups are configured
5. **Rate Limiting**: Implement proper API rate limiting
6. **Error Handling**: Test all error scenarios
7. **Documentation**: Update all documentation

## 📞 Client Handover

Provide client with:

1. **Deployed Contract Address**: `YOUR_PROGRAM_ID`
2. **Environment Configuration**: Complete .env template
3. **API Documentation**: All endpoint details
4. **Frontend Integration**: Working deposit/withdraw UI
5. **Monitoring Dashboard**: Transaction listener logs
6. **Deployment Guide**: Step-by-step mainnet deployment
7. **Security Notes**: Best practices and considerations