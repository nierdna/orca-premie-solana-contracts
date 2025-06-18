/**
 * Orca Solana Premarket Trading SDK Types
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";

// Re-export Anchor generated types
// @ts-ignore
export type { EscrowVault } from "../types/escrow_vault";
// @ts-ignore
export type { PremarketTrade } from "../types/premarket_trade";

// Re-export wallet types
export * from './wallet';

// Re-export IDL types
export type { IdlFileName } from '../utils/idl-constants';

// ===== Core SDK Types =====
export interface SDKConfig {
    network: 'devnet' | 'mainnet' | 'localnet';
    rpcUrl: string;
    vaultProgramId: PublicKey;
    tradingProgramId: PublicKey;
    // Optional: Preloaded IDLs for better browser compatibility
    preloadedIdls?: {
        vaultIdl?: anchor.Idl;
        tradingIdl?: anchor.Idl;
    };
}

/**
 * Operation context that includes wallet and transaction options
 */
export interface OperationContext {
    wallet: import('./wallet').WalletSigner;
    skipPreflight?: boolean;
    commitment?: anchor.web3.Commitment;
}

export interface WalletKeypair {
    keypair: Keypair;
    publicKey: PublicKey;
}

// ===== Vault Operation Types =====
export interface DepositParams {
    tokenMint: PublicKey;
    amount: anchor.BN;
}

export interface WithdrawParams {
    tokenMint: PublicKey;
    amount: anchor.BN;
}

export interface InitializeVaultParams {
    admin: PublicKey;
    emergencyAdmin: PublicKey;
}

// ===== Trading Operation Types =====
export interface TokenMarketParams {
    symbol: string;
    name: string;
    settleTimeLimit: number;
}

export interface MapTokenParams {
    tokenMarket: PublicKey;
    realMint: PublicKey;
}

// ===== Order Types =====
export interface PreOrder {
    trader: PublicKey | string;
    collateralToken: PublicKey | string;
    tokenId: PublicKey | string; // TokenMarket address
    amount: anchor.BN | number;
    price: anchor.BN | number;
    isBuy: boolean;
    nonce: anchor.BN | number;
    deadline: anchor.BN | number;
}

export interface OrderSignature {
    signature: number[];
    publicKey: PublicKey;
}

export interface MatchOrdersParams {
    buyOrder: PreOrder;
    sellOrder: PreOrder;
    fillAmount?: anchor.BN | number;
}

// ===== Result Types =====
export interface TransactionResult {
    signature: string;
    slot?: number;
    blockTime?: number;
    fee?: number;
}

export interface VaultInitResult extends TransactionResult {
    vaultConfigPDA: PublicKey;
    admin: PublicKey;
    emergencyAdmin: PublicKey;
}

export interface TradingInitResult extends TransactionResult {
    tradeConfigPDA: PublicKey;
    vaultProgram: PublicKey;
}

export interface TokenMarketResult extends TransactionResult {
    tokenMarket: PublicKey;
    symbol: string;
    name: string;
}

export interface TradeMatchResult extends TransactionResult {
    tradeRecord: PublicKey;
    buyTrader: PublicKey;
    sellTrader: PublicKey;
    amount: anchor.BN;
    price: anchor.BN;
}

// ===== Error Types =====
export enum SDKErrorCode {
    INVALID_CONFIG = 'INVALID_CONFIG',
    KEYPAIR_LOAD_FAILED = 'KEYPAIR_LOAD_FAILED',
    PROGRAM_LOAD_FAILED = 'PROGRAM_LOAD_FAILED',
    ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    UNAUTHORIZED = 'UNAUTHORIZED',
    ALREADY_INITIALIZED = 'ALREADY_INITIALIZED',
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
    SIMULATION_FAILED = 'SIMULATION_FAILED',
}

export class SDKError extends Error {
    public details?: any;
    public logs?: string[];
    public programId?: string;
    public errorCode?: number;
    public errorName?: string;

    constructor(
        public code: SDKErrorCode,
        public message: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'SDKError';

        // Preserve stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SDKError);
        }
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(): string {
        // Import getUserFriendlyMessage function dynamically to avoid circular dependency
        const { getUserFriendlyMessage } = require('../utils/error-handler');
        return getUserFriendlyMessage(this);
    }

    /**
     * Check if this error is retryable
     */
    isRetryable(): boolean {
        // Import isRetryableError function dynamically to avoid circular dependency
        const { isRetryableError } = require('../utils/error-handler');
        return isRetryableError(this);
    }

    /**
     * Get error as JSON for logging
     */
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details,
            logs: this.logs,
            programId: this.programId,
            errorCode: this.errorCode,
            errorName: this.errorName,
            stack: this.stack
        };
    }
}

// ===== Configuration Types =====
export interface EconomicConfig {
    buyerCollateralRatio: number;
    sellerCollateralRatio: number;
    sellerRewardBps: number;
    latePenaltyBps: number;
    minimumFillAmount: anchor.BN;
    maximumOrderAmount: anchor.BN;
}

export interface TechnicalConfig {
    minSettleTime: number;
    maxSettleTime: number;
} 