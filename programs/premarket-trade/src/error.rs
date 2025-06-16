use anchor_lang::prelude::*;

/// Trading program error definitions (exact as specified in business requirements)
#[error_code]
pub enum TradingError {
    #[msg("Invalid signature")]
    InvalidSignature,
    
    #[msg("Orders incompatible")]
    IncompatibleOrders,
    
    #[msg("Trade already settled")]
    TradeAlreadySettled,
    
    #[msg("Grace period still active")]
    GracePeriodActive,
    
    #[msg("Grace period expired")]
    GracePeriodExpired,
    
    #[msg("Invalid account owner")]
    InvalidAccountOwner,
    
    #[msg("Vault CPI call failed")]
    VaultCPIFailed,
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Price too low")]
    PriceTooLow,
    
    #[msg("Price too high")]
    PriceTooHigh,
    
    #[msg("Order expired")]
    OrderExpired,
    
    #[msg("Order already used")]
    OrderAlreadyUsed,
    
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    
    #[msg("Trade not found")]
    TradeNotFound,
    
    #[msg("Only buyer can cancel")]
    OnlyBuyerCanCancel,
    
    #[msg("Only seller can settle")]
    OnlySellerCanSettle,
    
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    
    #[msg("Invalid fill amount")]
    InvalidFillAmount,
    
    #[msg("Exceed order amount")]
    ExceedOrderAmount,
    
    #[msg("Below minimum fill")]
    BelowMinimumFill,
    
    #[msg("Token not exists")]
    TokenNotExists,
    
    #[msg("Token already mapped")]
    TokenAlreadyMapped,
    
    #[msg("Invalid token address")]
    InvalidTokenAddress,
    
    #[msg("Duplicate symbol")]
    DuplicateSymbol,
    
    #[msg("Invalid collateral ratio")]
    InvalidCollateralRatio,
    
    #[msg("Invalid reward parameters")]
    InvalidRewardParameters,
    
    #[msg("Zero amount")]
    ZeroAmount,
    
    #[msg("Self trade")]
    SelfTrade,
    
    #[msg("Trading paused")]
    TradingPaused,
    
    #[msg("Unauthorized relayer")]
    UnauthorizedRelayer,
    
    #[msg("Invalid settle time")]
    InvalidSettleTime,
    
    #[msg("Symbol too long")]
    SymbolTooLong,
    
    #[msg("Name too long")]
    NameTooLong,
    
    #[msg("Too many authorized traders")]
    TooManyAuthorizedTraders,
    
    #[msg("Too many supported tokens")]
    TooManySupportedTokens,
    
    #[msg("Too many relayers")]
    TooManyRelayers,
    
    #[msg("Invalid admin")]
    InvalidAdmin,
    
    #[msg("Invalid vault program")]
    InvalidVaultProgram,
    
    #[msg("Invalid order hash")]
    InvalidOrderHash,
    
    #[msg("Grace period not expired")]
    GracePeriodNotExpired,
    
    #[msg("Token mint mismatch")]
    TokenMintMismatch,
    
    #[msg("Invalid target mint")]
    InvalidTargetMint,
    
    #[msg("Settlement deadline passed")]
    SettlementDeadlinePassed,
    
    #[msg("Trading not active")]
    TradingNotActive,
    
    #[msg("Invalid order type")]
    InvalidOrderType,
    
    #[msg("Invalid quantity")]
    InvalidQuantity,
    
    #[msg("Insufficient balance")]
    InsufficientBalance,
    
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    
    #[msg("Invalid market")]
    InvalidMarket,
    
    #[msg("Order not found")]
    OrderNotFound,
    
    #[msg("Order already filled")]
    OrderAlreadyFilled,
    
    #[msg("Order already cancelled")]
    OrderAlreadyCancelled,
    
    #[msg("Invalid order owner")]
    InvalidOrderOwner,
    
    #[msg("Trading time not started")]
    TradingNotStarted,
    
    #[msg("Trading time ended")]
    TradingEnded,
    
    #[msg("Insufficient remaining supply")]
    InsufficientRemainingSupply,
    
    #[msg("Invalid price")]
    InvalidPrice,
    
    #[msg("Invalid time range")]
    InvalidTimeRange,
    
    #[msg("Vault program mismatch")]
    VaultProgramMismatch,
    
    #[msg("CPI call failed")]
    CPICallFailed,
    
    #[msg("Token not mapped")]
    TokenNotMapped,
} 