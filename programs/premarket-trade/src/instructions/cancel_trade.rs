/*!
 * # CANCEL TRADE INSTRUCTION
 * 
 * ## 🎯 Business Purpose
 * Allows buyer to cancel trade after grace period expires when seller fails to deliver.
 * Buyer receives their collateral + penalty from seller's collateral.
 * 
 * ## 🔄 Cancellation Flow
 * 1. **Validation**: Check buyer authority, grace period expired, trade not settled
 * 2. **Penalty Calculation**: Calculate penalty from seller collateral
 * 3. **Buyer Payout**: Transfer buyer collateral + penalty to buyer wallet
 * 4. **Seller Payout**: Transfer remaining seller collateral to seller wallet
 * 5. **State Update**: Mark trade as settled (cancelled)
 * 6. **Event Emission**: Emit TradeCancelled event
 * 
 * ## 🛡️ Security Requirements
 * - Only buyer can cancel their own trades
 * - Cancellation only allowed after grace period expires
 * - Trade must not be already settled
 * - All collateral distributions via CPI to vault program
 * 
 * ## 💰 Economic Model
 * - Buyer gets: `buyer_collateral + penalty_amount`
 * - Seller gets: `seller_collateral - penalty_amount` (if positive)
 * - Penalty = `trade_value * late_penalty_bps / 10000`
 * - All transfers go directly to external wallets (exact EVM logic)
 * 
 * ## 🔗 Cross-Program Integration
 * - Uses CPI to vault program for collateral distribution
 * - No credit_balance() - direct transfers only (matches EVM)
 * - Follows exact EVM cancelAfterGracePeriod() logic
 * 
 * ## 📊 Event Data
 * Emits `TradeCancelled` with penalty details for off-chain indexing
 */

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::*;
use crate::error::TradingError;
use crate::events::TradeCancelled;

// Import vault program for CPI calls
use escrow_vault::cpi;
use escrow_vault::program::EscrowVault;

#[derive(Accounts)]
pub struct CancelTrade<'info> {
    /// TradeRecord account to cancel (User-controlled keypair)
    #[account(
        mut,
        constraint = trade_record.to_account_info().owner == &crate::ID @ TradingError::InvalidAccountOwner,
        constraint = !trade_record.settled @ TradingError::TradeAlreadySettled,
        constraint = trade_record.buyer == buyer.key() @ TradingError::OnlyBuyerCanCancel,
    )]
    pub trade_record: Account<'info, TradeRecord>,
    
    /// TokenMarket for the trading pair (for grace period validation)
    #[account(
        constraint = token_market.to_account_info().owner == &crate::ID @ TradingError::InvalidAccountOwner,
        constraint = token_market.token_id == trade_record.token_id @ TradingError::TokenMintMismatch,
    )]
    pub token_market: Account<'info, TokenMarket>,
    
    /// Trade configuration PDA for economic parameters
    #[account(
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = !config.paused @ TradingError::TradingPaused,
    )]
    pub config: Account<'info, TradeConfig>,
    
    /// Buyer signer (must match trade_record.buyer)
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    // Vault program accounts for CPI calls
    /// Vault program for cross-program calls
    #[account(
        constraint = vault_program.key() == config.vault_program @ TradingError::VaultProgramMismatch,
    )]
    pub vault_program: Program<'info, EscrowVault>,
    
    /// Vault config PDA
    #[account(
        seeds = [escrow_vault::state::VaultConfig::VAULT_CONFIG_SEED],
        bump,
        seeds::program = vault_program.key(),
    )]
    pub vault_config: Account<'info, escrow_vault::state::VaultConfig>,
    
    /// Buyer balance PDA for collateral release
    /// CHECK: Buyer balance account validated via CPI to vault program
    pub buyer_balance: AccountInfo<'info>,
    
    /// Seller balance PDA for collateral release
    /// CHECK: Seller balance account validated via CPI to vault program
    pub seller_balance: AccountInfo<'info>,
    
    /// Vault authority PDA
    #[account(
        seeds = [
            escrow_vault::state::VaultAuthority::VAULT_AUTHORITY_SEED,
            trade_record.collateral_mint.as_ref()
        ],
        bump,
        seeds::program = vault_program.key(),
    )]
    pub vault_authority: Account<'info, escrow_vault::state::VaultAuthority>,
    
    /// Vault ATA for collateral token
    #[account(
        constraint = vault_ata.mint == trade_record.collateral_mint @ TradingError::TokenMintMismatch,
    )]
    pub vault_ata: Account<'info, TokenAccount>,
    
    /// Buyer ATA for collateral return
    #[account(
        mut,
        constraint = buyer_collateral_ata.owner == buyer.key() @ TradingError::InvalidAccountOwner,
        constraint = buyer_collateral_ata.mint == trade_record.collateral_mint @ TradingError::TokenMintMismatch,
    )]
    pub buyer_collateral_ata: Account<'info, TokenAccount>,
    
    /// Seller ATA for remaining collateral return
    #[account(
        mut,
        constraint = seller_collateral_ata.owner == trade_record.seller @ TradingError::InvalidAccountOwner,
        constraint = seller_collateral_ata.mint == trade_record.collateral_mint @ TradingError::TokenMintMismatch,
    )]
    pub seller_collateral_ata: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelTrade>) -> Result<()> {
    let trade_record = &ctx.accounts.trade_record;
    let token_market = &ctx.accounts.token_market;
    let config = &ctx.accounts.config;
    
    // Get current time for validation
    let current_time = Clock::get()?.unix_timestamp;
    
    // Validate grace period has expired (cancellation only allowed after grace period)
    let grace_period_end = trade_record.match_time + (token_market.settle_time_limit as i64);
    require!(
        current_time > grace_period_end,
        TradingError::GracePeriodActive
    );
    
    // Calculate penalty distribution
    let (penalty_amount, buyer_total, seller_remaining) = calculate_cancellation_amounts(
        trade_record.filled_amount,
        trade_record.price,
        trade_record.buyer_collateral,
        trade_record.seller_collateral,
        &config.economic_config,
    )?;
    
    // Step 1: Transfer buyer collateral + penalty to buyer wallet
    if buyer_total > 0 {
        msg!(
            "Transferring {} (collateral + penalty) to buyer via CPI",
            buyer_total
        );
        
        transfer_collateral_to_buyer_cpi(&ctx, buyer_total)?;
    }
    
    // Step 2: Transfer remaining seller collateral to seller wallet (if any)
    if seller_remaining > 0 {
        msg!(
            "Transferring {} remaining collateral to seller via CPI",
            seller_remaining
        );
        
        transfer_collateral_to_seller_cpi(&ctx, seller_remaining)?;
    }
    
    // Step 3: Update trade record state
    let trade_record = &mut ctx.accounts.trade_record;
    trade_record.settled = true;
    
    // Step 4: Emit TradeCancelled event
    emit!(TradeCancelled {
        trade_id: trade_record.trade_id,
        token_id: trade_record.token_id,        // EVM compatible naming
        buyer: trade_record.buyer,
        seller: trade_record.seller,
        penalty_amount,
        cancellation_time: current_time,
    });
    
    msg!(
        "Trade cancelled successfully: trade_id: {} - buyer: {} - seller: {} - penalty: {}",
        trade_record.trade_id,
        trade_record.buyer,
        trade_record.seller,
        penalty_amount
    );
    
    Ok(())
}

