use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::VaultError;
use crate::events::*;
use crate::utils::get_cpi_caller_program_id;

/// CPI ONLY: Add user balance (exact EVM creditBalance mapping)
/// Used by trading program to "unlock" collateral
/// 
/// 🛡️ INSTRUCTION SYSVAR PATTERN IMPLEMENTATION
#[derive(Accounts)]
pub struct CreditBalance<'info> {
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
    
    /// 🛡️ INSTRUCTION SYSVAR - For precise caller detection
    /// CHECK: Validated by constraint to ensure it's the instruction sysvar
    #[account(
        constraint = instruction_sysvar.key() == solana_program::sysvar::instructions::ID @ VaultError::InvalidInstructionSysvar
    )]
    pub instruction_sysvar: AccountInfo<'info>,
}

/// 🛡️ INSTRUCTION SYSVAR PATTERN - Most accurate CPI caller detection
pub fn handler(ctx: Context<CreditBalance>, amount: u64) -> Result<()> {
    // 🔍 STEP 1: Get precise caller program ID from instruction sysvar
    let caller_program_id = get_cpi_caller_program_id(&ctx.accounts.instruction_sysvar)?;
    
    // 🔒 STEP 2: Validate CPI caller authorization using precise detection
    ctx.accounts.config.validate_cpi_caller_precise(
        &caller_program_id, 
        "CreditBalance"
    )?;
    
    // 🔒 STEP 3: Validate business logic parameters
    require!(amount > 0, VaultError::ZeroAmount);
    
    // ✅ STEP 4: Execute business logic
    let user_balance = &mut ctx.accounts.user_balance;
    user_balance.credit_balance(amount)?;
    
    // 📡 STEP 5: Emit event with precise caller info
    emit!(BalanceCredited {
        user: user_balance.user,
        token_mint: user_balance.token_mint,
        amount,
        caller_program: caller_program_id,
    });
    
    // 📝 STEP 6: Structured logging with precise caller
    msg!(
        "✅ Balance credited successfully: user={}, token={}, amount={}, new_balance={}, precise_caller={}",
        user_balance.user,
        user_balance.token_mint,
        amount,
        user_balance.balance,
        caller_program_id
    );
    
    Ok(())
}
