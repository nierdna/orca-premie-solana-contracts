use anchor_lang::prelude::*;
use crate::error::VaultError;

/// VaultConfig - Global vault state (PDA)
/// Seeds: ["vault_config"]
#[account]
pub struct VaultConfig {
    pub admin: Pubkey,                          // 32 bytes
    pub emergency_admin: Pubkey,                // 32 bytes
    pub paused: bool,                           // 1 byte
    pub authorized_traders: Vec<Pubkey>,        // 4 + (32 * n) bytes
    pub bump: u8,                               // 1 byte
}

impl VaultConfig {
    pub const VAULT_CONFIG_SEED: &'static [u8] = b"vault_config";
    
    // Maximum space allocation (for up to 10 traders, no supported tokens limit)  
    pub const INIT_SPACE: usize = 32 + 32 + 1 + 4 + (32 * 10) + 1;

    pub fn initialize(&mut self, admin: Pubkey, emergency_admin: Pubkey, bump: u8) {
        self.admin = admin;
        self.emergency_admin = emergency_admin;
        self.paused = false;
        self.authorized_traders = Vec::new();
        self.bump = bump;
    }

    pub fn is_authorized_trader(&self, trader_program: &Pubkey) -> bool {
        self.authorized_traders.contains(trader_program)
    }

    pub fn add_authorized_trader(&mut self, trader_program: Pubkey) -> Result<()> {
        require!(!self.is_authorized_trader(&trader_program), VaultError::DuplicateAuthorizedTrader);
        require!(self.authorized_traders.len() < 10, VaultError::TooManyAuthorizedTraders);
        
        self.authorized_traders.push(trader_program);
        Ok(())
    }

    pub fn remove_authorized_trader(&mut self, trader_program: &Pubkey) -> Result<()> {
        let position = self.authorized_traders
            .iter()
            .position(|&x| x == *trader_program)
            .ok_or(VaultError::TraderNotFound)?;
        
        self.authorized_traders.remove(position);
        Ok(())
    }
} 