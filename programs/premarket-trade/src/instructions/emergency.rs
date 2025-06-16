/*!
 * # EMERGENCY CONTROL INSTRUCTIONS
 * 
 * ## 🎯 Business Purpose
 * Allows admin to pause/unpause the entire trading system in emergency situations.
 * Critical for system security and risk management.
 * 
 * ## 🚨 Emergency Scenarios
 * - Security vulnerabilities discovered
 * - Market manipulation detected
 * - System maintenance required
 * - Regulatory compliance issues
 * 
 * ## 🛡️ Security Requirements
 * - Only admin can pause/unpause system
 * - Pause state prevents all trading operations
 * - Emergency admin can also trigger pause
 * - Event emission for transparency
 * 
 * ## 🔄 Pause Effects
 * When paused, the following operations are blocked:
 * - Order matching (match_orders)
 * - Trade settlement (settle_trade)
 * - Trade cancellation (cancel_trade)
 * - Order cancellation (cancel_order)
 * - Configuration updates (update_config)
 * - Token market creation (create_token_market)
 * - Token mapping (map_token)
 * - Relayer management (manage_relayers)
 * 
 * ## ✅ Allowed During Pause
 * - Emergency unpause (this instruction)
 * - Read-only operations
 * 
 * ## 📈 Event Emission
 * Emits pause/unpause events for off-chain monitoring and alerting
 */

use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::TradingError;
use crate::events::{TradingPaused, TradingUnpaused};

#[derive(Accounts)]
pub struct EmergencyControl<'info> {
    /// Trade configuration PDA to update pause state
    #[account(
        mut,
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ TradingError::InvalidAdmin,
    )]
    pub config: Account<'info, TradeConfig>,
    
    /// Admin signer (must be current admin)
    #[account(mut)]
    pub admin: Signer<'info>,
}

/// Pause the trading system (Emergency control)
pub fn pause_handler(ctx: Context<EmergencyControl>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let current_time = Clock::get()?.unix_timestamp;
    
    // Check if already paused
    require!(
        !config.paused,
        TradingError::TradingPaused
    );
    
    // Set pause state
    config.paused = true;
    
    // Emit pause event
    emit!(TradingPaused {
        admin: ctx.accounts.admin.key(),
        timestamp: current_time,
    });
    
    msg!(
        "🚨 TRADING SYSTEM PAUSED by admin: {} at timestamp: {}",
        ctx.accounts.admin.key(),
        current_time
    );
    
    Ok(())
}

/// Unpause the trading system (Emergency control)
pub fn unpause_handler(ctx: Context<EmergencyControl>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let current_time = Clock::get()?.unix_timestamp;
    
    // Check if currently paused
    require!(
        config.paused,
        TradingError::TradingNotActive
    );
    
    // Remove pause state
    config.paused = false;
    
    // Emit unpause event
    emit!(TradingUnpaused {
        admin: ctx.accounts.admin.key(),
        timestamp: current_time,
    });
    
    msg!(
        "✅ TRADING SYSTEM UNPAUSED by admin: {} at timestamp: {}",
        ctx.accounts.admin.key(),
        current_time
    );
    
    Ok(())
} 