import { Connection, PublicKey, ConfirmedSignatureInfo, ParsedTransactionWithMeta } from '@solana/web3.js';
import { Program, Provider, EventParser, BorshCoder } from '@coral-xyz/anchor';
import { getMint } from '@solana/spl-token';
import tradingProgramIdl from '../target/idl/premarket_trade.json';
import 'dotenv/config';


// Log prefixes for consistent logging
const LOG_PREFIXES = {
    INFO: '[INFO]',
    EVENT: '[EVENT]',
    SLOT: '[SLOT]',
    DEBUG: '[DEBUG]',
    ERROR: '[ERROR]',
    SAVE: '[SAVE]',
} as const;

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Cache for mint info to reduce API calls
const mintInfoCache = new Map<string, { decimals: number; cachedAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get mint info with caching to reduce API calls
 * Cache mint decimals info since it rarely changes
 */
const getCachedMintInfo = async (connection: Connection, mintAddress: PublicKey): Promise<{ decimals: number }> => {
    const mintKey = mintAddress.toString();
    const now = Date.now();

    // Check if we have cached data that's still valid
    const cached = mintInfoCache.get(mintKey);
    if (cached && (now - cached.cachedAt) < CACHE_TTL) {
        return { decimals: cached.decimals };
    }

    try {
        // Fetch fresh mint info from Solana
        const mintInfo = await getMint(connection, mintAddress);

        // Cache the result
        mintInfoCache.set(mintKey, {
            decimals: mintInfo.decimals,
            cachedAt: now
        });

        return { decimals: mintInfo.decimals };
    } catch (error) {
        console.error(`${LOG_PREFIXES.ERROR} Failed to get mint info for ${mintKey}:`, error);

        // If we have stale cached data, use it as fallback
        if (cached) {
            console.log(`${LOG_PREFIXES.DEBUG} Using stale cache for ${mintKey}`);
            return { decimals: cached.decimals };
        }

        // Default to 6 decimals if all else fails (common for USDC-like tokens)
        console.log(`${LOG_PREFIXES.DEBUG} Using default 6 decimals for ${mintKey}`);
        return { decimals: 6 };
    }
};

/**
 * Clear mint info cache (useful for testing or manual cache invalidation)
 */
export const clearMintCache = () => {
    mintInfoCache.clear();
    console.log(`${LOG_PREFIXES.INFO} Mint info cache cleared`);
};

/**
 * Get cache stats for monitoring
 */
export const getMintCacheStats = () => {
    return {
        size: mintInfoCache.size,
        entries: Array.from(mintInfoCache.entries()).map(([mint, info]) => ({
            mint,
            decimals: info.decimals,
            cachedAt: new Date(info.cachedAt).toISOString(),
            ageMinutes: Math.round((Date.now() - info.cachedAt) / (1000 * 60))
        }))
    };
};

/**
 * Helper function to parse transaction and extract program events from parsed transaction using EventParser
 */
export const parseTransactionFromParsedTx = (
    parsedTx: ParsedTransactionWithMeta,
    signatureInfo: ConfirmedSignatureInfo,
    program?: Program<any> // Optional Anchor program for IDL parsing
): any => {
    if (!parsedTx || !parsedTx.meta || !parsedTx.meta.logMessages) return null;

    // Method 1: Use EventParser (best practice approach)
    if (program) {
        const eventParser = new EventParser(
            program.programId,
            new BorshCoder(program.idl)
        );

        const eventsData: any[] = [];
        try {
            // parseLogs returns a generator
            // @ts-ignore - EventParser types issue
            for (const event of eventParser.parseLogs(parsedTx.meta.logMessages)) {
                eventsData.push({
                    ...event,
                    signature: signatureInfo.signature,
                    slot: parsedTx.slot,
                    blockTime: parsedTx.blockTime,
                    txHash: parsedTx.transaction.signatures[0],
                });
            }

            if (eventsData.length > 0) {
                return {
                    signature: signatureInfo.signature,
                    slot: parsedTx.slot,
                    blockTime: parsedTx.blockTime,
                    events: eventsData,
                };
            }
        } catch (error) {
            console.log(`EventParser failed for ${signatureInfo.signature}:`, error);
            // Continue to fallback parsing
        }
    }

};

/**
 * Helper function to parse transaction and extract program events using EventParser
 */
export const parseTransactionForEvents = async (
    connection: Connection,
    signature: string,
    program?: Program<any> // Optional Anchor program for IDL parsing
): Promise<any[]> => {
    const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
    });

    console.log("   ✅ tx", tx);

    if (!tx || !tx.meta || !tx.meta.logMessages) return [];

    // Method 1: Use EventParser (best practice approach)
    if (program) {
        const eventParser = new EventParser(
            program.programId,
            new BorshCoder(program.idl)
        );

        console.log("   ✅ eventParser", eventParser);

        const eventsData: any[] = [];
        try {
            // parseLogs returns a generator
            // @ts-ignore - EventParser types issue
            for (const event of eventParser.parseLogs(tx.meta.logMessages)) {
                eventsData.push({
                    ...event,
                    signature,
                    slot: tx.slot,
                    blockTime: tx.blockTime,
                    tx_hash: tx.transaction.signatures[0],
                    source: 'eventparser',
                });
            }

            if (eventsData.length > 0) {
                console.log("   ✅", eventsData);
                return eventsData;
            }
        } catch (error) {
            console.log(`EventParser failed for ${signature}:`, error);
            // Continue to fallback parsing
        }
    }

    return [];
};

