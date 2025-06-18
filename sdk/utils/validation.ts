/**
 * Validation utilities
 */

import { PublicKey, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { SDKError, SDKErrorCode, SDKConfig } from "../types";

/**
 * Validate SDK configuration
 */
export function validateSDKConfig(config: SDKConfig): void {
    if (!config.rpcUrl) {
        throw new SDKError(SDKErrorCode.INVALID_CONFIG, "RPC URL is required");
    }

    if (!['devnet', 'mainnet', 'localnet'].includes(config.network)) {
        throw new SDKError(SDKErrorCode.INVALID_CONFIG, "Invalid network");
    }

    try {
        new PublicKey(config.vaultProgramId);
        new PublicKey(config.tradingProgramId);
    } catch (error) {
        throw new SDKError(SDKErrorCode.INVALID_CONFIG, "Invalid program IDs");
    }
}