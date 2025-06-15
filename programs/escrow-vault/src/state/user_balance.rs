use anchor_lang::prelude::*;
use crate::error::VaultError;

/// UserBalance - Per user per token balance (PDA)
/// Seeds: ["user_balance", user_pubkey, token_mint]
#[account]
pub struct UserBalance {
    pub user: Pubkey,           // User address (32 bytes)
    pub token_mint: Pubkey,     // Token mint address (32 bytes)
    pub balance: u64,           // Available balance (8 bytes)
    pub bump: u8,               // PDA bump (1 byte)
}

impl UserBalance {
    pub const USER_BALANCE_SEED: &'static [u8] = b"user_balance";
    
    // Account space calculation: discriminator + fields
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 1;

    /// Initialize new user balance
    pub fn initialize(&mut self, user: Pubkey, token_mint: Pubkey, bump: u8) {
        self.user = user;
        self.token_mint = token_mint;
        self.balance = 0;
        self.bump = bump;
    }
    
    /// Add to balance (exact EVM creditBalance mapping)
    pub fn credit_balance(&mut self, amount: u64) -> Result<()> {
        self.balance = self.balance
            .checked_add(amount)
            .ok_or(VaultError::MathOverflow)?;
        Ok(())
    }
    
    /// Subtract from balance (exact EVM slashBalance mapping)
    pub fn slash_balance(&mut self, amount: u64) -> Result<()> {
        require!(self.balance >= amount, VaultError::InsufficientBalance);
        self.balance = self.balance
            .checked_sub(amount)
            .ok_or(VaultError::MathOverflow)?;
        Ok(())
    }
    
    /// Check if balance is sufficient
    pub fn has_sufficient_balance(&self, amount: u64) -> bool {
        self.balance >= amount
    }
} 