/**
 * Single-iteration streaming with external processed signatures check
 * Nhận lastSignatureProcessed, chạy 1 vòng, update lastSignatureProcessed cho lần kế tiếp
 * 
 * @param connection Solana connection
 * @param programId Program ID to monitor
 * @param lastSignatureProcessed Signature đã processed lần trước (dùng làm until cursor)
 * @param checkProcessedSignatures External function để check signatures đã processed
 * @param onTransaction Callback for each new transaction
 * @param batchSize Number of signatures to fetch (max 1000)
 * @param commitment Commitment level
 * @returns Updated lastSignatureProcessed for next iteration
 */
export const streamSolanaSingleIteration = async <TFormattedEvent>({
    connection,
    programId,
    lastSignatureProcessed,
    checkProcessedSignatures,
    onTransaction,
    batchSize = 100,
    commitment = 'confirmed',
    program,
}: {
    connection: Connection;
    programId: PublicKey;
    lastSignatureProcessed?: string;
        checkProcessedSignatures: (signatures: string[]) => Promise<string[]> | string[];
    onTransaction: (event: TFormattedEvent) => Promise<void>;
    batchSize?: number;
    commitment?: 'processed' | 'confirmed' | 'finalized';
    program?: Program<any>; // Optional Anchor program for IDL parsing
}): Promise<string | undefined> => {
    const debugEnabled = process.env.DEBUG_STREAM_SOLANA === "1";

    try {
        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.INFO} Starting single iteration stream`);
            console.log(`${LOG_PREFIXES.INFO} Program ID: ${programId.toString()}`);
            console.log(`${LOG_PREFIXES.INFO} Last processed: ${lastSignatureProcessed || 'None'}`);
            console.log(`${LOG_PREFIXES.INFO} Batch size: ${batchSize}`);
        }

        // Query signatures từ Solana
        const queryOptions: any = {
            limit: Math.min(batchSize, 1000), // Solana max limit
            commitment,
        };

        // Nếu có lastSignatureProcessed, dùng làm until cursor
        if (lastSignatureProcessed) {
            queryOptions.until = lastSignatureProcessed;
        }

        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.DEBUG} Query options:`, queryOptions);
        }

        // Lấy signatures mới từ Solana
        const allSignatures = await connection.getSignaturesForAddress(programId, queryOptions);

        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.EVENT} Fetched ${allSignatures.length} signatures from Solana`);
        }

        // Nếu không có signatures mới, return undefined
        if (allSignatures.length === 0) {
            if (debugEnabled) {
                console.log(`${LOG_PREFIXES.DEBUG} No new signatures found`);
            }
            return lastSignatureProcessed;
        }

        // Extract signature strings để check với external function
        const signatureStrings = allSignatures.map(sig => sig.signature);

        // Check signatures đã processed từ external source
        const processedSignatures = await Promise.resolve(checkProcessedSignatures(signatureStrings));
        const processedSet = new Set(processedSignatures);

        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.DEBUG} Already processed signatures: ${processedSignatures.length}/${signatureStrings.length}`);
        }

        // Filter out signatures đã processed và failed transactions
        const newSignatures = allSignatures.filter(sig =>
            !processedSet.has(sig.signature) && !sig.err
        );

        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.EVENT} New signatures to process: ${newSignatures.length}`);
        }

        // Nếu không có signatures mới để process
        if (newSignatures.length === 0) {
            // Vẫn update lastSignatureProcessed = newest signature from query
            const newestSignature = allSignatures[0]?.signature;
            if (debugEnabled && newestSignature) {
                console.log(`${LOG_PREFIXES.DEBUG} No new signatures to process, updating cursor to: ${newestSignature}`);
            }
            return newestSignature || lastSignatureProcessed;
        }

        // Process signatures theo thứ tự chronological (oldest first)
        // Solana trả về newest → oldest, nên cần reverse
        const orderedSignatures = newSignatures.reverse();

        let latestProcessedSignature: string | undefined;
        let processedCount = 0;

        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.EVENT} Batch processing ${orderedSignatures.length} signatures`);
        }

        try {
            // Batch fetch parsed transactions
            const signatureStringsToProcess = orderedSignatures.map(sig => sig.signature);
            const parsedTransactions = await connection.getParsedTransactions(signatureStringsToProcess, {
                maxSupportedTransactionVersion: 0,
            });

            if (debugEnabled) {
                console.log(`${LOG_PREFIXES.DEBUG} Fetched ${parsedTransactions.length} parsed transactions`);
            }

            // Process each transaction with its corresponding signature info
            for (let i = 0; i < parsedTransactions.length; i++) {
                const parsedTx = parsedTransactions[i];
                const signatureInfo = orderedSignatures[i];

                if (debugEnabled) {
                    console.log(`${LOG_PREFIXES.EVENT} Processing signature: ${signatureInfo.signature}`);
                }

                try {
                    // Skip if transaction is null or failed
                    if (!parsedTx || !parsedTx.meta) {
                        if (debugEnabled) {
                            console.log(`${LOG_PREFIXES.DEBUG} Skipping null/failed transaction: ${signatureInfo.signature}`);
                        }
                        latestProcessedSignature = signatureInfo.signature;
                        continue;
                    }

                    // Parse events from this transaction
                    const formattedEvent = parseTransactionFromParsedTx(parsedTx, signatureInfo, program);

                    if (formattedEvent) {
                        // Call onTransaction callback
                        await onTransaction(formattedEvent);
                        processedCount++;
                    }

                    // Track latest processed signature
                    latestProcessedSignature = signatureInfo.signature;

                } catch (error) {
                    console.error(`${LOG_PREFIXES.ERROR} Error processing signature ${signatureInfo.signature}:`, error);
                    // Continue processing other signatures
                    latestProcessedSignature = signatureInfo.signature;
                }
            }

        } catch (error) {
            console.error(`${LOG_PREFIXES.ERROR} Error batch fetching transactions:`, error);

            // Fallback to individual processing if batch fails
            if (debugEnabled) {
                console.log(`${LOG_PREFIXES.DEBUG} Falling back to individual transaction processing`);
            }


        }

        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.INFO} Successfully processed ${processedCount} transactions`);
            console.log(`${LOG_PREFIXES.INFO} Latest processed signature: ${latestProcessedSignature}`);
        }

        // Return newest signature from the batch (cho next iteration)
        // Solana signatures are sorted newest first, so allSignatures[0] is newest
        const newestSignature = allSignatures[0].signature;

        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.SAVE} Returning newest signature for next iteration: ${newestSignature}`);
        }

        return newestSignature;

    } catch (error) {
        console.error(`${LOG_PREFIXES.ERROR} Error in streamSolanaSingleIteration:`, error);
        // Return current cursor to not lose progress
        return lastSignatureProcessed;
    }
};