/// Calculate cancellation amounts: penalty, buyer total, seller remaining
fn calculate_cancellation_amounts(
    filled_amount: u64,
    price: u64,
    buyer_collateral: u64,
    seller_collateral: u64,
    economic_config: &shared::EconomicConfig,
) -> Result<(u64, u64, u64)> {
    // Calculate trade value
    let trade_value = filled_amount
        .checked_mul(price)
        .ok_or(TradingError::MathOverflow)?
        .checked_div(shared::PRICE_SCALE)
        .ok_or(TradingError::MathOverflow)?;
    
    // Calculate penalty amount (from seller to buyer)
    let penalty_amount = trade_value
        .checked_mul(economic_config.late_penalty_bps as u64)
        .ok_or(TradingError::MathOverflow)?
        .checked_div(10000)
        .ok_or(TradingError::MathOverflow)?;
    
    // Ensure penalty doesn't exceed seller collateral
    let actual_penalty = penalty_amount.min(seller_collateral);
    
    // Buyer gets: their collateral + penalty
    let buyer_total = buyer_collateral
        .checked_add(actual_penalty)
        .ok_or(TradingError::MathOverflow)?;
    
    // Seller gets: their collateral - penalty (if positive)
    let seller_remaining = seller_collateral.saturating_sub(actual_penalty);
    
    Ok((actual_penalty, buyer_total, seller_remaining))
}

/// Transfer buyer collateral + penalty via CPI to vault program
fn transfer_collateral_to_buyer_cpi(
    ctx: &Context<CancelTrade>,
    amount: u64,
) -> Result<()> {
    msg!("Transferring buyer collateral + penalty via CPI: amount: {}", amount);
    
    // All accounts from same Context - unified lifetime
    let cpi_accounts = cpi::accounts::TransferOut {
        config: ctx.accounts.vault_config.to_account_info(),
        user_balance: ctx.accounts.buyer_balance.to_account_info(),
        vault_authority: ctx.accounts.vault_authority.to_account_info(),
        vault_ata: ctx.accounts.vault_ata.to_account_info(),
        recipient_ata: ctx.accounts.buyer_collateral_ata.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.vault_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Execute CPI call to transfer tokens from vault to buyer wallet
    cpi::transfer_out(cpi_ctx, ctx.accounts.buyer.key(), amount)?;
    
    msg!("Buyer collateral + penalty transferred successfully via CPI: {}", amount);
    Ok(())
}

/// Transfer remaining seller collateral via CPI to vault program
fn transfer_collateral_to_seller_cpi(
    ctx: &Context<CancelTrade>,
    amount: u64,
) -> Result<()> {
    msg!("Transferring remaining seller collateral via CPI: amount: {}", amount);
    
    // All accounts from same Context - unified lifetime
    let cpi_accounts = cpi::accounts::TransferOut {
        config: ctx.accounts.vault_config.to_account_info(),
        user_balance: ctx.accounts.seller_balance.to_account_info(),
        vault_authority: ctx.accounts.vault_authority.to_account_info(),
        vault_ata: ctx.accounts.vault_ata.to_account_info(),
        recipient_ata: ctx.accounts.seller_collateral_ata.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.vault_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Execute CPI call to transfer tokens from vault to seller wallet
    cpi::transfer_out(cpi_ctx, ctx.accounts.trade_record.seller, amount)?;
    
    msg!("Remaining seller collateral transferred successfully via CPI: {}", amount);
    Ok(())
} 