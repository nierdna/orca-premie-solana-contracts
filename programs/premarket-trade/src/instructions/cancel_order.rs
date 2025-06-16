/*!
 * # CANCEL ORDER INSTRUCTION
 * 
 * ## 🎯 Business Purpose
 * Allows trader to cancel their individual order before it gets matched.
 * Returns locked collateral back to trader's vault balance (not external wallet).
 * 
 * ## 🔄 Cancellation Flow
 * 1. **Signature Verification**: Verify order signature and trader authority
 * 2. **Order Validation**: Check order not expired, not already cancelled/filled
 * 3. **OrderStatus Update**: Mark order as cancelled in OrderStatus PDA
 * 4. **Collateral Unlock**: Credit collateral back to trader's vault balance
 * 5. **Event Emission**: Emit OrderCancelled event
 * 
 * ## 🛡️ Security Requirements
 * - Valid order signature required
 * - Only order creator can cancel their orders
 * - Order must not be expired or already processed
 * - OrderStatus tracking prevents double-cancellation
 * 
 * ## 💰 Economic Model
 * - Trader gets collateral back to vault balance (credit_balance)
 * - No penalties for order cancellation (before matching)
 * - Different from trade cancellation (which uses transfer_out)
 * 
 * ## 🔗 Cross-Program Integration
 * - Uses CPI to vault program for collateral unlocking
 * - Uses credit_balance() NOT transfer_out() (vault balance, not external)
 * - Follows exact EVM order cancellation logic
 * 
 * ## 📊 Event Data
 * Emits `OrderCancelled` with order details for off-chain indexing
 */

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::*;
use crate::error::TradingError;
use crate::events::OrderCancelled;
use crate::utils::{verify_order_signature, calculate_order_hash};
use crate::common::PreOrder;

// Import vault program for CPI calls
use escrow_vault::cpi;
use escrow_vault::program::EscrowVault;

