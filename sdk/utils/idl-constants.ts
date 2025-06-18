/**
 * IDL Constants - Preloaded IDLs for browser compatibility
 * These constants replace file system reads with compile-time constants
 */

import type { EscrowVault } from "../types/escrow_vault";
import type { PremarketTrade } from "../types/premarket_trade";

// Import IDLs as JSON objects (these should be generated during build)
import EscrowVaultIDL from "../idl/escrow_vault.json";
import PremarketTradeIDL from "../idl/premarket_trade.json";

// Type-safe IDL exports
export const ESCROW_VAULT_IDL = EscrowVaultIDL as EscrowVault;
export const PREMARKET_TRADE_IDL = PremarketTradeIDL as PremarketTrade;

/**
 * IDL Registry - Maps IDL filename to actual IDL object
 */
export const IDL_REGISTRY = {
    'escrow_vault.json': ESCROW_VAULT_IDL,
    'premarket_trade.json': PREMARKET_TRADE_IDL,
} as const;

/**
 * Get IDL by filename
 */
export function getIdlByFileName(fileName: string) {
    return IDL_REGISTRY[fileName as keyof typeof IDL_REGISTRY];
}

/**
 * Type helper for IDL keys
 */
export type IdlFileName = keyof typeof IDL_REGISTRY; 