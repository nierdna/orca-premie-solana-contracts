use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use crate::state::*;
use crate::error::TradingError;
use crate::events::TokenMapped;

#[derive(Accounts)]
pub struct MapToken<'info> {
    /// TokenMarket account to map (must exist and be unMapped)
    #[account(
        mut,
        constraint = token_market.to_account_info().owner == &crate::ID @ TradingError::InvalidAccountOwner,
        constraint = token_market.real_mint.is_none() @ TradingError::TokenAlreadyMapped,
    )]
    pub token_market: Account<'info, TokenMarket>,
    
    /// Real token mint to map to this market
    #[account(
        constraint = real_mint.to_account_info().owner == &anchor_spl::token::ID @ TradingError::InvalidTokenMint,
    )]
    pub real_mint: Account<'info, Mint>,
    
    /// Trade configuration PDA for admin validation
    #[account(
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ TradingError::InvalidAdmin,
        constraint = !config.paused @ TradingError::TradingPaused,
    )]
    pub config: Account<'info, TradeConfig>,
    
    /// Admin signer (must match config.admin)
    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn handler(
    ctx: Context<MapToken>,
    real_mint: Pubkey,
) -> Result<()> {
    // Get token market key before mutable borrow
    let token_market_key = ctx.accounts.token_market.key();
    let token_market = &mut ctx.accounts.token_market;
    
    // Validate real_mint matches the account passed
    require!(
        real_mint == ctx.accounts.real_mint.key(),
        TradingError::InvalidTokenMint
    );
    
    // Additional validation: ensure token market exists and is valid
    require!(
        token_market.token_id == token_market_key,
        TradingError::InvalidTokenAddress
    );
    
    // Map the real token to this market
    let mapping_time = Clock::get()?.unix_timestamp;
    token_market.real_mint = Some(real_mint);
    token_market.mapping_time = Some(mapping_time);
    
    // Emit TokenMapped event
    emit!(TokenMapped {
        token_id: token_market.token_id,
        real_mint,
        mapping_time,
    });
    
    msg!(
        "Token mapped successfully: market_id: {} -> real_mint: {} at time: {}",
        token_market.token_id,
        real_mint,
        mapping_time
    );
    
    Ok(())
} 