use anchor_lang::prelude::*;
use crate::state::*;
use shared::{EconomicConfig, TechnicalConfig};

#[derive(Accounts)]
pub struct InitializeTrading<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        space = TradeConfig::INIT_SPACE,
        seeds = [b"trade_config"],
        bump
    )]
    pub trade_config: Account<'info, TradeConfig>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeTrading>,
    vault_program: Pubkey,
    economic_config: EconomicConfig,
    technical_config: TechnicalConfig,
) -> Result<()> {
    let trade_config = &mut ctx.accounts.trade_config;
    
    trade_config.initialize(
        ctx.accounts.admin.key(),
        vault_program,
        economic_config,
        technical_config,
        ctx.bumps.trade_config,
    );
    
    msg!("Trading system initialized");
    Ok(())
} 