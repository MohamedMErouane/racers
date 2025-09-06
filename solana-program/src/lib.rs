use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("RacersFun1111111111111111111111111111111111");

#[program]
pub mod racers_vault {
    use super::*;

    // Initialize user vault
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.user = ctx.accounts.user.key();
        vault.balance = 0;
        vault.total_deposited = 0;
        vault.total_withdrawn = 0;
        vault.bump = *ctx.bumps.get("vault").unwrap();

        emit!(VaultInitialized {
            user: vault.user,
            vault: vault.key(),
        });

        Ok(())
    }

    // Deposit SOL to user's vault
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        // Validate amount
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Transfer SOL from user to vault
        let transfer_instruction = system_program::Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: vault.to_account_info(),
        };
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        );
        system_program::transfer(cpi_context, amount)?;

        // Update vault balance
        vault.balance += amount;
        vault.total_deposited += amount;

        emit!(Deposited {
            user: vault.user,
            amount,
            new_balance: vault.balance,
        });

        Ok(())
    }

    // Withdraw SOL from user's vault
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        // Validate amount
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(vault.balance >= amount, ErrorCode::InsufficientBalance);

        // Update vault balance
        vault.balance -= amount;
        vault.total_withdrawn += amount;

        // Transfer SOL from vault to user
        let transfer_instruction = system_program::Transfer {
            from: vault.to_account_info(),
            to: ctx.accounts.user.to_account_info(),
        };
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        );
        system_program::transfer(cpi_context, amount)?;

        emit!(Withdrawn {
            user: vault.user,
            amount,
            new_balance: vault.balance,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"vault", user.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub user: Pubkey,
    pub balance: u64,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub bump: u8,
}

#[event]
pub struct VaultInitialized {
    pub user: Pubkey,
    pub vault: Pubkey,
}

#[event]
pub struct Deposited {
    pub user: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct Withdrawn {
    pub user: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient balance")]
    InsufficientBalance,
}