use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::common::PreOrder;
use crate::state::*;
use crate::error::TradingError;
use crate::events::OrdersMatched;
use crate::utils::{verify_order_signature, can_match_orders, calculate_fill_amount};

// Import vault program for actual CPI calls
use escrow_vault::cpi;
use escrow_vault::program::EscrowVault;

#[derive(Accounts)]
pub struct MatchOrders<'info> {
    /// TradeRecord account (User-controlled keypair, not PDA)
    /// Client generates keypair, Anchor handles account creation/initialization
    #[account(
        init_if_needed,
        payer = relayer,
        space = 8 + TradeRecord::INIT_SPACE,
    )]
    pub trade_record: Box<Account<'info, TradeRecord>>,
    
    /// TokenMarket for the trading pair
    #[account(
        constraint = token_market.to_account_info().owner == &crate::ID @ TradingError::InvalidAccountOwner,
    )]
    pub token_market: Box<Account<'info, TokenMarket>>,
    
    /// Trade configuration PDA for relayer validation
    #[account(
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = config.is_relayer(&relayer.key()) @ TradingError::UnauthorizedRelayer,
        constraint = !config.paused @ TradingError::TradingPaused,
    )]
    pub config: Box<Account<'info, TradeConfig>>,
    
    /// Authorized relayer executing the match
    #[account(mut)]
    pub relayer: Signer<'info>,
    
    // Vault program accounts for CPI calls
    /// Vault program for cross-program calls
    #[account(
        constraint = vault_program.key() == config.vault_program @ TradingError::VaultProgramMismatch,
    )]
    pub vault_program: Program<'info, EscrowVault>,
    
    /// Vault config PDA - properly typed and validated
    #[account(
        seeds = [escrow_vault::state::VaultConfig::VAULT_CONFIG_SEED],
        bump,
        seeds::program = vault_program.key(),
    )]
    pub vault_config: Box<Account<'info, escrow_vault::state::VaultConfig>>,
    
    /// Buyer balance PDA - validated in handler
    /// CHECK: Buyer balance account validated via CPI to vault program
    #[account(mut)]
    pub buyer_balance: AccountInfo<'info>,
    
    /// Seller balance PDA - validated in handler  
    /// CHECK: Seller balance account validated via CPI to vault program
    #[account(mut)]
    pub seller_balance: AccountInfo<'info>,
    
    /// Vault authority PDA - properly typed and validated
    #[account(
        seeds = [
            escrow_vault::state::VaultAuthority::VAULT_AUTHORITY_SEED,
            buyer_collateral_ata.mint.as_ref()
        ],
        bump,
        seeds::program = vault_program.key(),
    )]
    pub vault_authority: Box<Account<'info, escrow_vault::state::VaultAuthority>>,
    
    // Token accounts for collateral validation
    #[account(
        constraint = buyer_collateral_ata.mint == seller_collateral_ata.mint @ TradingError::TokenMintMismatch,
    )]
    pub buyer_collateral_ata: Box<Account<'info, TokenAccount>>,
    
    pub seller_collateral_ata: Box<Account<'info, TokenAccount>>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    
    /// 🛡️ INSTRUCTION SYSVAR - For precise CPI caller detection
    /// CHECK: Validated by constraint to ensure it's the instruction sysvar
    #[account(
        constraint = instruction_sysvar.key() == solana_program::sysvar::instructions::ID @ TradingError::InvalidInstructionSysvar
    )]
    pub instruction_sysvar: AccountInfo<'info>,
}

