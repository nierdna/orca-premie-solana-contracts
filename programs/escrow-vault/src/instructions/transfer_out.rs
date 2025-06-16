use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::error::VaultError;
use crate::events::*;

/// CPI ONLY: Transfer tokens out of vault (exact EVM transferOut mapping)
/// Used by trading program for settlement and cancellation
#[derive(Accounts)]
#[instruction(recipient: Pubkey, amount: u64)]
pub struct TransferOut<'info> {
    #[account(
        seeds = [VaultConfig::VAULT_CONFIG_SEED],
        bump = config.bump,
        constraint = config.is_authorized_trader(&crate::id()) @ VaultError::UnauthorizedTrader,
        constraint = !config.paused @ VaultError::VaultPaused,
    )]
    pub config: Box<Account<'info, VaultConfig>>,
    
    #[account(
        mut,
        seeds = [
            UserBalance::USER_BALANCE_SEED,
            user_balance.user.as_ref(),
            user_balance.token_mint.as_ref()
        ],
        bump = user_balance.bump,
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
        constraint = recipient_ata.mint == user_balance.token_mint @ VaultError::InvalidTokenMint,
        constraint = recipient_ata.owner == recipient @ VaultError::InvalidAccountOwner,
    )]
    pub recipient_ata: Box<Account<'info, TokenAccount>>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<TransferOut>,
    recipient: Pubkey,
    amount: u64,
) -> Result<()> {
    // Validate amount
    require!(amount > 0, VaultError::ZeroAmount);
    
    // Validate CPI caller is authorized trading program
    let caller_program = ctx.program_id;
    require!(
        ctx.accounts.config.is_authorized_trader(caller_program),
        VaultError::UnauthorizedCPICaller
    );
    
    let user_balance = &mut ctx.accounts.user_balance;
    let vault_authority = &mut ctx.accounts.vault_authority;
    
    // Subtract from user balance (already locked by slash_balance)
    user_balance.slash_balance(amount)?;
    
    // Subtract from total deposits
    vault_authority.subtract_deposit(amount)?;
    
    // Transfer tokens from vault to recipient
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
            to: ctx.accounts.recipient_ata.to_account_info(),
            authority: vault_authority.to_account_info(),
        },
        signer_seeds_slice,
    );
    
    token::transfer(transfer_cpi, amount)?;
    
    // Emit event
    emit!(TokensTransferredOut {
        user: user_balance.user,
        recipient,
        token_mint: user_balance.token_mint,
        amount,
        caller_program: *caller_program,
    });
    
    msg!(
        "Tokens transferred out: from_user={}, recipient={}, token={}, amount={}",
        user_balance.user,
        recipient,
        user_balance.token_mint,
        amount
    );
    
    Ok(())
} 