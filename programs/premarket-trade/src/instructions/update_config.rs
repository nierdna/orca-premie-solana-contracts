/*!
 * # UPDATE CONFIG INSTRUCTIONS
 * 
 * ## 🎯 Business Purpose
 * Allows admin to update economic and technical parameters of the trading system.
 * Critical for system governance and risk management.
 * 
 * ## 🔧 Configuration Types
 * 1. **Economic Config**: Collateral ratios, rewards, penalties, limits
 * 2. **Technical Config**: Settlement time limits, system parameters
 * 
 * ## 🛡️ Security Requirements
 * - Only admin can update configurations
 * - Parameter validation to prevent invalid settings
 * - Bounds checking for all economic parameters
 * - Event emission for transparency
 * 
 * ## 📊 Economic Parameters
 * - Collateral ratios (buyer/seller): 0-200% (0-20000 basis points)
 * - Seller reward: 0-10% (0-1000 basis points)
 * - Late penalty: 0-100% (0-10000 basis points)
 * - Order amount limits: minimum and maximum
 * 
 * ## ⏰ Technical Parameters
 * - Settlement time limits: 1 hour to 30 days
 * - System operational parameters
 * 
 * ## 📈 Event Emission
 * Emits configuration update events for off-chain monitoring
 */

use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::TradingError;
use crate::events::{EconomicConfigUpdated, TechnicalConfigUpdated};
use shared::{EconomicConfig, TechnicalConfig};

// Economic config update instruction
#[derive(Accounts)]
pub struct UpdateEconomicConfig<'info> {
    /// Trade configuration PDA to update
    #[account(
        mut,
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ TradingError::InvalidAdmin,
        constraint = !config.paused @ TradingError::TradingPaused,
    )]
    pub config: Account<'info, TradeConfig>,
    
    /// Admin signer (must be current admin)
    #[account(mut)]
    pub admin: Signer<'info>,
}

// Technical config update instruction
#[derive(Accounts)]
pub struct UpdateTechnicalConfig<'info> {
    /// Trade configuration PDA to update
    #[account(
        mut,
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ TradingError::InvalidAdmin,
        constraint = !config.paused @ TradingError::TradingPaused,
    )]
    pub config: Account<'info, TradeConfig>,
    
    /// Admin signer (must be current admin)
    #[account(mut)]
    pub admin: Signer<'info>,
}

/// Update economic configuration parameters
pub fn update_economic_handler(
    ctx: Context<UpdateEconomicConfig>,
    new_config: EconomicConfig,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let current_time = Clock::get()?.unix_timestamp;
    
    // Step 1: Validate new economic parameters
    validate_economic_config(&new_config)?;
    
    // Step 2: Store old config for event
    let old_config = config.economic_config.clone();
    
    // Step 3: Update economic configuration
    config.economic_config = new_config.clone();
    
    // Step 4: Emit configuration update event
    emit!(EconomicConfigUpdated {
        admin: ctx.accounts.admin.key(),
        old_config,
        new_config,
        updated_at: current_time,
    });
    
    msg!(
        "Economic config updated by admin: {} at timestamp: {}",
        ctx.accounts.admin.key(),
        current_time
    );
    
    Ok(())
}

/// Update technical configuration parameters
pub fn update_technical_handler(
    ctx: Context<UpdateTechnicalConfig>,
    new_config: TechnicalConfig,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let current_time = Clock::get()?.unix_timestamp;
    
    // Step 1: Validate new technical parameters
    validate_technical_config(&new_config)?;
    
    // Step 2: Store old config for event
    let old_config = config.technical_config.clone();
    
    // Step 3: Update technical configuration
    config.technical_config = new_config.clone();
    
    // Step 4: Emit configuration update event
    emit!(TechnicalConfigUpdated {
        admin: ctx.accounts.admin.key(),
        old_config,
        new_config,
        updated_at: current_time,
    });
    
    msg!(
        "Technical config updated by admin: {} at timestamp: {}",
        ctx.accounts.admin.key(),
        current_time
    );
    
    Ok(())
}

/// Validate economic configuration parameters
fn validate_economic_config(config: &EconomicConfig) -> Result<()> {
    // Validate collateral ratios (0-200%)
    require!(
        config.buyer_collateral_ratio <= shared::MAX_COLLATERAL_RATIO,
        TradingError::InvalidCollateralRatio
    );
    require!(
        config.seller_collateral_ratio <= shared::MAX_COLLATERAL_RATIO,
        TradingError::InvalidCollateralRatio
    );
    
    // Validate seller reward (0-10%)
    require!(
        config.seller_reward_bps <= shared::MAX_REWARD_BPS,
        TradingError::InvalidRewardParameters
    );
    
    // Validate late penalty (0-100%)
    require!(
        config.late_penalty_bps <= shared::MAX_PENALTY_BPS,
        TradingError::InvalidRewardParameters
    );
    
    // Validate order amount limits
    require!(
        config.minimum_fill_amount > 0,
        TradingError::ZeroAmount
    );
    require!(
        config.maximum_order_amount > config.minimum_fill_amount,
        TradingError::InvalidFillAmount
    );
    require!(
        config.maximum_order_amount <= 1_000_000_000_000_000, // 1e15 max
        TradingError::ExceedOrderAmount
    );
    
    msg!(
        "Economic config validation passed: buyer_ratio: {}, seller_ratio: {}, reward_bps: {}, penalty_bps: {}",
        config.buyer_collateral_ratio,
        config.seller_collateral_ratio,
        config.seller_reward_bps,
        config.late_penalty_bps
    );
    
    Ok(())
}

/// Validate technical configuration parameters
fn validate_technical_config(config: &TechnicalConfig) -> Result<()> {
    // Validate settlement time limits
    require!(
        config.min_settle_time >= 3600, // At least 1 hour
        TradingError::InvalidSettleTime
    );
    require!(
        config.max_settle_time <= 2_592_000, // At most 30 days
        TradingError::InvalidSettleTime
    );
    require!(
        config.max_settle_time > config.min_settle_time,
        TradingError::InvalidSettleTime
    );
    
    msg!(
        "Technical config validation passed: min_settle_time: {}, max_settle_time: {}",
        config.min_settle_time,
        config.max_settle_time
    );
    
    Ok(())
} 