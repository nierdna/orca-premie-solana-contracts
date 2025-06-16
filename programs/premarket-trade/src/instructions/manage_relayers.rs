use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::TradingError;
use crate::events::{RelayerAdded, RelayerRemoved};

#[derive(Accounts)]
pub struct ManageRelayers<'info> {
    /// Trade configuration PDA to manage relayers
    #[account(
        mut,
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ TradingError::InvalidAdmin,
        constraint = !config.paused @ TradingError::TradingPaused,
    )]
    pub config: Account<'info, TradeConfig>,
    
    /// Admin signer (must match config.admin)
    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn handler(
    ctx: Context<ManageRelayers>,
    relayer: Pubkey,
    add: bool,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let admin = ctx.accounts.admin.key();
    let timestamp = Clock::get()?.unix_timestamp;
    
    // Validate relayer address is not zero
    require!(relayer != Pubkey::default(), TradingError::InvalidTokenAddress);
    
    if add {
        // Add relayer logic
        require!(
            !config.is_relayer(&relayer),
            TradingError::TooManyRelayers  // Reuse error for "already exists"
        );
        
        // Check max relayers limit (10 according to business requirements)
        require!(
            config.relayers.len() < 10,
            TradingError::TooManyRelayers
        );
        
        // Add relayer to list
        config.add_relayer(relayer)?;
        
        // Emit RelayerAdded event
        emit!(RelayerAdded {
            admin,
            relayer,
            total_relayers: config.relayers.len() as u8,
            timestamp,
        });
        
        msg!(
            "Relayer added: {} by admin: {} - Total relayers: {}",
            relayer,
            admin,
            config.relayers.len()
        );
        
    } else {
        // Remove relayer logic
        require!(
            config.is_relayer(&relayer),
            TradingError::UnauthorizedRelayer  // Relayer doesn't exist
        );
        
        // Remove relayer from list
        config.remove_relayer(relayer)?;
        
        // Emit RelayerRemoved event
        emit!(RelayerRemoved {
            admin,
            relayer,
            total_relayers: config.relayers.len() as u8,
            timestamp,
        });
        
        msg!(
            "Relayer removed: {} by admin: {} - Total relayers: {}",
            relayer,
            admin,
            config.relayers.len()
        );
    }
    
    Ok(())
} 