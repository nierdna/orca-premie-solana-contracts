use anchor_lang::prelude::*;
use crate::error::VaultError;

/// VaultAuthority - Token custody management (PDA)
/// Seeds: ["vault_authority", token_mint]
#[account]
pub struct VaultAuthority {
    pub token_mint: Pubkey,     // Token mint this authority manages (32 bytes)
    pub vault_ata: Pubkey,      // Associated token account (32 bytes)
    pub total_deposits: u64,    // Total deposits for this token (8 bytes)
    pub bump: u8,               // PDA bump (1 byte)
}

impl VaultAuthority {
    pub const VAULT_AUTHORITY_SEED: &'static [u8] = b"vault_authority";
    
    // Account space calculation: discriminator + fields
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 1;

    /// Initialize vault authority
    pub fn initialize(&mut self, token_mint: Pubkey, vault_ata: Pubkey, bump: u8) {
        self.token_mint = token_mint;
        self.vault_ata = vault_ata;
        self.total_deposits = 0;
        self.bump = bump;
    }
    
    /// Add to total deposits (exact EVM logic)
    pub fn add_deposit(&mut self, amount: u64) -> Result<()> {
        self.total_deposits = self.total_deposits
            .checked_add(amount)
            .ok_or(VaultError::MathOverflow)?;
        Ok(())
    }
    
    /// Subtract from total deposits (exact EVM logic)
    pub fn subtract_deposit(&mut self, amount: u64) -> Result<()> {
        require!(self.total_deposits >= amount, VaultError::InsufficientBalance);
        self.total_deposits = self.total_deposits
            .checked_sub(amount)
            .ok_or(VaultError::MathOverflow)?;
        Ok(())
    }
} 