#[derive(Accounts)]
#[instruction(order: PreOrder, signature: [u8; 64])]
pub struct CancelOrder<'info> {
    /// OrderStatus PDA to track cancellation
    #[account(
        init_if_needed,
        payer = trader,
        space = 8 + OrderStatus::INIT_SPACE,
        seeds = [
            OrderStatus::ORDER_STATUS_SEED,
            &calculate_order_hash(&order)
        ],
        bump,
    )]
    pub order_status: Box<Account<'info, OrderStatus>>,
    
    /// TokenMarket for the order (validation)
    #[account(
        constraint = token_market.to_account_info().owner == &crate::ID @ TradingError::InvalidAccountOwner,
        constraint = token_market.token_id == order.token_id @ TradingError::TokenMintMismatch,
    )]
    pub token_market: Box<Account<'info, TokenMarket>>,
    
    /// Trade configuration PDA for economic parameters
    #[account(
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = !config.paused @ TradingError::TradingPaused,
    )]
    pub config: Box<Account<'info, TradeConfig>>,
    
    /// Trader signer (must match order.trader)
    #[account(
        mut,
        constraint = trader.key() == order.trader @ TradingError::InvalidOrderOwner,
    )]
    pub trader: Signer<'info>,
    
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
    pub vault_config: Box<Account<'info, escrow_vault::state::VaultConfig>>,
    
    /// Trader balance PDA for collateral unlock
    /// CHECK: Trader balance account validated via CPI to vault program
    pub trader_balance: AccountInfo<'info>,
    
    /// Vault authority PDA
    #[account(
        seeds = [
            escrow_vault::state::VaultAuthority::VAULT_AUTHORITY_SEED,
            order.collateral_token.as_ref()
        ],
        bump,
        seeds::program = vault_program.key(),
    )]
    pub vault_authority: Box<Account<'info, escrow_vault::state::VaultAuthority>>,
    
    /// Trader ATA for validation (not used for transfer)
    #[account(
        constraint = trader_collateral_ata.owner == trader.key() @ TradingError::InvalidAccountOwner,
        constraint = trader_collateral_ata.mint == order.collateral_token @ TradingError::TokenMintMismatch,
    )]
    pub trader_collateral_ata: Box<Account<'info, TokenAccount>>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CancelOrder>,
    order: PreOrder,
    signature: [u8; 64],
) -> Result<()> {
    let config = &ctx.accounts.config;
    let current_time = Clock::get()?.unix_timestamp;
    
    // Step 1: Verify order signature
    verify_order_signature(&order, &signature, &order.trader)?;
    
    // Step 2: Validate order timing
    require!(
        current_time <= order.deadline,
        TradingError::OrderExpired
    );
    
    // Step 3: Validate order status
    let order_hash = calculate_order_hash(&order);
    let order_status_key = ctx.accounts.order_status.key();
    let order_status = &mut ctx.accounts.order_status;
    
    // Initialize OrderStatus if new
    if order_status.user == Pubkey::default() {
        let order_type = if order.is_buy {
            crate::state::OrderType::Buy
        } else {
            crate::state::OrderType::Sell
        };
        
        let collateral_amount = calculate_order_collateral(
            order.amount,
            order.price,
            order.is_buy,
            &config.economic_config,
        )?;
        
        order_status.initialize(
            order_status_key,                 // order_id (PDA address)
            order.token_id,                   // token_market
            order.trader,                     // user
            order_type,                       // order_type
            order.amount,                     // quantity
            collateral_amount,                // collateral_locked
            order.deadline,                   // expires_at
            ctx.bumps.order_status,          // bump
        );
    }
    
    // Check order not already cancelled or fully filled
    require!(
        order_status.status != crate::state::OrderStatusType::Cancelled,
        TradingError::OrderAlreadyCancelled
    );
    require!(
        order_status.filled_quantity < order_status.original_quantity,
        TradingError::OrderAlreadyFilled
    );
    
    // Step 4: Calculate collateral to unlock
    let remaining_amount = order_status.original_quantity - order_status.filled_quantity;
    let collateral_to_unlock = calculate_order_collateral(
        remaining_amount,
        order.price,
        order.is_buy,
        &config.economic_config,
    )?;
    
    // Step 5: Update order status first
    order_status.cancel_order()?;
    
    // Step 6: Unlock collateral via CPI to vault (credit_balance, not transfer_out)
    if collateral_to_unlock > 0 {
        msg!(
            "Unlocking {} collateral to trader vault balance via CPI",
            collateral_to_unlock
        );
        
        unlock_order_collateral_cpi(&ctx, collateral_to_unlock)?;
    }
    
    // Step 7: Emit OrderCancelled event
    emit!(OrderCancelled {
        order_hash,
        trader: order.trader,
        token_id: order.token_id,
        collateral_released: collateral_to_unlock,
        cancellation_time: current_time,
    });
    
    msg!(
        "Order cancelled successfully: trader: {} - token_id: {} - collateral_released: {}",
        order.trader,
        order.token_id,
        collateral_to_unlock
    );
    
    Ok(())
}

/// Calculate collateral required for order
fn calculate_order_collateral(
    amount: u64,
    price: u64,
    is_buy: bool,
    economic_config: &crate::common::EconomicConfig,
) -> Result<u64> {
    // Calculate trade value
    let trade_value = amount
        .checked_mul(price)
        .ok_or(TradingError::MathOverflow)?
        .checked_div(crate::common::PRICE_SCALE)
        .ok_or(TradingError::MathOverflow)?;
    
    // Get appropriate collateral ratio
    let collateral_ratio = if is_buy {
        economic_config.buyer_collateral_ratio
    } else {
        economic_config.seller_collateral_ratio
    };
    
    // Calculate collateral amount
    let collateral = trade_value
        .checked_mul(collateral_ratio as u64)
        .ok_or(TradingError::MathOverflow)?
        .checked_div(10000)
        .ok_or(TradingError::MathOverflow)?;
    
    Ok(collateral)
}

/// Unlock order collateral via CPI to vault program
/// Uses credit_balance() to return collateral to vault balance (NOT external wallet)
fn unlock_order_collateral_cpi(
    ctx: &Context<CancelOrder>,
    amount: u64,
) -> Result<()> {
    msg!("Unlocking order collateral via CPI: amount: {}", amount);
    
    // All accounts from same Context - unified lifetime
    let cpi_accounts = cpi::accounts::CreditBalance {
        config: ctx.accounts.vault_config.to_account_info(),
        user_balance: ctx.accounts.trader_balance.to_account_info(),
        vault_authority: ctx.accounts.vault_authority.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.vault_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Execute CPI call to credit balance (unlock collateral to vault balance)
    cpi::credit_balance(cpi_ctx, amount)?;
    
    msg!("Order collateral unlocked successfully via CPI: {}", amount);
    Ok(())
} 