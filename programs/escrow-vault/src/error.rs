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
    
    #[msg("Unauthorized trader program")]
    UnauthorizedTraderProgram,
    
    #[msg("Token mint mismatch")]
    TokenMintMismatch,
    
    #[msg("Invalid vault authority")]
    InvalidVaultAuthority,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    
    #[msg("Transfer failed")]
    TransferFailed,
    
    #[msg("Invalid recipient")]
    InvalidRecipient,
    
    #[msg("Account already initialized")]
    AccountAlreadyInitialized,
    
    #[msg("Account not initialized")]
    AccountNotInitialized,
    
    #[msg("Trader already authorized")]
    TraderAlreadyAuthorized,
    
    #[msg("Maximum traders reached")]
    MaximumTradersReached,
    
    #[msg("Invalid instruction sysvar account")]
    InvalidInstructionSysvar,
    
    #[msg("Failed to load instruction from sysvar")]
    FailedToLoadInstruction,
    
    #[msg("CPI caller detection failed")]
    CpiCallerDetectionFailed,
} 