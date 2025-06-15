use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::VaultError;
use crate::events::*;

/// Manage authorized trading programs (Admin only)
#[derive(Accounts)]
pub struct ManageAuthorizedTrader<'info> {
    #[account(
        mut,
        seeds = [VaultConfig::VAULT_CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ VaultError::InvalidAdmin,
    )]
    pub config: Account<'info, VaultConfig>,
    
    pub admin: Signer<'info>,
}

pub fn add_handler(
    ctx: Context<ManageAuthorizedTrader>,
    trader_program: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // Add authorized trader
    config.add_authorized_trader(trader_program)?;
    
    // Emit event
    emit!(AuthorizedTraderAdded {
        trader_program,
        admin: ctx.accounts.admin.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!(
        "Authorized trader added: program={}, admin={}",
        trader_program,
        ctx.accounts.admin.key()
    );
    
    Ok(())
}

pub fn remove_handler(
    ctx: Context<ManageAuthorizedTrader>,
    trader_program: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // Remove authorized trader
    config.remove_authorized_trader(&trader_program)?;
    
    // Emit event
    emit!(AuthorizedTraderRemoved {
        trader_program,
        admin: ctx.accounts.admin.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!(
        "Authorized trader removed: program={}, admin={}",
        trader_program,
        ctx.accounts.admin.key()
    );
    
    Ok(())
}
