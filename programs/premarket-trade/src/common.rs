use anchor_lang::prelude::*;

// Program IDs and constants
pub const VAULT_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1
]);
pub const TRADING_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2
]);

// Common token mints
pub const USDC_MINT: Pubkey = Pubkey::new_from_array([
    0xE7, 0x9F, 0xED, 0x6F, 0x7C, 0x7A, 0x8F, 0x5E, 0x2F, 0x2A, 0x1F, 0x5F, 0x7B, 0x2A, 0x8C, 0x8F,
    0x4E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F
]);
pub const USDT_MINT: Pubkey = Pubkey::new_from_array([
    0xE9, 0x9F, 0xED, 0x6F, 0x7C, 0x7A, 0x8F, 0x5E, 0x2F, 0x2A, 0x1F, 0x5F, 0x7B, 0x2A, 0x8C, 0x8F,
    0x4E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F, 0x8E, 0x8F
]);

// Price and validation constants
pub const PRICE_SCALE: u64 = 1_000_000; // 6 decimals
pub const MIN_PRICE: u64 = 1_000; // 0.001 (6 decimals)
pub const MAX_PRICE: u64 = 1_000_000_000_000_000_000; // 1e18

// Economic constants
pub const MAX_COLLATERAL_RATIO: u16 = 20000; // 200%
pub const MAX_REWARD_BPS: u16 = 1000; // 10%
pub const MAX_PENALTY_BPS: u16 = 10000; // 100%

// Technical limits
pub const MAX_SYMBOL_LENGTH: usize = 10;
pub const MAX_NAME_LENGTH: usize = 50;

/// PreOrder - Off-chain signed order (Updated for Keypair Pattern)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PreOrder {
    pub trader: Pubkey,             // Order creator
    pub collateral_token: Pubkey,   // Collateral mint
    pub token_id: Pubkey,           // TokenMarket account address as token ID (EVM compatible naming)
    pub amount: u64,                // Order amount
    pub price: u64,                 // Price (6 decimals)
    pub is_buy: bool,               // Buy/sell flag
    pub nonce: u64,                 // Replay protection
    pub deadline: i64,              // Order expiration
}

/// Economic Config
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EconomicConfig {
    pub minimum_fill_amount: u64,       // Default: 1000
    pub maximum_order_amount: u64,      // Default: 1e12
    pub buyer_collateral_ratio: u16,    // Default: 10000 (100%)
    pub seller_collateral_ratio: u16,   // Default: 10000 (100%)
    pub seller_reward_bps: u16,         // Default: 0 (0%)
    pub late_penalty_bps: u16,          // Default: 10000 (100%)
}

impl Default for EconomicConfig {
    fn default() -> Self {
        Self {
            buyer_collateral_ratio: 10000,  // 100%
            seller_collateral_ratio: 10000, // 100%
            seller_reward_bps: 0,           // 0%
            late_penalty_bps: 10000,        // 100%
            minimum_fill_amount: 1000,      // 0.001 tokens
            maximum_order_amount: 1_000_000_000_000, // 1M tokens
        }
    }
}

/// Technical Config
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TechnicalConfig {
    pub min_settle_time: u32,           // Default: 3600 seconds (1 hour)
    pub max_settle_time: u32,           // Default: 2592000 seconds (30 days)
}

impl Default for TechnicalConfig {
    fn default() -> Self {
        Self {
            min_settle_time: 30,      // 30 seconds
            max_settle_time: 2592000,   // 30 days
        }
    }
}

#[error_code]
pub enum SharedError {
    #[msg("Math overflow")]
    MathOverflow,
}

/// Utility functions for safe math operations
pub fn safe_calculate_collateral(
    amount: u64,
    price: u64,
    ratio: u16,
) -> Result<u64> {
    let trade_value = amount
        .checked_mul(price)
        .ok_or(SharedError::MathOverflow)?
        .checked_div(PRICE_SCALE)
        .ok_or(SharedError::MathOverflow)?;
    
    let collateral = trade_value
        .checked_mul(ratio as u64)
        .ok_or(SharedError::MathOverflow)?
        .checked_div(10000)
        .ok_or(SharedError::MathOverflow)?;
    
    Ok(collateral)
}

/// Create order message for signature verification
pub fn create_order_message(order: &PreOrder) -> Vec<u8> {
    let mut message = Vec::new();
    message.extend_from_slice(b"PreMarketOrder");  // Domain separator
    message.extend_from_slice(&order.trader.to_bytes());
    message.extend_from_slice(&order.collateral_token.to_bytes());
    message.extend_from_slice(&order.token_id.to_bytes());
    message.extend_from_slice(&order.amount.to_le_bytes());
    message.extend_from_slice(&order.price.to_le_bytes());
    message.push(if order.is_buy { 1 } else { 0 });
    message.extend_from_slice(&order.nonce.to_le_bytes());
    message.extend_from_slice(&order.deadline.to_le_bytes());
    message
} 