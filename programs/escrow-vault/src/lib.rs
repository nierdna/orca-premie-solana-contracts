use anchor_lang::prelude::*;

// Program ID - sử dụng placeholder hợp lệ
declare_id!("a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE");

pub mod instructions;
pub mod state;
pub mod error;
pub mod events;
pub mod utils;

use instructions::*;

#[program]
pub mod escrow_vault {
    use super::*;

    /// Initialize vault system (Admin only)
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        admin: Pubkey,
        emergency_admin: Pubkey,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, admin, emergency_admin)
    }

    /// Add authorized trading program (Admin only)
    pub fn add_authorized_trader(
        ctx: Context<ManageAuthorizedTrader>,
        trader_program: Pubkey,
    ) -> Result<()> {
        instructions::manage_trader::add_handler(ctx, trader_program)
    }

    /// Remove authorized trading program (Admin only)
    pub fn remove_authorized_trader(
        ctx: Context<ManageAuthorizedTrader>,
        trader_program: Pubkey,
    ) -> Result<()> {
        instructions::manage_trader::remove_handler(ctx, trader_program)
    }

    /// Emergency pause (Emergency admin only)
    pub fn pause(ctx: Context<EmergencyControl>) -> Result<()> {
        instructions::emergency::pause_handler(ctx)
    }

    /// Emergency unpause (Emergency admin only)
    pub fn unpause(ctx: Context<EmergencyControl>) -> Result<()> {
        instructions::emergency::unpause_handler(ctx)
    }

    /// User deposits collateral tokens (ANY TOKEN SUPPORTED)
    pub fn deposit_collateral(
        ctx: Context<DepositCollateral>,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    /// User withdraws available balance
    pub fn withdraw_collateral(
        ctx: Context<WithdrawCollateral>,
        amount: u64,
    ) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    /// CPI ONLY: Subtract user balance (exact EVM slashBalance mapping)
    /// Used by trading program to "lock" collateral
    pub fn slash_balance(
        ctx: Context<SlashBalance>,
        amount: u64,
    ) -> Result<()> {
        instructions::slash_balance::handler(ctx, amount)
    }

    /// CPI ONLY: Add user balance (exact EVM creditBalance mapping)
    /// Used by trading program to "unlock" collateral
    pub fn credit_balance(
        ctx: Context<CreditBalance>,
        amount: u64,
    ) -> Result<()> {
        instructions::credit_balance::handler(ctx, amount)
    }

    /// CPI ONLY: Transfer tokens out of vault (exact EVM transferOut mapping)
    /// Used by trading program for settlement and cancellation
    pub fn transfer_out(
        ctx: Context<TransferOut>,
        recipient: Pubkey,
        amount: u64,
    ) -> Result<()> {
        instructions::transfer_out::handler(ctx, recipient, amount)
    }

    /// CPI ONLY: Transfer between user balances (exact EVM transferBalance mapping)
    /// Used by trading program for internal transfers
    pub fn transfer_balance(
        ctx: Context<TransferBalance>,
        from_user: Pubkey,
        to_user: Pubkey,
        amount: u64,
    ) -> Result<()> {
        instructions::transfer_balance::handler(ctx, from_user, to_user, amount)
    }
} 