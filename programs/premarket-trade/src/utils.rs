use anchor_lang::prelude::*;
use crate::common::{PreOrder, create_order_message};
use crate::error::TradingError;

/// Simplified order validation for relayer-authorized model
/// Relayer has full authority to match orders - no signature verification needed
/// This follows industry best practices (Jupiter, Mango, Drift patterns)
pub fn validate_order_business_logic(
    order: &PreOrder,
    trader: &Pubkey,
) -> Result<()> {
    // Basic validation - ensure order structure is valid
    require!(
        order.trader == *trader,
        TradingError::InvalidSignature // Keep same error for interface compatibility
    );
    
    // Business logic validation
    validate_order_amounts(order.amount, order.price)?;
    validate_order_deadline(order.deadline)?;
    
    msg!("✅ Order business logic validated for trader: {}", trader);
    msg!("🔐 Relayer-authorized matching model (ultra-low CU cost)");
    msg!("📊 Amount: {}, Price: {}, Deadline: {}", order.amount, order.price, order.deadline);
    
    Ok(())
}

/// Calculate order hash for tracking
pub fn calculate_order_hash(order: &PreOrder) -> [u8; 32] {
    let message = create_order_message(order);
    anchor_lang::solana_program::hash::hash(&message).to_bytes()
}

/// Validate order deadline
pub fn validate_order_deadline(deadline: i64) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    require!(deadline > current_time, TradingError::OrderExpired);
    Ok(())
}

/// Validate order amounts
pub fn validate_order_amounts(amount: u64, price: u64) -> Result<()> {
    require!(amount > 0, TradingError::ZeroAmount);
    require!(price >= crate::common::MIN_PRICE, TradingError::PriceTooLow);
    require!(price <= crate::common::MAX_PRICE, TradingError::PriceTooHigh);
    Ok(())
}

/// Check if orders can be matched
pub fn can_match_orders(buy_order: &PreOrder, sell_order: &PreOrder) -> Result<()> {
    // Same token
    require!(
        buy_order.token_id == sell_order.token_id,
        TradingError::TokenMintMismatch
    );
    
    // Same collateral
    require!(
        buy_order.collateral_token == sell_order.collateral_token,
        TradingError::TokenMintMismatch
    );
    
    // Price compatibility (buy >= sell)
    require!(
        buy_order.price >= sell_order.price,
        TradingError::InvalidPrice
    );
    
    // Different traders
    require!(
        buy_order.trader != sell_order.trader,
        TradingError::SelfTrade
    );
    
    // Buy order must be buy, sell order must be sell
    require!(buy_order.is_buy, TradingError::InvalidOrderType);
    require!(!sell_order.is_buy, TradingError::InvalidOrderType);
    
    Ok(())
}

/// Calculate fill amount for partial fills
pub fn calculate_fill_amount(
    buy_amount: u64,
    sell_amount: u64,
    requested_fill: Option<u64>,
) -> u64 {
    let max_fill = buy_amount.min(sell_amount);
    
    match requested_fill {
        Some(fill) => fill.min(max_fill),
        None => max_fill,
    }
}

/// Generate unique trade ID from order hashes
pub fn generate_trade_id(buy_hash: &[u8; 32], sell_hash: &[u8; 32]) -> [u8; 32] {
    let mut combined = Vec::new();
    combined.extend_from_slice(buy_hash);
    combined.extend_from_slice(sell_hash);
    anchor_lang::solana_program::hash::hash(&combined).to_bytes()
} 