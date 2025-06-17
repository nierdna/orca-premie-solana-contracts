use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::error::VaultError;
use crate::events::*;
use crate::utils::get_cpi_caller_program_id;

/// CPI ONLY: Transfer tokens out of vault (exact EVM transferOut mapping)
/// Used by trading program for settlement and cancellation
/// 
/// 🛡️ INSTRUCTION SYSVAR PATTERN IMPLEMENTATION
#[derive(Accounts)]
#[instruction(recipient: Pubkey, amount: u64)]
pub struct TransferOut<'info> {
    #[account(
        seeds = [VaultConfig::VAULT_CONFIG_SEED],
        bump = config.bump,
        // ✅ ONLY basic validations in constraints - no CPI authorization here
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
    )]
    pub vault_authority: Box<Account<'info, VaultAuthority>>,
    
    #[account(
        mut,
        constraint = vault_token_account.mint == user_balance.token_mint @ VaultError::TokenMintMismatch,
        constraint = vault_token_account.owner == vault_authority.key() @ VaultError::InvalidVaultAuthority,
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    
    /// CHECK: Recipient token account - validated in handler
    #[account(mut)]
    pub recipient_token_account: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    
    /// 🛡️ INSTRUCTION SYSVAR - For precise caller detection
    /// CHECK: Validated by constraint to ensure it's the instruction sysvar
    #[account(
        constraint = instruction_sysvar.key() == solana_program::sysvar::instructions::ID @ VaultError::InvalidInstructionSysvar
    )]
    pub instruction_sysvar: AccountInfo<'info>,
}

/// 🛡️ INSTRUCTION SYSVAR PATTERN - Most accurate CPI caller detection
pub fn handler(ctx: Context<TransferOut>, recipient: Pubkey, amount: u64) -> Result<()> {
    // 🔍 STEP 1: Get precise caller program ID from instruction sysvar
    let caller_program_id = get_cpi_caller_program_id(&ctx.accounts.instruction_sysvar)?;
    
    // 🔒 STEP 2: Validate CPI caller authorization using precise detection
    ctx.accounts.config.validate_cpi_caller_precise(
        &caller_program_id, 
        "TransferOut"
    )?;
    
    // 🔒 STEP 3: Validate business logic parameters
    require!(amount > 0, VaultError::ZeroAmount);
    
    // ✅ STEP 4: Execute token transfer
    let user_balance = &mut ctx.accounts.user_balance;
    
    // Create PDA signer seeds
    let seeds = &[
        VaultAuthority::VAULT_AUTHORITY_SEED,
        user_balance.token_mint.as_ref(),
        &[ctx.accounts.vault_authority.bump],
    ];
    let signer = &[&seeds[..]];
    
    // Perform CPI to token program
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.vault_authority.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    token::transfer(cpi_ctx, amount)?;
    
    // Update user balance
    user_balance.balance = user_balance.balance
        .checked_sub(amount)
        .ok_or(VaultError::ArithmeticOverflow)?;
    
    // 📡 STEP 5: Emit event with precise caller info
    emit!(TokensTransferredOut {
        user: user_balance.user,
        token_mint: user_balance.token_mint,
        recipient,
        amount,
        caller_program: caller_program_id,
    });
    
    // 📝 STEP 6: Structured logging with precise caller
    msg!(
        "✅ Tokens transferred out successfully: user={}, token={}, recipient={}, amount={}, remaining_balance={}, precise_caller={}",
        user_balance.user,
        user_balance.token_mint,
        recipient,
        amount,
        user_balance.balance,
        caller_program_id
    );
    
    Ok(())
}

 