/**
 * Continuous streaming using single iteration approach
 * Sử dụng streamSolanaSingleIteration trong loop với sleep
 */
export const streamSolanaContinuous = async <TFormattedEvent>({
    connection,
    programId,
    initialLastSignature,
    checkProcessedSignatures,
    onTransaction,
    saveLastSignature,
    batchSize = 100,
    sleepTime = 5000,
    commitment = 'confirmed',
    shouldContinue,
    program,
}: {
    connection: Connection;
    programId: PublicKey;
    initialLastSignature?: string;
        checkProcessedSignatures: (signatures: string[]) => Promise<string[]> | string[];
    onTransaction: (event: TFormattedEvent) => Promise<void>;
    saveLastSignature: (signature: string) => Promise<void>;
    batchSize?: number;
    sleepTime?: number;
    commitment?: 'processed' | 'confirmed' | 'finalized';
    shouldContinue?: () => Promise<boolean> | boolean;
    program?: Program<any>; // Optional Anchor program for IDL parsing
}): Promise<void> => {
    const debugEnabled = process.env.DEBUG_STREAM_SOLANA === "1";
    let lastSignatureProcessed = initialLastSignature;

    if (debugEnabled) {
        console.log(`${LOG_PREFIXES.INFO} Starting continuous streaming`);
        console.log(`${LOG_PREFIXES.INFO} Initial last signature: ${lastSignatureProcessed || 'None'}`);
    }

    while (true) {
        try {
            // Check if we should continue
            if (shouldContinue) {
                const continueStreaming = await Promise.resolve(shouldContinue());
                if (!continueStreaming) {
                    if (debugEnabled) {
                        console.log(`${LOG_PREFIXES.INFO} Streaming stopped by shouldContinue function`);
                    }
                    return;
                }
            }

            // Run single iteration
            const newLastSignature = await streamSolanaSingleIteration({
                connection,
                programId,
                lastSignatureProcessed,
                checkProcessedSignatures,
                onTransaction,
                batchSize,
                commitment,
                program,
            });

            // Update lastSignatureProcessed for next iteration
            if (newLastSignature && newLastSignature !== lastSignatureProcessed) {
                lastSignatureProcessed = newLastSignature;

                // Save to external storage
                await saveLastSignature(lastSignatureProcessed);

                if (debugEnabled) {
                    console.log(`${LOG_PREFIXES.SAVE} Updated last signature: ${lastSignatureProcessed}`);
                }
            }

            // Sleep before next iteration
            await sleep(sleepTime);

        } catch (error) {
            console.error(`${LOG_PREFIXES.ERROR} Error in continuous streaming:`, error);
            await sleep(1000); // Short sleep before retry
        }
    }
};

