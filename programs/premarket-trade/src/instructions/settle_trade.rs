/*!
 * # SETTLE TRADE INSTRUCTION
 * 
 * ## 🎯 Business Purpose
 * Allows seller to deliver real tokens to buyer and receive collateral + reward.
 * This is the successful completion path of a premarket trade.
 * 
 * ## 🔄 Settlement Flow
 * 1. **Validation**: Check seller authority, grace period, token mapping
 * 2. **Token Transfer**: Transfer real tokens from seller → buyer
 * 3. **Reward Calculation**: Calculate seller reward based on economic config
 * 4. **Collateral Release**: Release seller collateral + reward via CPI to vault
 * 5. **State Update**: Mark trade as settled
 * 6. **Event Emission**: Emit TradeSettled event
 * 
 * ## 🛡️ Security Requirements
 * - Only seller can settle their own trades
 * - Settlement must happen within grace period
 * - TokenMarket must be mapped to real token mint
 * - Seller must have sufficient real tokens
 * - All token accounts must match expected mints
 * 
 * ## 💰 Economic Model
 * - Seller gets back: `original_collateral + seller_reward`
 * - Seller reward = `trade_value * seller_reward_bps / 10000`
 * - Buyer gets: `filled_amount` of real tokens
 * - Buyer collateral remains locked (will be released separately)
 * 
 * ## 🔗 Cross-Program Integration
 * - Uses CPI to vault program for collateral release
 * - Direct token transfer for real token delivery
 * - Follows exact EVM business logic mapping
 * 
 * ## 📊 Event Data
 * Emits `TradeSettled` with trade details for off-chain indexing
 */

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::error::TradingError;
use crate::events::TradeSettled;

// Import vault program for CPI calls
use escrow_vault::cpi;
use escrow_vault::program::EscrowVault;

#[derive(Accounts)]
pub struct SettleTrade<'info> {
    /// TradeRecord account to settle (User-controlled keypair)
    #[account(
        mut,
        constraint = trade_record.to_account_info().owner == &crate::ID @ TradingError::InvalidAccountOwner,
        constraint = !trade_record.settled @ TradingError::TradeAlreadySettled,
        constraint = trade_record.seller == seller.key() @ TradingError::OnlySellerCanSettle,
    )]
    pub trade_record: Box<Account<'info, TradeRecord>>,
    
    /// TokenMarket for the trading pair (must be mapped to real token)
    #[account(
        constraint = token_market.to_account_info().owner == &crate::ID @ TradingError::InvalidAccountOwner,
        constraint = token_market.token_id == trade_record.token_id @ TradingError::TokenMintMismatch,
        constraint = token_market.real_mint.is_some() @ TradingError::TokenNotMapped,
    )]
    pub token_market: Box<Account<'info, TokenMarket>>,
    
    /// Trade configuration PDA for validation
    #[account(
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = !config.paused @ TradingError::TradingPaused,
    )]
    pub config: Box<Account<'info, TradeConfig>>,
    
    /// Seller signer (must match trade_record.seller)
    #[account(mut)]
    pub seller: Signer<'info>,
    
    // Vault program accounts for CPI calls
    /// Vault program for cross-program calls
    #[account(
        constraint = vault_program.key() == config.vault_program @ TradingError::VaultProgramMismatch,
    )]
    pub vault_program: Program<'info, EscrowVault>,
    
    /// Vault config PDA
    #[account(
        seeds = [escrow_vault::state::VaultConfig::VAULT_CONFIG_SEED],
        bump,
        seeds::program = vault_program.key(),
    )]
    pub vault_config: Box<Account<'info, escrow_vault::state::VaultConfig>>,
    
    /// Seller balance PDA for collateral release
    /// CHECK: Seller balance account validated via CPI to vault program
    #[account(mut)]
    pub seller_balance: AccountInfo<'info>,
    
    /// Vault authority PDA
    #[account(
        mut,
        seeds = [
            escrow_vault::state::VaultAuthority::VAULT_AUTHORITY_SEED,
            trade_record.collateral_mint.as_ref()
        ],
        bump,
        seeds::program = vault_program.key(),
    )]
    pub vault_authority: Box<Account<'info, escrow_vault::state::VaultAuthority>>,
    
    /// Vault ATA for collateral token
    #[account(
        mut,
        constraint = vault_ata.mint == trade_record.collateral_mint @ TradingError::TokenMintMismatch,
    )]
    pub vault_ata: Box<Account<'info, TokenAccount>>,
    
    /// Seller ATA for collateral release
    #[account(
        mut,
        constraint = seller_collateral_ata.owner == seller.key() @ TradingError::InvalidAccountOwner,
        constraint = seller_collateral_ata.mint == trade_record.collateral_mint @ TradingError::TokenMintMismatch,
    )]
    pub seller_collateral_ata: Account<'info, TokenAccount>,
    
    // Real token transfer accounts
    /// Seller ATA for real token (source)
    #[account(
        mut,
        constraint = seller_token_ata.owner == seller.key() @ TradingError::InvalidAccountOwner,
        constraint = seller_token_ata.mint == token_market.real_mint.unwrap() @ TradingError::TokenMintMismatch,
    )]
    pub seller_token_ata: Account<'info, TokenAccount>,
    
    /// Buyer ATA for real token (destination)
    #[account(
        mut,
        constraint = buyer_token_ata.owner == trade_record.buyer @ TradingError::InvalidAccountOwner,
        constraint = buyer_token_ata.mint == token_market.real_mint.unwrap() @ TradingError::TokenMintMismatch,
    )]
    pub buyer_token_ata: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    
    /// 🛡️ INSTRUCTION SYSVAR - For precise CPI caller detection
    /// CHECK: Validated by constraint to ensure it's the instruction sysvar
    #[account(
        constraint = instruction_sysvar.key() == solana_program::sysvar::instructions::ID @ TradingError::InvalidInstructionSysvar
    )]
    pub instruction_sysvar: AccountInfo<'info>,
}

