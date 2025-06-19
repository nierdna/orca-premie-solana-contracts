import { Connection, PublicKey } from "@solana/web3.js";
import { LOG_PREFIXES } from "./logs";
import { getMint } from "@solana/spl-token";

const mintInfoCache = new Map<string, { decimals: number; cachedAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Clear mint info cache (useful for testing or manual cache invalidation)
 */
export const clearMintCache = () => {
    mintInfoCache.clear();
    console.log(`${LOG_PREFIXES.INFO} Mint info cache cleared`);
};

/**
 * Get mint info with caching to reduce API calls
 * Cache mint decimals info since it rarely changes
 */
export const getCachedMintInfo = async (
    connection: Connection,
    mintAddress: PublicKey
): Promise<{ decimals: number }> => {
    const mintKey = mintAddress.toString();
    const now = Date.now();

    // Check if we have cached data that's still valid
    const cached = mintInfoCache.get(mintKey);
    if (cached && now - cached.cachedAt < CACHE_TTL) {
        return { decimals: cached.decimals };
    }

    try {
        // Fetch fresh mint info from Solana
        const mintInfo = await getMint(connection, mintAddress);

        // Cache the result
        mintInfoCache.set(mintKey, {
            decimals: mintInfo.decimals,
            cachedAt: now,
        });

        return { decimals: mintInfo.decimals };
    } catch (error) {
        console.error(
            `${LOG_PREFIXES.ERROR} Failed to get mint info for ${mintKey}:`,
            error
        );

        // If we have stale cached data, use it as fallback
        if (cached) {
            console.log(`${LOG_PREFIXES.DEBUG} Using stale cache for ${mintKey}`);
            return { decimals: cached.decimals };
        }

        // Default to 6 decimals if all else fails (common for USDC-like tokens)
        console.log(
            `${LOG_PREFIXES.DEBUG} Using default 6 decimals for ${mintKey}`
        );
        return { decimals: 6 };
    }
};