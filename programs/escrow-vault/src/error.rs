use anchor_lang::prelude::*;

/// Vault program error definitions (exact as specified in business requirements)
#[error_code]
pub enum VaultError {
    #[msg("Invalid admin")]
    InvalidAdmin,
    
    #[msg("Invalid emergency admin")]
    InvalidEmergencyAdmin,
    
    #[msg("Vault is paused")]
    VaultPaused,
    
    #[msg("Vault is not paused")]
    VaultNotPaused,
    
    #[msg("Invalid account owner")]
    InvalidAccountOwner,
    
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    
    #[msg("Insufficient balance")]
    InsufficientBalance,
    
    #[msg("Zero amount not allowed")]
    ZeroAmount,
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Unauthorized trader")]
    UnauthorizedTrader,
    
    #[msg("Duplicate authorized trader")]
    DuplicateAuthorizedTrader,
    
    #[msg("Too many authorized traders")]
    TooManyAuthorizedTraders,
    
    #[msg("Trader not found")]
    TraderNotFound,
    
    #[msg("Unauthorized CPI caller")]
    UnauthorizedCPICaller,
} 