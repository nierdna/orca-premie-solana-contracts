use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::VaultError;
use crate::events::*;

/// CPI ONLY: Add user balance (exact EVM creditBalance mapping)
/// Used by trading program to "unlock" collateral
#[derive(Accounts)]
pub struct CreditBalance<'info> {
    #[account(
        seeds = [VaultConfig::VAULT_CONFIG_SEED],
        bump = config.bump,
        constraint = config.is_authorized_trader(&crate::id()) @ VaultError::UnauthorizedTrader,
        constraint = !config.paused @ VaultError::VaultPaused,
    )]
    pub config: Account<'info, VaultConfig>,
    
    #[account(
        mut,
        seeds = [
            UserBalance::USER_BALANCE_SEED,
            user_balance.user.as_ref(),
            user_balance.token_mint.as_ref()
        ],
        bump = user_balance.bump,
    )]
    pub user_balance: Account<'info, UserBalance>,
    
    #[account(
        seeds = [
            VaultAuthority::VAULT_AUTHORITY_SEED,
            user_balance.token_mint.as_ref()
        ],
        bump = vault_authority.bump,
    )]
    pub vault_authority: Account<'info, VaultAuthority>,
}

pub fn handler(ctx: Context<CreditBalance>, amount: u64) -> Result<()> {
    // Validate amount
    require!(amount > 0, VaultError::ZeroAmount);
    
    // Validate CPI caller is authorized trading program
    let caller_program = ctx.program_id;
    require!(
        ctx.accounts.config.is_authorized_trader(caller_program),
        VaultError::UnauthorizedCPICaller
    );
    
    let user_balance = &mut ctx.accounts.user_balance;
    
    // Add to balance (exact EVM creditBalance logic)
    user_balance.credit_balance(amount)?;
    
    // Emit event
    emit!(BalanceCredited {
        user: user_balance.user,
        token_mint: user_balance.token_mint,
        amount,
        caller_program: *caller_program,
    });
    
    msg!(
        "Balance credited: user={}, token={}, amount={}, new_balance={}",
        user_balance.user,
        user_balance.token_mint,
        amount,
        user_balance.balance
    );
    
    Ok(())
}
