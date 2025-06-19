import { Connection, PublicKey } from "@solana/web3.js";
import { getCachedMintInfo } from "./get-decimals";
import { LOG_PREFIXES } from "./logs";

/**
 * Format event data with proper decimal conversion
 * Dùng SPL token để lấy decimals của collateralMint
 */
export const formatEvent = async (event: any, connection: Connection) => {
    try {
        // If event doesn't have data or required fields, return original
        if (
            !event.data ||
            !event.data.collateralMint ||
            event.name !== "OrdersMatched"
        ) {
            return {
                ...event,
                signature: event.signature,
                slot: event.slot,
            };
        }

        const data = {
            ...event.data,
            tokenId: event.data.tokenId.toString(),
            tradeId: event.data.tradeId.toString(),
            buyOrderHash: event.data.buyOrderHash.toString(),
            sellOrderHash: event.data.sellOrderHash.toString(),
            targetTokenId: event.data.tokenId.toString(),
            collateralMint: event.data.collateralMint.toString(),
            buyer: event.data.buyer.toString(),
            seller: event.data.seller.toString(),
        };

        // Get collateral mint info to determine decimals (with caching)
        const collateralMintPubkey = new PublicKey(data.collateralMint);
        const mintInfo = await getCachedMintInfo(connection, collateralMintPubkey);
        const decimals = mintInfo.decimals;

        // Parse hex values to numbers and format according to requirements
        const formattedData = {
            ...data,
            // price = price.toNumber() / 10 ** 6
            price: data.price ? data.price.toNumber() / Math.pow(10, 6) : data.price,

            // filledAmount = filledAmount.toNumber() / 10 ** 6
            filledAmount: data.filledAmount
                ? data.filledAmount.toNumber() / Math.pow(10, 6)
                : data.filledAmount,

            // buyerCollateral = buyerCollateral.toNumber() / 10 ** decimals
            buyerCollateral: data.buyerCollateral
                ? data.buyerCollateral.toNumber() / Math.pow(10, decimals)
                : data.buyerCollateral,

            // sellerCollateral = sellerCollateral.toNumber() / 10 ** decimals
            sellerCollateral: data.sellerCollateral
                ? data.sellerCollateral.toNumber() / Math.pow(10, decimals)
                : data.sellerCollateral,

            // matchTime = matchTime.toNumber()
            matchTime: data.matchTime ? data.matchTime.toNumber() : data.matchTime,
        };

        return {
            ...event,
            data: formattedData,
            signature: event.signature,
            slot: event.slot,
            // Add decimals info for reference
            collateralDecimals: decimals,
        };
    } catch (error) {
        console.error(`${LOG_PREFIXES.ERROR} Error formatting event:`, error);
        // Return original event if formatting fails
        return {
            ...event,
            signature: event.signature,
            slot: event.slot,
            formatError: error instanceof Error ? error.message : "Unknown error",
        };
    }
};