pub fn handler(ctx: Context<SettleTrade>) -> Result<()> {
    let trade_record = &ctx.accounts.trade_record;
    let token_market = &ctx.accounts.token_market;
    let config = &ctx.accounts.config;
    
    // Get current time for validation
    let current_time = Clock::get()?.unix_timestamp;
    
    // Validate grace period (settlement must happen within grace period)
    let grace_period_end = trade_record.match_time + (token_market.settle_time_limit as i64);
    require!(
        current_time <= grace_period_end,
        TradingError::GracePeriodExpired
    );
    
    // Validate seller has sufficient real tokens
    require!(
        ctx.accounts.seller_token_ata.amount >= trade_record.filled_amount,
        TradingError::InsufficientBalance
    );
    
    // Step 1: Transfer real tokens from seller to buyer
    msg!(
        "Transferring {} real tokens from seller to buyer",
        trade_record.filled_amount
    );
    
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.seller_token_ata.to_account_info(),
                to: ctx.accounts.buyer_token_ata.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        trade_record.filled_amount,
    )?;
    
    // Step 2: Calculate seller reward and total collateral release
    let (seller_reward, total_seller_release) = calculate_settlement_amounts(
        trade_record.filled_amount,
        trade_record.price,
        trade_record.seller_collateral,
        &config.economic_config,
    )?;
    
    // Step 3: Release seller collateral + reward via CPI to vault
    if total_seller_release > 0 {
        msg!(
            "Releasing {} collateral + {} reward = {} total to seller via CPI",
            trade_record.seller_collateral,
            seller_reward,
            total_seller_release
        );
        
        release_seller_collateral_cpi(&ctx, total_seller_release)?;
    }
    
    // Step 4: Update trade record state
    let trade_record = &mut ctx.accounts.trade_record;
    trade_record.settled = true;
    // trade_record.target_mint = Some(token_market.real_mint.unwrap());
    
    // Step 5: Emit TradeSettled event
    emit!(TradeSettled {
        trade_id: trade_record.trade_id,
        token_id: trade_record.token_id,        // EVM compatible naming
        buyer: trade_record.buyer,
        seller: trade_record.seller,
        target_mint: token_market.real_mint.unwrap(),
        // target_mint: trade_record.target_mint.unwrap(),
        filled_amount: trade_record.filled_amount,
        seller_reward,
        settlement_time: current_time,
    });
    
    msg!(
        "Trade settled successfully: trade_id: {} - seller: {} - buyer: {} - amount: {} - reward: {}",
        trade_record.trade_id,
        trade_record.seller,
        trade_record.buyer,
        trade_record.filled_amount,
        seller_reward
    );
    
    Ok(())
}

/// Calculate settlement amounts: seller reward and total release
fn calculate_settlement_amounts(
    filled_amount: u64,
    price: u64,
    seller_collateral: u64,
    economic_config: &crate::common::EconomicConfig,
) -> Result<(u64, u64)> {
    // Calculate trade value
    let trade_value = filled_amount
        .checked_mul(price)
        .ok_or(TradingError::MathOverflow)?
        .checked_div(crate::common::PRICE_SCALE)
        .ok_or(TradingError::MathOverflow)?;
    
    // Calculate seller reward (basis points)
    let seller_reward = if economic_config.seller_reward_bps > 0 {
        trade_value
            .checked_mul(economic_config.seller_reward_bps as u64)
            .ok_or(TradingError::MathOverflow)?
            .checked_div(10000)
            .ok_or(TradingError::MathOverflow)?
    } else {
        0
    };
    
    // Total release = original collateral + reward
    let total_seller_release = seller_collateral
        .checked_add(seller_reward)
        .ok_or(TradingError::MathOverflow)?;
    
    Ok((seller_reward, total_seller_release))
}

/// Release seller collateral + reward via CPI to vault program
fn release_seller_collateral_cpi(
    ctx: &Context<SettleTrade>,
    amount: u64,
) -> Result<()> {
    msg!("Releasing seller collateral via CPI: amount: {}", amount);
    
    // All accounts from same Context - unified lifetime
    let cpi_accounts = cpi::accounts::TransferOut {
        config: ctx.accounts.vault_config.to_account_info(),
        user_balance: ctx.accounts.seller_balance.to_account_info(),
        vault_authority: ctx.accounts.vault_authority.to_account_info(),
        vault_token_account: ctx.accounts.vault_ata.to_account_info(),
        recipient_token_account: ctx.accounts.seller_collateral_ata.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        instruction_sysvar: ctx.accounts.instruction_sysvar.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.vault_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Execute CPI call to transfer tokens from vault to seller wallet
    // Note: recipient parameter is the seller's pubkey
    cpi::transfer_out(cpi_ctx, ctx.accounts.seller.key(), amount)?;
    
    msg!("Seller collateral released successfully via CPI: {}", amount);
    Ok(())
} 