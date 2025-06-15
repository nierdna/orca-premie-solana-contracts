use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;

/// Initialize vault system (Admin only)
#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + VaultConfig::INIT_SPACE,
        seeds = [VaultConfig::VAULT_CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, VaultConfig>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeVault>,
    admin: Pubkey,
    emergency_admin: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // Initialize vault config
    config.initialize(admin, emergency_admin, ctx.bumps.config);
    
    // Emit initialization event
    emit!(VaultInitialized {
        admin,
        emergency_admin,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!("Vault initialized: admin={}, emergency_admin={}", admin, emergency_admin);
    
    Ok(())
} 