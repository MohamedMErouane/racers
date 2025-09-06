use anchor_lang::prelude::*;
use anchor_lang::system_program;
use std::collections::HashMap;

declare_id!("RacersFun1111111111111111111111111111111111");

#[program]
pub mod racers_program {
    use super::*;

    // Initialize a new race
    pub fn initialize_race(
        ctx: Context<InitializeRace>,
        race_id: String,
        round_id: u64,
        duration: u64,
    ) -> Result<()> {
        let race = &mut ctx.accounts.race;
        race.race_id = race_id;
        race.round_id = round_id;
        race.status = RaceStatus::Waiting;
        race.duration = duration;
        race.start_time = 0;
        race.end_time = 0;
        race.total_pot = 0;
        race.winner = 0;
        race.authority = ctx.accounts.authority.key();
        race.bump = *ctx.bumps.get("race").unwrap();

        emit!(RaceInitialized {
            race_id: race.race_id.clone(),
            round_id: race.round_id,
            authority: race.authority,
        });

        Ok(())
    }

    // Place a bet on a racer
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        race_id: String,
        racer_id: u8,
        amount: u64,
    ) -> Result<()> {
        let race = &mut ctx.accounts.race;
        let bet = &mut ctx.accounts.bet;
        let user = &mut ctx.accounts.user;

        // Validate race status
        require!(race.status == RaceStatus::Waiting || race.status == RaceStatus::Countdown, 
                ErrorCode::RaceNotAcceptingBets);

        // Validate bet amount
        require!(amount > 0 && amount <= 100_000_000_000, ErrorCode::InvalidBetAmount);

        // Check if user already has a bet in this race
        require!(user.bets.get(&race_id).is_none(), ErrorCode::UserAlreadyBet);

        // Transfer SOL to the race pot
        let transfer_instruction = system_program::Transfer {
            from: ctx.accounts.bettor.to_account_info(),
            to: race.to_account_info(),
        };
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        );
        system_program::transfer(cpi_context, amount)?;

        // Create bet account
        bet.race_id = race_id.clone();
        bet.user = ctx.accounts.bettor.key();
        bet.racer_id = racer_id;
        bet.amount = amount;
        bet.status = BetStatus::Active;
        bet.payout = 0;
        bet.bump = *ctx.bumps.get("bet").unwrap();

        // Update race total pot
        race.total_pot += amount;

        // Update user bet tracking
        user.bets.insert(race_id.clone(), bet.key());

        emit!(BetPlaced {
            race_id,
            user: bet.user,
            racer_id,
            amount,
            total_pot: race.total_pot,
        });

        Ok(())
    }

    // Start a race
    pub fn start_race(ctx: Context<StartRace>, race_id: String) -> Result<()> {
        let race = &mut ctx.accounts.race;
        
        // Validate authority
        require!(race.authority == ctx.accounts.authority.key(), ErrorCode::Unauthorized);
        require!(race.status == RaceStatus::Waiting || race.status == RaceStatus::Countdown, 
                ErrorCode::InvalidRaceStatus);

        race.status = RaceStatus::Racing;
        race.start_time = Clock::get()?.unix_timestamp as u64;
        race.end_time = race.start_time + race.duration;

        emit!(RaceStarted {
            race_id,
            start_time: race.start_time,
            end_time: race.end_time,
        });

        Ok(())
    }

    // Finish a race and determine winner
    pub fn finish_race(
        ctx: Context<FinishRace>,
        race_id: String,
        winner: u8,
        seed: u64,
    ) -> Result<()> {
        let race = &mut ctx.accounts.race;
        
        // Validate authority
        require!(race.authority == ctx.accounts.authority.key(), ErrorCode::Unauthorized);
        require!(race.status == RaceStatus::Racing, ErrorCode::InvalidRaceStatus);

        race.status = RaceStatus::Completed;
        race.winner = winner;

        emit!(RaceFinished {
            race_id,
            winner,
            total_pot: race.total_pot,
            seed,
        });

        Ok(())
    }

    // Claim winnings from a bet
    pub fn claim_winnings(ctx: Context<ClaimWinnings>, race_id: String) -> Result<()> {
        let race = &ctx.accounts.race;
        let bet = &mut ctx.accounts.bet;
        let user = &mut ctx.accounts.user;

        // Validate race is completed
        require!(race.status == RaceStatus::Completed, ErrorCode::RaceNotCompleted);
        require!(bet.status == BetStatus::Active, ErrorCode::BetAlreadyClaimed);

        // Check if user won
        if bet.racer_id == race.winner {
            // Calculate payout (86% of total pot to winners, pro-rata)
            let total_winner_bets = race.total_pot; // Simplified for demo
            let user_share = (bet.amount * 86) / 100; // 86% payout
            let house_edge = (race.total_pot * 4) / 100; // 4% house edge
            let rakeback = (race.total_pot * 10) / 100; // 10% rakeback

            bet.payout = user_share;
            bet.status = BetStatus::Won;

            // Transfer winnings to user
            let transfer_instruction = system_program::Transfer {
                from: race.to_account_info(),
                to: ctx.accounts.bettor.to_account_info(),
            };
            let cpi_context = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                transfer_instruction,
            );
            system_program::transfer(cpi_context, user_share)?;

            emit!(WinningsClaimed {
                race_id,
                user: bet.user,
                amount: user_share,
                profit: user_share - bet.amount,
            });
        } else {
            // User lost, mark bet as lost
            bet.status = BetStatus::Lost;
            
            emit!(BetLost {
                race_id,
                user: bet.user,
                amount: bet.amount,
            });
        }

        // Remove bet from user's active bets
        user.bets.remove(&race_id);

        Ok(())
    }

    // Claim rakeback for losing bets
    pub fn claim_rakeback(ctx: Context<ClaimRakeback>, race_id: String) -> Result<()> {
        let race = &ctx.accounts.race;
        let bet = &mut ctx.accounts.bet;

        // Validate race is completed and user lost
        require!(race.status == RaceStatus::Completed, ErrorCode::RaceNotCompleted);
        require!(bet.status == BetStatus::Lost, ErrorCode::BetNotLost);
        require!(bet.racer_id != race.winner, ErrorCode::UserWon);

        // Calculate rakeback (10% of total pot distributed among losers)
        let rakeback_amount = (race.total_pot * 10) / 100; // Simplified calculation
        let user_rakeback = rakeback_amount / 4; // Assume 4 losing bettors on average

        bet.status = BetStatus::RakebackClaimed;

        // Transfer rakeback to user
        let transfer_instruction = system_program::Transfer {
            from: race.to_account_info(),
            to: ctx.accounts.bettor.to_account_info(),
        };
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        );
        system_program::transfer(cpi_context, user_rakeback)?;

        emit!(RakebackClaimed {
            race_id,
            user: bet.user,
            amount: user_rakeback,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(race_id: String)]
pub struct InitializeRace<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 32 + 1,
        seeds = [b"race", race_id.as_bytes()],
        bump
    )]
    pub race: Account<'info, Race>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(race_id: String, racer_id: u8, amount: u64)]
