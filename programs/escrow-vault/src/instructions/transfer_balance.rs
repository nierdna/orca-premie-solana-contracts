use crate::error::VaultError;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;
use crate::utils::get_cpi_caller_program_id;

/// CPI ONLY: Transfer between user balances (exact EVM transferBalance mapping)
/// Used by trading program for internal transfers
///
/// 🛡️ INSTRUCTION SYSVAR PATTERN IMPLEMENTATION
#[derive(Accounts)]
#[instruction(from_user: Pubkey, to_user: Pubkey, amount: u64)]
pub struct TransferBalance<'info> {
    #[account(
        seeds = [VaultConfig::VAULT_CONFIG_SEED],
        bump = config.bump,
        // ✅ ONLY basic validations in constraints - no CPI authorization here
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
        constraint = from_balance.token_mint == to_balance.token_mint @ VaultError::TokenMintMismatch,
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

    /// 🛡️ INSTRUCTION SYSVAR - For precise caller detection
    /// CHECK: Validated by constraint to ensure it's the instruction sysvar
    #[account(
        constraint = instruction_sysvar.key() == solana_program::sysvar::instructions::ID @ VaultError::InvalidInstructionSysvar
    )]
    pub instruction_sysvar: AccountInfo<'info>,
}

/// 🛡️ INSTRUCTION SYSVAR PATTERN - Most accurate CPI caller detection
pub fn handler(
    ctx: Context<TransferBalance>,
    from_user: Pubkey,
    to_user: Pubkey,
    amount: u64,
) -> Result<()> {
    // 🔍 STEP 1: Get precise caller program ID from instruction sysvar
    let caller_program_id = get_cpi_caller_program_id(&ctx.accounts.instruction_sysvar)?;

    // 🔒 STEP 2: Validate CPI caller authorization using precise detection
    ctx.accounts
        .config
        .validate_cpi_caller_precise(&caller_program_id, "TransferBalance")?;

    // 🔒 STEP 3: Validate business logic parameters
    require!(amount > 0, VaultError::ZeroAmount);
    require!(from_user != to_user, VaultError::InvalidRecipient);

    // 🔒 STEP 4: Additional security validations
    let from_balance = &mut ctx.accounts.from_balance;
    let to_balance = &mut ctx.accounts.to_balance;

    require!(
        from_balance.balance >= amount,
        VaultError::InsufficientBalance
    );

    require!(
        from_balance.token_mint == to_balance.token_mint,
        VaultError::TokenMintMismatch
    );

    // ✅ STEP 5: Execute balance transfer
    from_balance.slash_balance(amount)?;
    to_balance.credit_balance(amount)?;

    // 📡 STEP 6: Emit event with precise caller info
    emit!(BalanceTransferred {
        from_user,
        to_user,
        token_mint: from_balance.token_mint,
        amount,
        caller_program: caller_program_id,
    });

    // 📝 STEP 7: Structured logging with precise caller
    msg!(
        "✅ Balance transferred successfully: from_user={}, to_user={}, token={}, amount={}, from_remaining={}, to_new={}, precise_caller={}",
        from_user,
        to_user,
        from_balance.token_mint,
        amount,
        from_balance.balance,
        to_balance.balance,
        caller_program_id
    );

    Ok(())
}


