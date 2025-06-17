use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::VaultError;
use crate::events::*;
use crate::utils::get_cpi_caller_program_id;

/// CPI ONLY: Subtract user balance (exact EVM slashBalance mapping)
/// Used by trading program to "lock" collateral
/// 
/// 🛡️ INSTRUCTION SYSVAR PATTERN IMPLEMENTATION
/// - Uses instruction sysvar to detect exact caller program ID
/// - Most accurate method for CPI caller validation
/// - Used by high-security protocols like Jupiter, Orca
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct SlashBalance<'info> {
    #[account(
        seeds = [VaultConfig::VAULT_CONFIG_SEED],
        bump = config.bump,
        // ✅ ONLY basic validations in constraints
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
        // ✅ KEEP basic business logic constraints
        constraint = user_balance.balance >= amount @ VaultError::InsufficientBalance,
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
    
    /// 🛡️ INSTRUCTION SYSVAR - For precise caller detection
    /// CHECK: Validated by constraint to ensure it's the instruction sysvar
    #[account(
        constraint = instruction_sysvar.key() == solana_program::sysvar::instructions::ID @ VaultError::InvalidInstructionSysvar
    )]
    pub instruction_sysvar: AccountInfo<'info>,
}

/// 🛡️ INSTRUCTION SYSVAR PATTERN - Most accurate CPI caller detection
pub fn handler(ctx: Context<SlashBalance>, amount: u64) -> Result<()> {
    // 🔍 STEP 1: Get precise caller program ID from instruction sysvar
    let caller_program_id = get_cpi_caller_program_id(&ctx.accounts.instruction_sysvar)?;
    
    // 🔒 STEP 2: Validate CPI caller authorization using precise detection
    ctx.accounts.config.validate_cpi_caller_precise(
        &caller_program_id, 
        "SlashBalance"
    )?;
    
    // 🔒 STEP 3: Validate business logic parameters
    require!(amount > 0, VaultError::ZeroAmount);
    
    // 🔒 STEP 4: Additional security validations
    let user_balance = &mut ctx.accounts.user_balance;
    require!(
        user_balance.balance >= amount,
        VaultError::InsufficientBalance
    );
    
    // ✅ STEP 5: Execute business logic
    user_balance.slash_balance(amount)?;
    
    // 📡 STEP 6: Emit event with precise caller info
    emit!(BalanceSlashed {
        user: user_balance.user,
        token_mint: user_balance.token_mint,
        amount,
        caller_program: caller_program_id,
    });
    
    // 📝 STEP 7: Structured logging with precise caller
    msg!(
        "✅ Balance slashed successfully: user={}, token={}, amount={}, remaining_balance={}, precise_caller={}",
        user_balance.user,
        user_balance.token_mint,
        amount,
        user_balance.balance,
        caller_program_id
    );
    
    Ok(())
}