pub struct PlaceBet<'info> {
    #[account(
        mut,
        seeds = [b"race", race_id.as_bytes()],
        bump = race.bump
    )]
    pub race: Account<'info, Race>,
    
    #[account(
        init,
        payer = bettor,
        space = 8 + 32 + 32 + 1 + 8 + 1 + 8 + 1,
        seeds = [b"bet", race_id.as_bytes(), bettor.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(
        init_if_needed,
        payer = bettor,
        space = 8 + 32 + 8,
        seeds = [b"user", bettor.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub bettor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(race_id: String)]
pub struct StartRace<'info> {
    #[account(
        mut,
        seeds = [b"race", race_id.as_bytes()],
        bump = race.bump
    )]
    pub race: Account<'info, Race>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(race_id: String, winner: u8, seed: u64)]
pub struct FinishRace<'info> {
    #[account(
        mut,
        seeds = [b"race", race_id.as_bytes()],
        bump = race.bump
    )]
    pub race: Account<'info, Race>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(race_id: String)]
pub struct ClaimWinnings<'info> {
    #[account(
        seeds = [b"race", race_id.as_bytes()],
        bump = race.bump
    )]
    pub race: Account<'info, Race>,
    
    #[account(
        mut,
        seeds = [b"bet", race_id.as_bytes(), bettor.key().as_ref()],
        bump = bet.bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(
        mut,
        seeds = [b"user", bettor.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub bettor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(race_id: String)]
pub struct ClaimRakeback<'info> {
    #[account(
        seeds = [b"race", race_id.as_bytes()],
        bump = race.bump
    )]
    pub race: Account<'info, Race>,
    
    #[account(
        mut,
        seeds = [b"bet", race_id.as_bytes(), bettor.key().as_ref()],
        bump = bet.bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(mut)]
    pub bettor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Race {
    pub race_id: String,
    pub round_id: u64,
    pub status: RaceStatus,
    pub duration: u64,
    pub start_time: u64,
    pub end_time: u64,
    pub total_pot: u64,
    pub winner: u8,
    pub authority: Pubkey,
    pub bump: u8,
}

#[account]
pub struct Bet {
    pub race_id: String,
    pub user: Pubkey,
    pub racer_id: u8,
    pub amount: u64,
    pub status: BetStatus,
    pub payout: u64,
    pub bump: u8,
}

#[account]
pub struct User {
    pub wallet: Pubkey,
    pub total_wagered: u64,
    pub total_won: u64,
    pub bets: HashMap<String, Pubkey>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum RaceStatus {
    Waiting,
    Countdown,
    Racing,
    Completed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BetStatus {
    Active,
    Won,
    Lost,
    RakebackClaimed,
}

#[event]
pub struct RaceInitialized {
    pub race_id: String,
    pub round_id: u64,
    pub authority: Pubkey,
}

#[event]
pub struct BetPlaced {
    pub race_id: String,
    pub user: Pubkey,
    pub racer_id: u8,
    pub amount: u64,
    pub total_pot: u64,
}

#[event]
pub struct RaceStarted {
    pub race_id: String,
    pub start_time: u64,
    pub end_time: u64,
}

#[event]
pub struct RaceFinished {
    pub race_id: String,
    pub winner: u8,
    pub total_pot: u64,
    pub seed: u64,
}

#[event]
pub struct WinningsClaimed {
    pub race_id: String,
    pub user: Pubkey,
    pub amount: u64,
    pub profit: u64,
}

#[event]
pub struct BetLost {
    pub race_id: String,
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RakebackClaimed {
    pub race_id: String,
    pub user: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Race is not accepting bets")]
    RaceNotAcceptingBets,
    #[msg("Invalid bet amount")]
    InvalidBetAmount,
    #[msg("User already has a bet in this race")]
    UserAlreadyBet,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid race status")]
    InvalidRaceStatus,
    #[msg("Race not completed")]
    RaceNotCompleted,
    #[msg("Bet already claimed")]
    BetAlreadyClaimed,
    #[msg("Bet not lost")]
    BetNotLost,
    #[msg("User won, cannot claim rakeback")]
    UserWon,
}
