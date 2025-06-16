use anchor_lang::prelude::*;
use crate::error::TradingError;

/// OrderStatus - Track individual order state (PDA)
/// Used for order management and partial fills
#[account]
pub struct OrderStatus {
    pub order_id: Pubkey,                   // Unique order identifier (32 bytes)
    pub token_market: Pubkey,               // Associated token market (32 bytes)
    pub user: Pubkey,                       // Order creator (32 bytes)
    pub order_type: OrderType,              // Buy or Sell (1 byte)
    pub original_quantity: u64,             // Original order quantity (8 bytes)
    pub filled_quantity: u64,               // Amount already filled (8 bytes)
    pub collateral_locked: u64,             // Collateral amount locked (8 bytes)
    pub created_at: i64,                    // Order creation time (8 bytes)
    pub expires_at: i64,                    // Order expiration time (8 bytes)
    pub status: OrderStatusType,            // Current order status (1 byte)
    pub bump: u8,                           // PDA bump (1 byte)
}

/// Order type enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OrderType {
    Buy,    // Buy order
    Sell,   // Sell order
}

/// Order status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OrderStatusType {
    Active,         // Order is active and can be filled
    PartiallyFilled, // Order is partially filled
    Filled,         // Order is completely filled
    Cancelled,      // Order was cancelled
    Expired,        // Order expired
}

impl OrderStatus {
    pub const ORDER_STATUS_SEED: &'static [u8] = b"order_status";
    
    // Account space calculation: discriminator + fields
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 1 + 1;

    pub fn initialize(
        &mut self,
        order_id: Pubkey,
        token_market: Pubkey,
        user: Pubkey,
        order_type: OrderType,
        quantity: u64,
        collateral_locked: u64,
        expires_at: i64,
        bump: u8,
    ) {
        self.order_id = order_id;
        self.token_market = token_market;
        self.user = user;
        self.order_type = order_type;
        self.original_quantity = quantity;
        self.filled_quantity = 0;
        self.collateral_locked = collateral_locked;
        self.created_at = Clock::get().unwrap().unix_timestamp;
        self.expires_at = expires_at;
        self.status = OrderStatusType::Active;
        self.bump = bump;
    }

    /// Get remaining quantity to fill
    pub fn remaining_quantity(&self) -> u64 {
        self.original_quantity.saturating_sub(self.filled_quantity)
    }

    /// Check if order can be filled
    pub fn can_fill(&self, current_time: i64) -> bool {
        matches!(self.status, OrderStatusType::Active | OrderStatusType::PartiallyFilled)
            && current_time <= self.expires_at
            && self.remaining_quantity() > 0
    }

    /// Check if order is expired
    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time > self.expires_at
    }

    /// Fill order (partial or complete)
    pub fn fill_order(&mut self, fill_quantity: u64) -> Result<()> {
        require!(
            self.can_fill(Clock::get()?.unix_timestamp),
            TradingError::OrderExpired
        );
        
        require!(
            fill_quantity <= self.remaining_quantity(),
            TradingError::ExceedOrderAmount
        );

        self.filled_quantity = self.filled_quantity
            .checked_add(fill_quantity)
            .ok_or(TradingError::MathOverflow)?;

        // Update status based on fill
        if self.filled_quantity >= self.original_quantity {
            self.status = OrderStatusType::Filled;
        } else {
            self.status = OrderStatusType::PartiallyFilled;
        }

        Ok(())
    }

    /// Cancel order
    pub fn cancel_order(&mut self) -> Result<()> {
        require!(
            matches!(self.status, OrderStatusType::Active | OrderStatusType::PartiallyFilled),
            TradingError::OrderAlreadyFilled
        );

        self.status = OrderStatusType::Cancelled;
        Ok(())
    }

    /// Mark order as expired
    pub fn mark_expired(&mut self) -> Result<()> {
        require!(
            self.is_expired(Clock::get()?.unix_timestamp),
            TradingError::OrderNotFound
        );

        self.status = OrderStatusType::Expired;
        Ok(())
    }

    /// Calculate fill percentage (in basis points)
    pub fn fill_percentage(&self) -> u64 {
        if self.original_quantity == 0 {
            return 0;
        }
        
        (self.filled_quantity * 10000) / self.original_quantity
    }

    /// Check if order belongs to user
    pub fn validate_owner(&self, user: &Pubkey) -> Result<()> {
        require!(self.user == *user, TradingError::InvalidOrderOwner);
        Ok(())
    }

    /// Get collateral to release based on fill
    pub fn collateral_to_release(&self, fill_quantity: u64) -> u64 {
        if self.original_quantity == 0 {
            return 0;
        }
        
        (self.collateral_locked * fill_quantity) / self.original_quantity
    }
} 