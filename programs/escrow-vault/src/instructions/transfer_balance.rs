use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::VaultError;
use crate::events::*;

/// CPI ONLY: Transfer between user balances (exact EVM transferBalance mapping)
/// Used by trading program for internal transfers
#[derive(Accounts)]
#[instruction(from_user: Pubkey, to_user: Pubkey, amount: u64)]
pub struct TransferBalance<'info> {
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
            from_user.as_ref(),
            from_balance.token_mint.as_ref()
        ],
        bump = from_balance.bump,
        constraint = from_balance.user == from_user @ VaultError::InvalidAccountOwner,
        constraint = from_balance.balance >= amount @ VaultError::InsufficientBalance,
    )]
    pub from_balance: Account<'info, UserBalance>,
    
    #[account(
        mut,
        seeds = [
            UserBalance::USER_BALANCE_SEED,
            to_user.as_ref(),
            to_balance.token_mint.as_ref()
        ],
        bump = to_balance.bump,
        constraint = to_balance.user == to_user @ VaultError::InvalidAccountOwner,
        constraint = to_balance.token_mint == from_balance.token_mint @ VaultError::InvalidTokenMint,
    )]
    pub to_balance: Account<'info, UserBalance>,
    
    #[account(
        seeds = [
            VaultAuthority::VAULT_AUTHORITY_SEED,
            from_balance.token_mint.as_ref()
        ],
        bump = vault_authority.bump,
    )]
    pub vault_authority: Account<'info, VaultAuthority>,
}

pub fn handler(
    ctx: Context<TransferBalance>,
    from_user: Pubkey,
    to_user: Pubkey,
    amount: u64,
) -> Result<()> {
    // Validate amount
    require!(amount > 0, VaultError::ZeroAmount);
    
    // Validate different users
    require!(from_user != to_user, VaultError::InvalidAccountOwner);
    
    // Validate CPI caller is authorized trading program
    let caller_program = ctx.program_id;
    require!(
        ctx.accounts.config.is_authorized_trader(caller_program),
        VaultError::UnauthorizedCPICaller
    );
    
    let from_balance = &mut ctx.accounts.from_balance;
    let to_balance = &mut ctx.accounts.to_balance;
    
    // Transfer balance (exact EVM transferBalance logic)
    from_balance.slash_balance(amount)?;  // Subtract from sender
    to_balance.credit_balance(amount)?;   // Add to receiver
    
    // Emit event
    emit!(BalanceTransferred {
        from_user,
        to_user,
        token_mint: from_balance.token_mint,
        amount,
        caller_program: *caller_program,
    });
    
    msg!(
        "Balance transferred: from={}, to={}, token={}, amount={}",
        from_user,
        to_user,
        from_balance.token_mint,
        amount
    );
    
    Ok(())
}
