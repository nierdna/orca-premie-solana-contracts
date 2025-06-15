use anchor_lang::prelude::*;

/// Vault system initialized
#[event]
pub struct VaultInitialized {
    pub admin: Pubkey,
    pub emergency_admin: Pubkey,
    pub timestamp: i64,
}

/// Vault paused by emergency admin
#[event]
pub struct VaultPaused {
    pub emergency_admin: Pubkey,
    pub timestamp: i64,
}

/// Vault unpaused by emergency admin
#[event]
pub struct VaultUnpaused {
    pub emergency_admin: Pubkey,
    pub timestamp: i64,
}

/// Collateral deposited by user
#[event]
pub struct CollateralDeposited {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

/// Collateral withdrawn by user
#[event]
pub struct CollateralWithdrawn {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub remaining_balance: u64,
}

/// Balance slashed (locked) via CPI
#[event]
pub struct BalanceSlashed {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub caller_program: Pubkey,
}

/// Balance credited (unlocked) via CPI
#[event]
pub struct BalanceCredited {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub caller_program: Pubkey,
}

/// Tokens transferred out via CPI
#[event]
pub struct TokensTransferredOut {
    pub user: Pubkey,
    pub recipient: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub caller_program: Pubkey,
}

/// Balance transferred between users via CPI
#[event]
pub struct BalanceTransferred {
    pub from_user: Pubkey,
    pub to_user: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub caller_program: Pubkey,
}

/// Authorized trader added
#[event]
pub struct AuthorizedTraderAdded {
    pub trader_program: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}

/// Authorized trader removed
#[event]
pub struct AuthorizedTraderRemoved {
    pub trader_program: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
} 