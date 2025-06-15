use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::VaultError;
use crate::events::*;

/// Emergency control (Emergency admin only)
#[derive(Accounts)]
pub struct EmergencyControl<'info> {
    #[account(
        mut,
        seeds = [VaultConfig::VAULT_CONFIG_SEED],
        bump = config.bump,
        constraint = config.emergency_admin == emergency_admin.key() @ VaultError::InvalidEmergencyAdmin,
    )]
    pub config: Account<'info, VaultConfig>,
    
    pub emergency_admin: Signer<'info>,
}

pub fn pause_handler(ctx: Context<EmergencyControl>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // Validate vault is not already paused
    require!(!config.paused, VaultError::VaultPaused);
    
    // Pause the vault
    config.paused = true;
    
    // Emit pause event
    emit!(VaultPaused {
        emergency_admin: ctx.accounts.emergency_admin.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!("Vault paused by emergency admin: {}", ctx.accounts.emergency_admin.key());
    Ok(())
}

pub fn unpause_handler(ctx: Context<EmergencyControl>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // Validate vault is currently paused
    require!(config.paused, VaultError::VaultNotPaused);
    
    // Unpause the vault
    config.paused = false;
    
    // Emit unpause event
    emit!(VaultUnpaused {
        emergency_admin: ctx.accounts.emergency_admin.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!("Vault unpaused by emergency admin: {}", ctx.accounts.emergency_admin.key());
    Ok(())
}