pub fn handler(
    ctx: Context<MatchOrders>,
    buy_order: PreOrder,
    sell_order: PreOrder,
    buy_signature: [u8; 64],
    sell_signature: [u8; 64],
    fill_amount: Option<u64>,
) -> Result<()> {
    // Get account keys before mutable borrows
    let trade_record_key = ctx.accounts.trade_record.key();
    let token_market_key = ctx.accounts.token_market.key();
    
    // Validate orders can be matched
    can_match_orders(&buy_order, &sell_order)?;
    
    // Validate token market matches orders
    require!(
        buy_order.token_id == token_market_key,
        TradingError::TokenMintMismatch
    );
    require!(
        sell_order.token_id == token_market_key,
        TradingError::TokenMintMismatch
    );
    
    // Verify order signatures
    verify_order_signature(&buy_order, &buy_signature, &buy_order.trader)?;
    verify_order_signature(&sell_order, &sell_signature, &sell_order.trader)?;
    
    // Calculate actual fill amount
    let actual_fill_amount = calculate_fill_amount(
        buy_order.amount,
        sell_order.amount,
        fill_amount,
    );
    
    // Validate fill amount
    require!(actual_fill_amount > 0, TradingError::ZeroAmount);
    require!(
        actual_fill_amount >= ctx.accounts.config.economic_config.minimum_fill_amount,
        TradingError::BelowMinimumFill
    );
    
    // Calculate collateral requirements
    let (buyer_collateral, seller_collateral) = calculate_collateral_requirements(
        actual_fill_amount,
        buy_order.price,
        &ctx.accounts.config.economic_config,
    )?;
    
    // Validate collateral token
    require!(
        buy_order.collateral_token == ctx.accounts.buyer_collateral_ata.mint,
        TradingError::TokenMintMismatch
    );
    require!(
        sell_order.collateral_token == ctx.accounts.seller_collateral_ata.mint,
        TradingError::TokenMintMismatch
    );
    
    // Lock buyer collateral via CPI to vault
    lock_buyer_collateral_cpi(&ctx, buyer_collateral)?;
    
    // Lock seller collateral via CPI to vault  
    lock_seller_collateral_cpi(&ctx, seller_collateral)?;
    
    // Initialize TradeRecord
    let trade_record = &mut ctx.accounts.trade_record;
    let match_time = Clock::get()?.unix_timestamp;
    
    trade_record.trade_id = trade_record_key;
    trade_record.buyer = buy_order.trader;
    trade_record.seller = sell_order.trader;
    trade_record.token_id = token_market_key;
    trade_record.collateral_mint = buy_order.collateral_token;
    trade_record.filled_amount = actual_fill_amount;
    trade_record.price = buy_order.price;
    trade_record.buyer_collateral = buyer_collateral;
    trade_record.seller_collateral = seller_collateral;
    trade_record.match_time = match_time;
    trade_record.settled = false;
    trade_record.target_mint = None;
    
    // Emit OrdersMatched event
    emit!(OrdersMatched {
        trade_id: trade_record.trade_id,
        buyer: trade_record.buyer,
        seller: trade_record.seller,
        token_id: trade_record.token_id,
        filled_amount: actual_fill_amount,
        price: buy_order.price,
        buyer_collateral,
        seller_collateral,
        match_time,
    });
    
    msg!(
        "Orders matched: trade_id: {} - buyer: {} - seller: {} - amount: {} - price: {}",
        trade_record.trade_id,
        trade_record.buyer,
        trade_record.seller,
        actual_fill_amount,
        buy_order.price
    );
    
    Ok(())
}

/// Calculate collateral requirements based on economic config
fn calculate_collateral_requirements(
    amount: u64,
    price: u64,
    economic_config: &crate::common::EconomicConfig,
) -> Result<(u64, u64)> {
    let trade_value = amount
        .checked_mul(price)
        .ok_or(TradingError::MathOverflow)?
        .checked_div(crate::common::PRICE_SCALE)
        .ok_or(TradingError::MathOverflow)?;
    
    let buyer_collateral = trade_value
        .checked_mul(economic_config.buyer_collateral_ratio as u64)
        .ok_or(TradingError::MathOverflow)?
        .checked_div(10000)
        .ok_or(TradingError::MathOverflow)?;
    
    let seller_collateral = trade_value
        .checked_mul(economic_config.seller_collateral_ratio as u64)
        .ok_or(TradingError::MathOverflow)?
        .checked_div(10000)
        .ok_or(TradingError::MathOverflow)?;
    
    Ok((buyer_collateral, seller_collateral))
}

/// Lock buyer collateral via CPI to vault program
/// Solution A: Unified lifetime from single Context source
fn lock_buyer_collateral_cpi(
    ctx: &Context<MatchOrders>,
    amount: u64,
) -> Result<()> {
    msg!("Locking buyer collateral via CPI: amount: {}", amount);
    
    // All accounts from same Context - unified 'ctx lifetime!
    let cpi_accounts = cpi::accounts::SlashBalance {
        config: ctx.accounts.vault_config.to_account_info(),
        user_balance: ctx.accounts.buyer_balance.to_account_info(),
        vault_authority: ctx.accounts.vault_authority.to_account_info(),
        instruction_sysvar: ctx.accounts.instruction_sysvar.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.vault_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Execute ACTUAL CPI call - NO LIFETIME CONFLICTS!
    cpi::slash_balance(cpi_ctx, amount)?;
    
    msg!("Buyer collateral locked successfully via CPI: {}", amount);
    Ok(())
}

/// Lock seller collateral via CPI to vault program
/// Solution A: Unified lifetime from single Context source
fn lock_seller_collateral_cpi(
    ctx: &Context<MatchOrders>,
    amount: u64,
) -> Result<()> {
    msg!("Locking seller collateral via CPI: amount: {}", amount);
    
    // All accounts from same Context - unified 'ctx lifetime!
    let cpi_accounts = cpi::accounts::SlashBalance {
        config: ctx.accounts.vault_config.to_account_info(),
        user_balance: ctx.accounts.seller_balance.to_account_info(),
        vault_authority: ctx.accounts.vault_authority.to_account_info(),
        instruction_sysvar: ctx.accounts.instruction_sysvar.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.vault_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Execute ACTUAL CPI call - NO LIFETIME CONFLICTS!
    cpi::slash_balance(cpi_ctx, amount)?;
    
    msg!("Seller collateral locked successfully via CPI: {}", amount);
    Ok(())
} 