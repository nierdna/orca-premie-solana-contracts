/**
 * Orca Solana Premarket Trading SDK
 * 
 * Main entry point for the SDK
 */

// Export all types and utilities
export * from './types';
export * from './utils/constants';
export * from './utils/pda';
export * from './utils/token';
export * from './utils/validation';
export * from './utils/idl-constants';

// Export main clients
export { VaultClient } from './vault/vault-client';
export { TradingClient } from './trading/trading-client';

// Export operations
export * from './vault/vault-operations';
export * from './trading/trading-operations';

// Export core components
export { BaseClient } from './utils/base-client';

// Main SDK class
import * as anchor from "@coral-xyz/anchor";
import { VaultClient } from './vault/vault-client';
import { TradingClient } from './trading/trading-client';
import { SDKConfig } from './types';
import { DEFAULT_VAULT_PROGRAM_ID, DEFAULT_TRADING_PROGRAM_ID } from './utils/constants';
import { ESCROW_VAULT_IDL, PREMARKET_TRADE_IDL } from './utils/idl-constants';

/**
 * Main SDK class that provides access to both vault and trading operations
 */
export class OrcaSDK {
    public vault: VaultClient;
    public trading: TradingClient;

    constructor(config: SDKConfig) {
        this.vault = new VaultClient(config);
        this.trading = new TradingClient(config);
    }

    /**
     * Create SDK with default configuration
     */
    static create(options: {
        network: 'devnet' | 'mainnet' | 'localnet';
        rpcUrl?: string;
        vaultProgramId?: string;
        tradingProgramId?: string;
        usePreloadedIdls?: boolean;
    }): OrcaSDK {
        const networkConfigs = {
            devnet: 'https://api.devnet.solana.com',
            mainnet: 'https://api.mainnet-beta.solana.com',
            localnet: 'http://localhost:8899'
        };

        const config: SDKConfig = {
            network: options.network,
            rpcUrl: options.rpcUrl || networkConfigs[options.network],
            vaultProgramId: options.vaultProgramId ? new anchor.web3.PublicKey(options.vaultProgramId) : DEFAULT_VAULT_PROGRAM_ID,
            tradingProgramId: options.tradingProgramId ? new anchor.web3.PublicKey(options.tradingProgramId) : DEFAULT_TRADING_PROGRAM_ID,
        };

        // Add preloaded IDLs for browser compatibility if requested
        if (options.usePreloadedIdls !== false) { // Default to true
            config.preloadedIdls = {
                vaultIdl: ESCROW_VAULT_IDL,
                tradingIdl: PREMARKET_TRADE_IDL,
            };
        }

        return new OrcaSDK(config);
    }

    /**
     * Create SDK with custom preloaded IDLs (for advanced use cases)
     */
    static createWithCustomIdls(options: {
        network: 'devnet' | 'mainnet' | 'localnet';
        rpcUrl?: string;
        vaultProgramId?: string;
        tradingProgramId?: string;
        vaultIdl?: anchor.Idl;
        tradingIdl?: anchor.Idl;
    }): OrcaSDK {
        const networkConfigs = {
            devnet: 'https://api.devnet.solana.com',
            mainnet: 'https://api.mainnet-beta.solana.com',
            localnet: 'http://localhost:8899'
        };

        const config: SDKConfig = {
            network: options.network,
            rpcUrl: options.rpcUrl || networkConfigs[options.network],
            vaultProgramId: options.vaultProgramId ? new anchor.web3.PublicKey(options.vaultProgramId) : DEFAULT_VAULT_PROGRAM_ID,
            tradingProgramId: options.tradingProgramId ? new anchor.web3.PublicKey(options.tradingProgramId) : DEFAULT_TRADING_PROGRAM_ID,
            preloadedIdls: {
                vaultIdl: options.vaultIdl,
                tradingIdl: options.tradingIdl,
            },
        };

        return new OrcaSDK(config);
    }
}

// Version info
export const VERSION = "1.0.0"; 