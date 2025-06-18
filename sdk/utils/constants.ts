/**
 * SDK Constants
 */

import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// Program IDs - update these with your actual deployed program IDs
export const DEFAULT_VAULT_PROGRAM_ID = new PublicKey('a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE');
export const DEFAULT_TRADING_PROGRAM_ID = new PublicKey('Amj2QtxyLr6GMgBzN2pB5qaq5V8J7jTBrqc4Ar7y4G5t');

// Common token mints
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const TEST_TOKEN_MINT = new PublicKey("5FPTnHuxwyqSpuRdjQwaemi8YoW5KT7CeMWQ55v6mCef");

// Price and amount scales
export const PRICE_SCALE = 1_000_000; // 6 decimals
export const AMOUNT_SCALE = 1_000_000; // 6 decimals

// Default configuration values
export const DEFAULT_ECONOMIC_CONFIG = {
    buyerCollateralRatio: 10000,
    sellerCollateralRatio: 10000,
    sellerRewardBps: 0,
    latePenaltyBps: 10000,
    minimumFillAmount: new anchor.BN(1000),
    maximumOrderAmount: new anchor.BN(1000000000000),
};

export const DEFAULT_TECHNICAL_CONFIG = {
    minSettleTime: 30, // 30 seconds
    maxSettleTime: 2592000, // 30 days
};

// PDA Seeds
export const VAULT_CONFIG_SEED = "vault_config";
export const USER_BALANCE_SEED = "user_balance";
export const VAULT_AUTHORITY_SEED = "vault_authority";
export const TRADE_CONFIG_SEED = "trade_config";
export const ORDER_STATUS_SEED = "order_status";

// Network configurations
export const NETWORK_CONFIGS = {
    devnet: {
        rpcUrl: 'https://api.devnet.solana.com',
        commitment: 'confirmed' as const,
    },
    mainnet: {
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        commitment: 'confirmed' as const,
    },
    localnet: {
        rpcUrl: 'http://localhost:8899',
        commitment: 'confirmed' as const,
    },
};

// Time constants
export const SECONDS_IN_HOUR = 3600;
export const SECONDS_IN_DAY = 86400;
export const SECONDS_IN_WEEK = 604800; 