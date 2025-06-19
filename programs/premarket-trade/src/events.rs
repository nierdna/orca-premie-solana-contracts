use anchor_lang::prelude::*;
use crate::common::{EconomicConfig, TechnicalConfig};

/// Trading system initialized
#[event]
pub struct TradingInitialized {
    pub admin: Pubkey,
    pub vault_program: Pubkey,
    pub fee_recipient: Pubkey,
    pub timestamp: i64,
}

/// Token market created (Updated to match business requirements)
#[event]
pub struct TokenMarketCreated {
    pub token_id: Pubkey,           // Account address as unique token ID (EVM compatible naming)
    pub symbol: String,             // Token symbol
    pub name: String,               // Token name
    pub settle_time_limit: u32,     // Grace period in seconds
    pub created_at: i64,            // Creation timestamp
}

/// Token mapped to real mint (Admin only)
#[event]
pub struct TokenMapped {
    pub token_id: Pubkey,           // Account address as token ID (EVM compatible naming)
    pub real_mint: Pubkey,          // Real token mint address
    pub mapping_time: i64,          // When token was mapped
}

/// Relayer added to authorized list (Admin only)
#[event]
pub struct RelayerAdded {
    pub admin: Pubkey,              // Admin who added relayer
    pub relayer: Pubkey,            // Relayer address added
    pub total_relayers: u8,         // Total number of relayers after addition
    pub timestamp: i64,             // When relayer was added
}

/// Relayer removed from authorized list (Admin only)
#[event]
pub struct RelayerRemoved {
    pub admin: Pubkey,              // Admin who removed relayer
    pub relayer: Pubkey,            // Relayer address removed
    pub total_relayers: u8,         // Total number of relayers after removal
    pub timestamp: i64,             // When relayer was removed
}

/// Orders matched and trade created (Enhanced with order hashes - Hex format)
#[event]
pub struct OrdersMatched {
    pub trade_id: Pubkey,           // Account address as trade ID (EVM compatible naming)
    pub buyer: Pubkey,              // Buyer wallet
    pub seller: Pubkey,             // Seller wallet
    pub token_id: Pubkey,           // Account address as token ID (EVM compatible naming)
    pub collateral_mint: Pubkey,    // Collateral token mint address
    pub filled_amount: u64,         // Amount filled
    pub price: u64,                 // Price per token (6 decimals)
    pub buyer_collateral: u64,      // Buyer collateral locked
    pub seller_collateral: u64,     // Seller collateral locked
    pub match_time: i64,            // When trade was matched
    pub buy_order_hash: String,     // Buy order hash (hex format) - human readable
    pub sell_order_hash: String,    // Sell order hash (hex format) - human readable
}

/// Order placed
#[event]
pub struct OrderPlaced {
    pub order_id: Pubkey,
    pub token_market: Pubkey,
    pub user: Pubkey,
    pub order_type: u8, // 0 = Buy, 1 = Sell
    pub quantity: u64,
    pub collateral_amount: u64,
    pub timestamp: i64,
}

/// Order cancelled (Updated to match business requirements)
#[event]
pub struct OrderCancelled {
    pub order_hash: [u8; 32],          // Order hash for identification
    pub trader: Pubkey,                // Order creator
    pub token_id: Pubkey,              // TokenMarket account address as token ID
    pub collateral_released: u64,      // Collateral returned to vault balance
    pub cancellation_time: i64,        // When cancellation occurred
}

/// Trade settled (Updated to match business requirements)
#[event]
pub struct TradeSettled {
    pub trade_id: Pubkey,           // Account address as trade ID (EVM compatible naming)
    pub token_id: Pubkey,           // Account address as token ID (EVM compatible naming)
    pub buyer: Pubkey,              // Buyer wallet
    pub seller: Pubkey,             // Seller wallet
    pub target_mint: Pubkey,        // Real token mint that was delivered
    pub filled_amount: u64,         // Amount of tokens delivered
    pub seller_reward: u64,         // Reward earned by seller
    pub settlement_time: i64,       // When settlement occurred
}

/// Trade cancelled (Updated to match business requirements)
#[event]
pub struct TradeCancelled {
    pub trade_id: Pubkey,           // Account address as trade ID (EVM compatible naming)
    pub token_id: Pubkey,           // Account address as token ID (EVM compatible naming)
    pub buyer: Pubkey,              // Buyer wallet
    pub seller: Pubkey,             // Seller wallet
    pub penalty_amount: u64,        // Penalty transferred from seller to buyer
    pub cancellation_time: i64,     // When cancellation occurred
}

/// Trading configuration updated
#[event]
pub struct TradingConfigUpdated {
    pub admin: Pubkey,
    pub new_fee_rate: u64,
    pub new_penalty_rate: u64,
    pub timestamp: i64,
}

/// Trading paused
#[event]
pub struct TradingPaused {
    pub admin: Pubkey,
    pub timestamp: i64,
}

/// Trading unpaused
#[event]
pub struct TradingUnpaused {
    pub admin: Pubkey,
    pub timestamp: i64,
}

/// Economic configuration updated
#[event]
pub struct EconomicConfigUpdated {
    pub admin: Pubkey,              // Admin who updated the config
    pub old_config: EconomicConfig,  // Previous configuration
    pub new_config: EconomicConfig,  // New configuration
    pub updated_at: i64,            // When update occurred
}

/// Technical configuration updated
#[event]
pub struct TechnicalConfigUpdated {
    pub admin: Pubkey,              // Admin who updated the config
    pub old_config: TechnicalConfig, // Previous configuration
    pub new_config: TechnicalConfig, // New configuration
    pub updated_at: i64,            // When update occurred
} 