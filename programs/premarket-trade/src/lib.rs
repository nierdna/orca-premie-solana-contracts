use anchor_lang::prelude::*;

// Program ID sẽ được set khi deploy
declare_id!("6AXDZgH6QnCwCzJZEYp7bsQrq4yxMmhLMus66zy4ZkNF");

pub mod common;
pub mod instructions;
pub mod state;
pub mod error;
pub mod events;
pub mod utils;

use common::{PreOrder, EconomicConfig, TechnicalConfig};

use instructions::*;

#[program]
pub mod premarket_trade {
    use super::*;

    /// Initialize trading system (Admin only)
    pub fn initialize_trading(
        ctx: Context<InitializeTrading>,
        vault_program: Pubkey,
        economic_config: EconomicConfig,
        technical_config: TechnicalConfig,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, vault_program, economic_config, technical_config)
    }

    /// Create new token market (Admin only)
    /// TokenMarket = User-controlled keypair, not PDA
    pub fn create_token_market(
        ctx: Context<CreateTokenMarket>,
        symbol: String,
        name: String,
        settle_time_limit: u32,
    ) -> Result<()> {
        instructions::create_token_market::handler(ctx, symbol, name, settle_time_limit)
    }

    /// Map real token to market (Admin only)
    pub fn map_token(
        ctx: Context<MapToken>,
        real_mint: Pubkey,
    ) -> Result<()> {
        instructions::map_token::handler(ctx, real_mint)
    }

    /// Update economic parameters (Admin only)
    pub fn update_economic_config(
        ctx: Context<UpdateEconomicConfig>,
        new_config: EconomicConfig,
    ) -> Result<()> {
        instructions::update_config::update_economic_handler(ctx, new_config)
    }

    /// Update technical parameters (Admin only)
    pub fn update_technical_config(
        ctx: Context<UpdateTechnicalConfig>,
        new_config: TechnicalConfig,
    ) -> Result<()> {
        instructions::update_config::update_technical_handler(ctx, new_config)
    }

    /// Add/remove relayers (Admin only)
    pub fn manage_relayers(
        ctx: Context<ManageRelayers>,
        relayer: Pubkey,
        add: bool,
    ) -> Result<()> {
        instructions::manage_relayers::handler(ctx, relayer, add)
    }

    /// **CORE BUSINESS LOGIC**: Match buy and sell orders
    /// TradeRecord = User-controlled keypair, not PDA
    /// Includes CPI calls to vault for collateral locking
    pub fn match_orders(
        ctx: Context<MatchOrders>,
        buy_order: PreOrder,
        sell_order: PreOrder,
        buy_signature: [u8; 64],
        sell_signature: [u8; 64],
        fill_amount: Option<u64>,
    ) -> Result<()> {
        instructions::match_orders::handler(
            ctx,
            buy_order,
            sell_order,
            buy_signature,
            sell_signature,
            fill_amount,
        )
    }

    /// **SETTLEMENT**: Seller delivers tokens to buyer
    /// Includes CPI calls to vault for token transfers
    pub fn settle_trade(ctx: Context<SettleTrade>) -> Result<()> {
        instructions::settle_trade::handler(ctx)
    }

    /// **CANCELLATION**: Cancel trade after grace period
    /// Includes CPI calls to vault for penalty distribution
    pub fn cancel_trade(ctx: Context<CancelTrade>) -> Result<()> {
        instructions::cancel_trade::handler(ctx)
    }

    /// Cancel order before matching (User)
    pub fn cancel_order(
        ctx: Context<CancelOrder>,
        order: PreOrder,
        signature: [u8; 64],
    ) -> Result<()> {
        instructions::cancel_order::handler(ctx, order, signature)
    }

    /// Emergency pause (Admin only)
    pub fn pause(ctx: Context<EmergencyControl>) -> Result<()> {
        instructions::emergency::pause_handler(ctx)
    }

    /// Emergency unpause (Admin only)
    pub fn unpause(ctx: Context<EmergencyControl>) -> Result<()> {
        instructions::emergency::unpause_handler(ctx)
    }
} 