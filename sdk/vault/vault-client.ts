/**
 * Vault Client - Main interface for vault operations
 */

import * as anchor from "@coral-xyz/anchor";
import type { EscrowVault } from "../types/escrow_vault";
import { BaseClient } from "../utils/base-client";
import { ESCROW_VAULT_IDL } from "../utils/idl-constants";

export class VaultClient extends BaseClient<EscrowVault> {
    /**
     * Get vault program instance with provider
     * Uses preloaded IDL for browser compatibility
     */
    async getProgram(provider: anchor.AnchorProvider): Promise<anchor.Program<EscrowVault>> {
        // Try preloaded IDL from config first
        const preloadedIdl = this.config.preloadedIdls?.vaultIdl;
        if (preloadedIdl) {
            return this.loadProgramFromConfig(provider, this.config.vaultProgramId, preloadedIdl);
        }

        // Fallback to built-in IDL constant or filename
        return this.loadProgram(provider, this.config.vaultProgramId, ESCROW_VAULT_IDL);
    }
} 