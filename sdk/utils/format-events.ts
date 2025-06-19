import { Connection, PublicKey } from "@solana/web3.js";
import { getCachedMintInfo } from "./get-decimals";
import { LOG_PREFIXES } from "./logs";

/**
 * Type definition cho event formatter functions
 */
type EventFormatter = (event: any, data: any, connection: Connection) => Promise<any>;

/**
 * Mapping object cho các event formatters
 */
const EVENT_FORMATTERS: Record<string, EventFormatter> = {
    "OrdersMatched": formatOrdersMatchedEvent,
    "TokenMarketCreated": formatTokenMarketCreatedEvent,
    "TokenMapped": formatTokenMappedEvent,
    "TradeSettled": formatTradeSettledEvent,
    "OrderCancelled": formatOrderCancelledEvent,
    "TradeCancelled": formatTradeCancelledEvent,
};

/**
 * Format event data with proper decimal conversion
 * Sử dụng mapping object thay vì switch case để tránh trùng lặp
 */
export const formatEvent = async (event: any, connection: Connection) => {
    try {
        // If event doesn't have data or required fields, return original
        if (!event.data || !event.name) {
            return {
                ...event,
                signature: event.signature,
                slot: event.slot,
            };
        }

        const data = {
            ...event.data,
        };

        // Convert PublicKey objects to strings for all events
        Object.keys(data).forEach(key => {
            if (data[key] && typeof data[key] === 'object' && data[key].toString && data[key] instanceof PublicKey) {
                data[key] = data[key].toString();
            }
        });

        // Get formatter function for this event type
        const formatter = EVENT_FORMATTERS[event.name];

        if (formatter) {
            // Use specific formatter
            return await formatter(event, data, connection);
        } else {
            // For unknown events, just return with basic formatting
            return {
                ...event,
                data,
                signature: event.signature,
                slot: event.slot,
            };
        }
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

/**
 * Format OrdersMatched event với decimal conversion
 */
async function formatOrdersMatchedEvent(event: any, data: any, connection: Connection) {
    if (!data.collateralMint) {
        return createFormattedEvent(event, data);
    }

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
}

/**
 * Format TokenMarketCreated event
 */
async function formatTokenMarketCreatedEvent(event: any, data: any, connection: Connection) {
    const formattedData = {
        ...data,
        // settleTimeLimit và createdAt đã là numbers từ IDL
        settleTimeLimit: data.settleTimeLimit,
        createdAt: data.createdAt ? data.createdAt.toNumber() : data.createdAt,
    };

    return createFormattedEvent(event, formattedData);
}

/**
 * Format TokenMapped event
 */
async function formatTokenMappedEvent(event: any, data: any, connection: Connection) {
    const formattedData = {
        ...data,
        mappingTime: data.mappingTime ? data.mappingTime.toNumber() : data.mappingTime,
    };

    return createFormattedEvent(event, formattedData);
}

/**
 * Format TradeSettled event với decimal conversion
 */
async function formatTradeSettledEvent(event: any, data: any, connection: Connection) {
    // Default decimals if no specific collateral mint info
    let decimals = 6; // USDC default

    // Try to get decimals from targetMint if available
    if (data.targetMint) {
        try {
            const targetMintPubkey = new PublicKey(data.targetMint);
            const mintInfo = await getCachedMintInfo(connection, targetMintPubkey);
            decimals = mintInfo.decimals;
        } catch (error) {
            console.warn(`${LOG_PREFIXES.DEBUG} Could not get mint info for targetMint:`, error);
        }
    }

    const formattedData = {
        ...data,
        // filledAmount với decimals của target token
        filledAmount: data.filledAmount
            ? data.filledAmount.toNumber() / Math.pow(10, decimals)
            : data.filledAmount,

        // sellerReward với decimals của collateral (thường là USDC = 6)
        sellerReward: data.sellerReward
            ? data.sellerReward.toNumber() / Math.pow(10, 6)
            : data.sellerReward,

        settlementTime: data.settlementTime ? data.settlementTime.toNumber() : data.settlementTime,
    };

    return {
        ...event,
        data: formattedData,
        signature: event.signature,
        slot: event.slot,
        targetTokenDecimals: decimals,
    };
}

/**
 * Format OrderCancelled event với decimal conversion
 */
async function formatOrderCancelledEvent(event: any, data: any, connection: Connection) {
    // Default to USDC decimals
    const decimals = 6;

    const formattedData = {
        ...data,
        // Convert orderHash array to hex string
        orderHash: Array.isArray(data.orderHash)
            ? '0x' + data.orderHash.map((b: number) => b.toString(16).padStart(2, '0')).join('')
            : data.orderHash,

        // collateralReleased với decimals
        collateralReleased: data.collateralReleased
            ? data.collateralReleased.toNumber() / Math.pow(10, decimals)
            : data.collateralReleased,

        cancellationTime: data.cancellationTime ? data.cancellationTime.toNumber() : data.cancellationTime,
    };

    return {
        ...event,
        data: formattedData,
        signature: event.signature,
        slot: event.slot,
        collateralDecimals: decimals,
    };
}

/**
 * Format TradeCancelled event với decimal conversion
 */
async function formatTradeCancelledEvent(event: any, data: any, connection: Connection) {
    // Default to USDC decimals
    let decimals = 6;

    // Try to get decimals from targetMint if available
    if (data.collateralMint) {
        try {
            const collateralMint = new PublicKey(data.collateralMint);
            const mintInfo = await getCachedMintInfo(connection, collateralMint);
            decimals = mintInfo.decimals;
        } catch (error) {
            console.warn(`${LOG_PREFIXES.DEBUG} Could not get mint info for collateralMint:`, error);
        }
    }

    const formattedData = {
        ...data,
        // penaltyAmount với decimals
        penaltyAmount: data.penaltyAmount
            ? data.penaltyAmount.toNumber() / Math.pow(10, decimals)
            : data.penaltyAmount,

        cancellationTime: data.cancellationTime ? data.cancellationTime.toNumber() : data.cancellationTime,
    };

    return {
        ...event,
        data: formattedData,
        signature: event.signature,
        slot: event.slot,
        collateralDecimals: decimals,
    };
}

/**
 * Helper function để tạo formatted event với cấu trúc chuẩn
 */
function createFormattedEvent(event: any, formattedData: any, extraFields?: Record<string, any>) {
    return {
        ...event,
        data: formattedData,
        signature: event.signature,
        slot: event.slot,
        ...extraFields,
    };
}

/**
 * Helper function để register thêm event formatter
 * Useful cho extending functionality
 */
export function registerEventFormatter(eventName: string, formatter: EventFormatter) {
    EVENT_FORMATTERS[eventName] = formatter;
}