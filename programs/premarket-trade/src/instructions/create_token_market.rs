use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::TradingError;
use crate::events::TokenMarketCreated;

#[derive(Accounts)]
#[instruction(symbol: String, name: String, settle_time_limit: u32)]
pub struct CreateTokenMarket<'info> {
    /// TokenMarket account (User-controlled keypair, not PDA)
    /// Client generates keypair, Anchor handles account creation/initialization
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + TokenMarket::INIT_SPACE,
        constraint = symbol.len() <= crate::common::MAX_SYMBOL_LENGTH @ TradingError::SymbolTooLong,
        constraint = name.len() <= crate::common::MAX_NAME_LENGTH @ TradingError::NameTooLong,
        constraint = settle_time_limit >= 3600 @ TradingError::InvalidSettleTime,
        constraint = settle_time_limit <= 2592000 @ TradingError::InvalidSettleTime,
    )]
    pub token_market: Account<'info, TokenMarket>,
    
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
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateTokenMarket>,
    symbol: String,
    name: String,
    settle_time_limit: u32,
) -> Result<()> {
    // Get the account key before mutable borrow
    let token_market_key = ctx.accounts.token_market.key();
    let token_market = &mut ctx.accounts.token_market;
    
    // Additional validations
    require!(symbol.trim().len() > 0, TradingError::SymbolTooLong);
    require!(name.trim().len() > 0, TradingError::NameTooLong);
    
    // Set token_id to account address for EVM compatibility
    token_market.token_id = token_market_key;
    token_market.symbol = symbol.clone();
    token_market.name = name.clone();
    token_market.real_mint = None;
    token_market.mapping_time = None;
    token_market.settle_time_limit = settle_time_limit;
    token_market.created_at = Clock::get()?.unix_timestamp;
    
    // Emit event with correct structure according to spec
    emit!(TokenMarketCreated {
        token_id: token_market.token_id,        // EVM compatible naming
        symbol: token_market.symbol.clone(),
        name: token_market.name.clone(),
        settle_time_limit,
        created_at: token_market.created_at,
    });
    
    msg!(
        "Token market created: {} ({}) - token_id: {} - settle_time: {} seconds", 
        name, 
        symbol, 
        token_market.token_id,
        settle_time_limit
    );
    
    Ok(())
} 