use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::error::VaultError;
use crate::events::*;

/// User withdraws available balance (ANY TOKEN SUPPORTED)
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct WithdrawCollateral<'info> {
    #[account(
        seeds = [VaultConfig::VAULT_CONFIG_SEED],
        bump = config.bump,
        constraint = !config.paused @ VaultError::VaultPaused,
    )]
    pub config: Box<Account<'info, VaultConfig>>,
    
    #[account(
        mut,
        seeds = [
            UserBalance::USER_BALANCE_SEED,
            user.key().as_ref(),
            user_balance.token_mint.as_ref()
        ],
        bump = user_balance.bump,
        constraint = user_balance.user == user.key() @ VaultError::InvalidAccountOwner,
        constraint = user_balance.balance >= amount @ VaultError::InsufficientBalance,
    )]
    pub user_balance: Box<Account<'info, UserBalance>>,
    
    #[account(
        mut,
        seeds = [
            VaultAuthority::VAULT_AUTHORITY_SEED,
            user_balance.token_mint.as_ref()
        ],
        bump = vault_authority.bump,
        constraint = vault_authority.token_mint == user_balance.token_mint @ VaultError::InvalidTokenMint,
    )]
    pub vault_authority: Box<Account<'info, VaultAuthority>>,
    
    #[account(
        mut,
        constraint = vault_ata.key() == vault_authority.vault_ata @ VaultError::InvalidTokenMint,
        constraint = vault_ata.mint == user_balance.token_mint @ VaultError::InvalidTokenMint,
    )]
    pub vault_ata: Box<Account<'info, TokenAccount>>,
    
    #[account(
        mut,
        constraint = user_ata.mint == user_balance.token_mint @ VaultError::InvalidTokenMint,
        constraint = user_ata.owner == user.key() @ VaultError::InvalidAccountOwner,
    )]
    pub user_ata: Box<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<WithdrawCollateral>, amount: u64) -> Result<()> {
    // Validate amount
    require!(amount > 0, VaultError::ZeroAmount);
    
    let user_balance = &mut ctx.accounts.user_balance;
    let vault_authority = &mut ctx.accounts.vault_authority;
    
    // Subtract from user balance (exact EVM logic)
    user_balance.slash_balance(amount)?;
    
    // Subtract from total deposits (exact EVM logic)
    vault_authority.subtract_deposit(amount)?;
    
    // Transfer tokens from vault to user
    let token_mint = vault_authority.token_mint;
    let vault_authority_bump = vault_authority.bump;
    let bump_seed = [vault_authority_bump];
    
    let signer_seeds: &[&[u8]] = &[
        VaultAuthority::VAULT_AUTHORITY_SEED,
        token_mint.as_ref(),
        &bump_seed,
    ];
    let signer_seeds_slice = &[signer_seeds];
    
    let transfer_cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_ata.to_account_info(),
            to: ctx.accounts.user_ata.to_account_info(),
            authority: vault_authority.to_account_info(),
        },
        signer_seeds_slice,
    );
    
    token::transfer(transfer_cpi, amount)?;
    
    // Emit withdrawal event
    emit!(CollateralWithdrawn {
        user: ctx.accounts.user.key(),
        token_mint: user_balance.token_mint,
        amount,
        remaining_balance: user_balance.balance,
    });
    
    msg!(
        "Collateral withdrawn: user={}, token={}, amount={}, remaining_balance={}",
        ctx.accounts.user.key(),
        user_balance.token_mint,
        amount,
        user_balance.balance
    );
    
    Ok(())
}