class ClientProvider implements Provider {
    connection: Connection;
    constructor(connection: Connection) {
        this.connection = connection;
    }
}

/**
 * Example usage for premarket trading
 */
export const streamPremarketWithExternalCheck = async () => {
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
    const TRADING_PROGRAM_ID = new PublicKey('Amj2QtxyLr6GMgBzN2pB5qaq5V8J7jTBrqc4Ar7y4G5t');

    // Example external check function (database, cache, etc.)
    const checkProcessedSignatures = async (signatures: string[]) => {
        // Giả sử check từ database
        // return await db.getProcessedSignatures(signatures);

        // Mock implementation
        console.log(`Checking ${signatures.length} signatures against database...`);

        // Giả sử 20% signatures đã processed
        const processed = signatures.filter(() => Math.random() < 0.2);
        return processed;
    };

    const tradingProgram = new Program(tradingProgramIdl as any, TRADING_PROGRAM_ID, new ClientProvider(connection));

    // Example onTransaction callback
    const onTransaction = async (transaction: any) => {
        console.log(`   ✅ Found transaction: ${JSON.stringify(transaction, null, 2)}`);

        // Format the event with proper decimals
        const formattedTransaction = await formatEvent(transaction, connection);
        console.log(`   🔄 Formatted transaction: ${JSON.stringify(formattedTransaction, null, 2)}`);
    };

    // Example save function
    const saveLastSignature = async (signature: string) => {
        console.log(`Saving last processed signature: ${signature}`);
        // await db.saveLastSignature(signature);
    };

    // Start streaming
    // await streamSolanaContinuous({
    //     connection,
    //     programId: TRADING_PROGRAM_ID,
    //     initialLastSignature: undefined, // Start from latest
    //     checkProcessedSignatures,
    //     onTransaction,
    //     saveLastSignature,
    //     batchSize: 50,
    //     sleepTime: 3000,
    //     commitment: 'confirmed',
    //     shouldContinue: () => true, // Run indefinitely
    // });
    const lastSignature = await streamSolanaSingleIteration({
        connection,
        programId: TRADING_PROGRAM_ID,
        checkProcessedSignatures,
        onTransaction,
        batchSize: 1,
        commitment: 'confirmed',
        program: tradingProgram,
    });

    console.log('Last signature:', lastSignature);
};

/**
 * Format event data with proper decimal conversion
 * Dùng SPL token để lấy decimals của collateralMint
 */
export const formatEvent = async (event: any, connection: Connection) => {
    try {
        // If event doesn't have data or required fields, return original
        if (!event.data || !event.data.collateralMint) {
            return {
                ...event,
                signature: event.signature,
                slot: event.slot,
            };
        }

        const data = event.data;

        // Get collateral mint info to determine decimals (with caching)
        const collateralMintPubkey = new PublicKey(data.collateralMint);
        const mintInfo = await getCachedMintInfo(connection, collateralMintPubkey);
        const decimals = mintInfo.decimals;

        // Parse hex values to numbers and format according to requirements
        const formattedData = {
            ...data,
            // price = price.toNumber() / 10 ** 6
            price: data.price ? parseInt(data.price, 16) / Math.pow(10, 6) : data.price,

            // filledAmount = filledAmount.toNumber() / 10 ** 6  
            filledAmount: data.filledAmount ? parseInt(data.filledAmount, 16) / Math.pow(10, 6) : data.filledAmount,

            // buyerCollateral = buyerCollateral.toNumber() / 10 ** decimals
            buyerCollateral: data.buyerCollateral ? parseInt(data.buyerCollateral, 16) / Math.pow(10, decimals) : data.buyerCollateral,

            // sellerCollateral = sellerCollateral.toNumber() / 10 ** decimals
            sellerCollateral: data.sellerCollateral ? parseInt(data.sellerCollateral, 16) / Math.pow(10, decimals) : data.sellerCollateral,

            // matchTime = matchTime.toNumber()
            matchTime: data.matchTime ? parseInt(data.matchTime, 16) : data.matchTime,
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
            formatError: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}


if (require.main === module) {
    streamPremarketWithExternalCheck().then().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}