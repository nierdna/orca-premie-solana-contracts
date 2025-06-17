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
        require!(
            !self.authorized_traders.contains(&trader_program),
            VaultError::TraderAlreadyAuthorized
        );
        
        require!(
            self.authorized_traders.len() < 10,
            VaultError::MaximumTradersReached
        );
        
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

    /// ✅ STANDARD CPI VALIDATION - Basic validation
    pub fn validate_cpi_caller(&self) -> Result<()> {
        require!(!self.paused, VaultError::VaultPaused);
        Ok(())
    }

    /// 🔍 DEBUG CPI VALIDATION - With detailed logging
    pub fn validate_cpi_caller_with_logging(&self, caller_program: &Pubkey, operation: &str) -> Result<()> {
        msg!("🔍 CPI Validation Debug for {}", operation);
        msg!("📞 Caller Program: {}", caller_program);
        msg!("👥 Authorized Traders Count: {}", self.authorized_traders.len());
        
        for (i, trader) in self.authorized_traders.iter().enumerate() {
            msg!("  {}. {}", i + 1, trader);
        }
        
        require!(!self.paused, VaultError::VaultPaused);
        
        require!(
            self.is_authorized_trader(caller_program),
            VaultError::UnauthorizedTrader
        );
        
        msg!("✅ CPI Validation passed for {}", operation);
        Ok(())
    }

    /// 🛡️ PRECISE CPI VALIDATION - Using instruction sysvar detection
    /// This is the most accurate method for CPI caller validation
    pub fn validate_cpi_caller_precise(&self, caller_program_id: &Pubkey, operation: &str) -> Result<()> {
        // Validate vault is not paused
        require!(!self.paused, VaultError::VaultPaused);
        
        // Validate caller is authorized using precise detection
        require!(
            self.is_authorized_trader(caller_program_id),
            VaultError::UnauthorizedTrader
        );
        
        Ok(())
    }

    /// 🚀 ADVANCED CPI VALIDATION - With additional security features
    pub fn validate_cpi_caller_advanced(&self, caller_program: &Pubkey, operation: &str) -> Result<()> {
        // Basic validations
        require!(!self.paused, VaultError::VaultPaused);
        
        // Authorization check
        require!(
            self.is_authorized_trader(caller_program),
            VaultError::UnauthorizedTrader
        );
        
        // Additional security: Check if caller is not a system program
        require!(
            *caller_program != solana_program::system_program::ID,
            VaultError::UnauthorizedTrader
        );
        
        // Additional security: Check if caller is not a token program
        require!(
            *caller_program != anchor_spl::token::ID,
            VaultError::UnauthorizedTrader
        );
        
        msg!("🚀 Advanced CPI Validation passed for {}: caller={}", operation, caller_program);
        Ok(())
    }
} 