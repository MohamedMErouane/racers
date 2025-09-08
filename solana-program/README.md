# Solana Program - Racers Vault

This directory contains the Solana program for the Racers.fun vault operations.

## Build Setup

### Prerequisites
- Rust (latest stable version)
- Solana CLI tools
- Anchor framework

### Building the Program

```bash
# Navigate to the program directory
cd solana-program

# Build the program
anchor build

# Deploy to devnet (optional)
anchor deploy --provider.cluster devnet
```

### Cargo.lock Handling

The `Cargo.lock` file is intentionally ignored in version control (see `.gitignore`). This is the recommended approach for Solana programs because:

1. **Reproducible Builds**: The lock file is regenerated during the build process
2. **Avoid Conflicts**: Prevents merge conflicts from dependency version differences
3. **Clean Repository**: Keeps the repository focused on source code rather than build artifacts

If you need to ensure reproducible builds across environments, the `Cargo.lock` file will be automatically generated when you run `anchor build` or `cargo build`.

### Program Features

- **Vault Management**: Create and manage user vaults for SOL storage
- **Deposit Operations**: Allow users to deposit SOL into their vaults
- **Withdraw Operations**: Allow users to withdraw SOL from their vaults
- **Balance Tracking**: Maintain accurate on-chain balance records

### ⚠️ IMPORTANT: Program ID Configuration

**Before building or deploying, you MUST update the program ID in the source code:**

1. **Update `src/lib.rs`**: Replace `YOUR_DEPLOYED_PROGRAM_ID_HERE` with your actual deployed program ID
2. **Update `env.example`**: Set `PROGRAM_ID` to match your deployed program ID
3. **Update backend environment**: Ensure your backend's `PROGRAM_ID` environment variable matches

**Example:**
```rust
// In src/lib.rs
declare_id!("YourActualProgramId123456789012345678901234567890");
```

```bash
# In your environment
PROGRAM_ID=YourActualProgramId123456789012345678901234567890
```

**⚠️ Failure to update the program ID will result in transaction mismatches and failed operations.**

### Configuration

The program configuration is managed through `Anchor.toml`:

```toml
[programs.devnet]
racers_vault = "YOUR_PROGRAM_ID"

[programs.mainnet]
racers_vault = "YOUR_PROGRAM_ID"
```

### Testing

```bash
# Run tests
anchor test

# Run specific test
anchor test -- --test test_name
```

### Deployment

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet (production)
anchor deploy --provider.cluster mainnet
```

## Security Considerations

- All vault operations require proper user authentication
- Balance checks are performed on-chain to prevent double-spending
- Program uses Anchor's built-in security features for account validation
