use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
// AssociatedToken import removed for size optimization
use crate::state::*;
use crate::error::VaultError;
use crate::events::*;

/// User deposits collateral tokens (ANY TOKEN SUPPORTED)
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct DepositCollateral<'info> {
    #[account(
        seeds = [VaultConfig::VAULT_CONFIG_SEED],
        bump = config.bump,
        constraint = !config.paused @ VaultError::VaultPaused,
    )]
    pub config: Box<Account<'info, VaultConfig>>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserBalance::INIT_SPACE,
        seeds = [
            UserBalance::USER_BALANCE_SEED,
            user.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
    )]
    pub user_balance: Box<Account<'info, UserBalance>>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + VaultAuthority::INIT_SPACE,
        seeds = [
            VaultAuthority::VAULT_AUTHORITY_SEED,
            token_mint.key().as_ref()
        ],
        bump,
    )]
    pub vault_authority: Box<Account<'info, VaultAuthority>>,
    
    #[account(
        mut,
        constraint = vault_ata.mint == token_mint.key() @ VaultError::InvalidTokenMint,
        constraint = vault_ata.owner == vault_authority.key() @ VaultError::InvalidAccountOwner,
    )]
    pub vault_ata: Box<Account<'info, TokenAccount>>,
    
    #[account(
        mut,
        constraint = user_ata.mint == token_mint.key() @ VaultError::InvalidTokenMint,
        constraint = user_ata.owner == user.key() @ VaultError::InvalidAccountOwner,
        constraint = user_ata.amount >= amount @ VaultError::InsufficientBalance,
    )]
    pub user_ata: Box<Account<'info, TokenAccount>>,
    
    /// Token mint being deposited (ANY TOKEN SUPPORTED)
    /// CHECK: Token mint validation is done through user_ata.mint constraint
    #[account(address = user_ata.mint)]
    pub token_mint: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
    // Validate amount
    require!(amount > 0, VaultError::ZeroAmount);
    
    let user_balance = &mut ctx.accounts.user_balance;
    let vault_authority = &mut ctx.accounts.vault_authority;
    let token_mint = ctx.accounts.token_mint.key();
    
    // Initialize user balance if new
    if user_balance.user == Pubkey::default() {
        user_balance.initialize(
            ctx.accounts.user.key(),
            token_mint,
            ctx.bumps.user_balance,
        );
    }
    
    // Initialize vault authority if new
    if vault_authority.token_mint == Pubkey::default() {
        vault_authority.initialize(
            token_mint,
            ctx.accounts.vault_ata.key(),
            ctx.bumps.vault_authority,
        );
    }
    
    // Transfer tokens from user to vault
    let transfer_cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_ata.to_account_info(),
            to: ctx.accounts.vault_ata.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    
    token::transfer(transfer_cpi, amount)?;
    
    // Add to user balance (exact EVM logic)
    user_balance.credit_balance(amount)?;
    
    // Add to total deposits (exact EVM logic)
    vault_authority.add_deposit(amount)?;
    
    // Emit deposit event
    emit!(CollateralDeposited {
        user: ctx.accounts.user.key(),
        token_mint,
        amount,
        new_balance: user_balance.balance,
    });
    
    msg!(
        "Collateral deposited: user={}, token={}, amount={}, new_balance={}",
        ctx.accounts.user.key(),
        token_mint,
        amount,
        user_balance.balance
    );
    
    Ok(())
} 