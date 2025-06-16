use anchor_lang::prelude::*;
use crate::common::{MAX_SYMBOL_LENGTH, MAX_NAME_LENGTH};
use crate::error::TradingError;

/// TokenMarket - Per-token market data (User-controlled keypair, not PDA)
/// Exact business requirements mapping
#[account]
pub struct TokenMarket {
    pub token_id: Pubkey,           // Account address as unique token ID (EVM compatible naming)
    pub symbol: String,             // Token symbol (max 10 chars)
    pub name: String,               // Token name (max 50 chars)
    pub real_mint: Option<Pubkey>,  // Real token mint (after mapping)
    pub mapping_time: Option<i64>,  // When token was mapped
    pub settle_time_limit: u32,     // Grace period in seconds
    pub created_at: i64,            // Creation timestamp
    // NOTE: No bump field - not a PDA, user-controlled keypair
}

impl TokenMarket {
    // Account space calculation: discriminator + fields
    pub const INIT_SPACE: usize = 8 + // discriminator
        32 + // token_id
        4 + 10 + // symbol (String, max 10 chars)
        4 + 50 + // name (String, max 50 chars)
        1 + 32 + // real_mint (Option<Pubkey>)
        1 + 8 + // mapping_time (Option<i64>)
        4 + // settle_time_limit
        8; // created_at

    pub fn initialize(
        &mut self,
        token_id: Pubkey,
        symbol: String,
        name: String,
        settle_time_limit: u32,
    ) {
        self.token_id = token_id;
        self.symbol = symbol;
        self.name = name;
        self.real_mint = None;
        self.mapping_time = None;
        self.settle_time_limit = settle_time_limit;
        self.created_at = Clock::get().unwrap().unix_timestamp;
    }

    /// Map real token to this market
    pub fn map_token(&mut self, real_mint: Pubkey) -> Result<()> {
        require!(self.real_mint.is_none(), TradingError::TokenAlreadyMapped);
        
        self.real_mint = Some(real_mint);
        self.mapping_time = Some(Clock::get()?.unix_timestamp);
        
        Ok(())
    }

    /// Check if token is mapped
    pub fn is_mapped(&self) -> bool {
        self.real_mint.is_some()
    }

    /// Get grace period for settlement
    pub fn get_grace_period(&self) -> u32 {
        self.settle_time_limit
    }

    /// Validate symbol length
    pub fn validate_symbol(symbol: &str) -> Result<()> {
        require!(
            symbol.len() <= crate::common::MAX_SYMBOL_LENGTH,
            TradingError::SymbolTooLong
        );
        Ok(())
    }

    /// Validate name length
    pub fn validate_name(name: &str) -> Result<()> {
        require!(
            name.len() <= crate::common::MAX_NAME_LENGTH,
            TradingError::NameTooLong
        );
        Ok(())
    }
} 