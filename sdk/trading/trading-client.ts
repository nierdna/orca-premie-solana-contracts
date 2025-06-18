/**
 * Trading Client - Main interface for trading operations
 */

import * as anchor from "@coral-xyz/anchor";
import type { PremarketTrade } from "../types/premarket_trade";
import { BaseClient } from "../utils/base-client";
import { PREMARKET_TRADE_IDL } from "../utils/idl-constants";

export class TradingClient extends BaseClient<PremarketTrade> {
    /**
     * Get trading program instance with provider
     * Uses preloaded IDL for browser compatibility
     */
    async getProgram(provider: anchor.AnchorProvider): Promise<anchor.Program<PremarketTrade>> {
        // Try preloaded IDL from config first
        const preloadedIdl = this.config.preloadedIdls?.tradingIdl;
        if (preloadedIdl) {
            return this.loadProgramFromConfig(provider, this.config.tradingProgramId, preloadedIdl);
        }

        // Fallback to built-in IDL constant or filename
        return this.loadProgram(provider, this.config.tradingProgramId, PREMARKET_TRADE_IDL);
    }
} 