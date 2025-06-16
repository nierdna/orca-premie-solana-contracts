use anchor_lang::prelude::*;
use shared::*;
use crate::error::TradingError;

/// TradeRecord - Individual trade record (User-controlled keypair, not PDA)
/// Exact business requirements mapping
#[account]
pub struct TradeRecord {
    pub trade_id: Pubkey,           // Account address as unique trade ID (EVM compatible naming)
    pub buyer: Pubkey,              // Buyer wallet
    pub seller: Pubkey,             // Seller wallet
    pub token_id: Pubkey,           // TokenMarket account address as token ID (EVM compatible naming)
    pub collateral_mint: Pubkey,    // Collateral token mint
    pub filled_amount: u64,         // Amount filled
    pub price: u64,                 // Price per token (6 decimals)
    pub buyer_collateral: u64,      // Buyer collateral locked
    pub seller_collateral: u64,     // Seller collateral locked
    pub match_time: i64,            // When trade was matched
    pub settled: bool,              // Settlement status
    pub target_mint: Option<Pubkey>,// Real token mint (after settlement)
    // NOTE: No bump field - not a PDA, user-controlled keypair
}

impl TradeRecord {
    // Account space calculation: discriminator + fields
    pub const INIT_SPACE: usize = 8 + // discriminator
        32 + // trade_id
        32 + // buyer
        32 + // seller
        32 + // token_id
        32 + // collateral_mint
        8 + // filled_amount
        8 + // price
        8 + // buyer_collateral
        8 + // seller_collateral
        8 + // match_time
        1 + // settled
        1 + 32; // target_mint (Option<Pubkey>)

    pub fn initialize(
        &mut self,
        trade_id: Pubkey,
        buyer: Pubkey,
        seller: Pubkey,
        token_id: Pubkey,
        collateral_mint: Pubkey,
        filled_amount: u64,
        price: u64,
        buyer_collateral: u64,
        seller_collateral: u64,
    ) {
        self.trade_id = trade_id;
        self.buyer = buyer;
        self.seller = seller;
        self.token_id = token_id;
        self.collateral_mint = collateral_mint;
        self.filled_amount = filled_amount;
        self.price = price;
        self.buyer_collateral = buyer_collateral;
        self.seller_collateral = seller_collateral;
        self.match_time = Clock::get().unwrap().unix_timestamp;
        self.settled = false;
        self.target_mint = None;
    }

    /// Check if trade is settled
    pub fn is_settled(&self) -> bool {
        self.settled
    }

    /// Mark trade as settled
    pub fn mark_settled(&mut self, target_mint: Pubkey) -> Result<()> {
        require!(!self.settled, TradingError::TradeAlreadySettled);
        
        self.settled = true;
        self.target_mint = Some(target_mint);
        
        Ok(())
    }

    /// Calculate total trade value
    pub fn total_value(&self) -> Result<u64> {
        self.filled_amount
            .checked_mul(self.price)
            .ok_or(TradingError::MathOverflow.into())
    }

    /// Calculate total collateral locked
    pub fn total_collateral(&self) -> u64 {
        self.buyer_collateral.saturating_add(self.seller_collateral)
    }

    /// Check if grace period has expired
    pub fn is_grace_period_expired(&self, grace_period: u32) -> bool {
        let current_time = Clock::get().unwrap().unix_timestamp;
        current_time > self.match_time + (grace_period as i64)
    }

    /// Validate trade participants
    pub fn validate_participant(&self, user: &Pubkey) -> Result<bool> {
        Ok(self.buyer == *user || self.seller == *user)
    }

    /// Check if user is buyer
    pub fn is_buyer(&self, user: &Pubkey) -> bool {
        self.buyer == *user
    }

    /// Check if user is seller
    pub fn is_seller(&self, user: &Pubkey) -> bool {
        self.seller == *user
    }
} 