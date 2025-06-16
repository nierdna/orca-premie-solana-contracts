use anchor_lang::prelude::*;
use shared::{EconomicConfig, TechnicalConfig};
use crate::error::TradingError;

/// TradeConfig - Global trading configuration (PDA)
#[account]
pub struct TradeConfig {
    pub admin: Pubkey,                      // Admin authority
    pub vault_program: Pubkey,              // Vault program ID for CPI
    pub relayers: Vec<Pubkey>,              // Authorized relayers (max 10)
    pub economic_config: EconomicConfig,    // Economic parameters
    pub technical_config: TechnicalConfig,  // Technical parameters
    pub paused: bool,                       // Emergency pause
    pub bump: u8,                           // PDA bump
}

impl TradeConfig {
    pub const TRADE_CONFIG_SEED: &'static [u8] = b"trade_config";
    
    // Account space calculation
    pub const INIT_SPACE: usize = 8 + // discriminator
        32 + // admin
        32 + // vault_program
        4 + (32 * 10) + // relayers (Vec<Pubkey>, max 10)
        (2 * 6) + // economic_config (6 u16 fields)
        (4 * 2) + // technical_config (2 u32 fields)
        1 + // paused
        1; // bump

    pub fn initialize(
        &mut self,
        admin: Pubkey,
        vault_program: Pubkey,
        economic_config: EconomicConfig,
        technical_config: TechnicalConfig,
        bump: u8,
    ) {
        self.admin = admin;
        self.vault_program = vault_program;
        self.relayers = Vec::new();
        self.economic_config = economic_config;
        self.technical_config = technical_config;
        self.paused = false;
        self.bump = bump;
    }

    /// Check if user is admin
    pub fn is_admin(&self, user: &Pubkey) -> bool {
        self.admin == *user
    }

    /// Check if user is authorized relayer
    pub fn is_relayer(&self, user: &Pubkey) -> bool {
        self.relayers.contains(user)
    }

    /// Add relayer
    pub fn add_relayer(&mut self, relayer: Pubkey) -> Result<()> {
        require!(self.relayers.len() < 10, TradingError::TooManyRelayers);
        require!(!self.relayers.contains(&relayer), TradingError::TooManyRelayers);
        
        self.relayers.push(relayer);
        Ok(())
    }

    /// Remove relayer
    pub fn remove_relayer(&mut self, relayer: Pubkey) -> Result<()> {
        if let Some(pos) = self.relayers.iter().position(|x| *x == relayer) {
            self.relayers.remove(pos);
            Ok(())
        } else {
            Err(TradingError::OrderNotFound.into())
        }
    }

    /// Update economic config
    pub fn update_economic_config(&mut self, new_config: EconomicConfig) -> Result<()> {
        // Validate config
        require!(
            new_config.buyer_collateral_ratio <= shared::MAX_COLLATERAL_RATIO,
            TradingError::InvalidCollateralRatio
        );
        require!(
            new_config.seller_collateral_ratio <= shared::MAX_COLLATERAL_RATIO,
            TradingError::InvalidCollateralRatio
        );
        require!(
            new_config.seller_reward_bps <= shared::MAX_REWARD_BPS,
            TradingError::InvalidRewardParameters
        );
        require!(
            new_config.late_penalty_bps <= shared::MAX_PENALTY_BPS,
            TradingError::InvalidRewardParameters
        );

        self.economic_config = new_config;
        Ok(())
    }

    /// Update technical config
    pub fn update_technical_config(&mut self, new_config: TechnicalConfig) -> Result<()> {
        require!(
            new_config.min_settle_time <= new_config.max_settle_time,
            TradingError::InvalidTimeRange
        );

        self.technical_config = new_config;
        Ok(())
    }

    /// Check if system is paused
    pub fn is_paused(&self) -> bool {
        self.paused
    }

    /// Pause system
    pub fn pause(&mut self) {
        self.paused = true;
    }

    /// Unpause system
    pub fn unpause(&mut self) {
        self.paused = false;
    }
} 