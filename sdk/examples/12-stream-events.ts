import {
    Connection,
    PublicKey,
} from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import tradingProgramIdl from "../idl/premarket_trade.json";
import "dotenv/config";
import { OrderMatchedEvent } from "../types/events";
import { LOG_PREFIXES } from "../utils/logs";
import { formatEvent } from "../utils/format-events";
import { ClientProvider } from "../utils/client-provider";
import { parseTransactionFromParsedTx } from "../utils/parse-transaction";

// Sleep utility
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    commitment = "confirmed",
    program,
}: {
    connection: Connection;
    programId: PublicKey;
    lastSignatureProcessed?: string;
    checkProcessedSignatures: (
        signatures: string[]
    ) => Promise<string[]> | string[];
    onTransaction: (event: TFormattedEvent) => Promise<void>;
    batchSize?: number;
    commitment?: "processed" | "confirmed" | "finalized";
    program?: Program<any>; // Optional Anchor program for IDL parsing
}): Promise<string | undefined> => {
    const debugEnabled = process.env.DEBUG_STREAM_SOLANA === "1";

    try {
        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.INFO} Starting single iteration stream`);
            console.log(`${LOG_PREFIXES.INFO} Program ID: ${programId.toString()}`);
            console.log(
                `${LOG_PREFIXES.INFO} Last processed: ${lastSignatureProcessed || "None"
                }`
            );
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
        const allSignatures = await connection.getSignaturesForAddress(
            programId,
            queryOptions
        );

        if (debugEnabled) {
            console.log(
                `${LOG_PREFIXES.EVENT} Fetched ${allSignatures.length} signatures from Solana`
            );
        }

        // Nếu không có signatures mới, return undefined
        if (allSignatures.length === 0) {
            if (debugEnabled) {
                console.log(`${LOG_PREFIXES.DEBUG} No new signatures found`);
            }
            return lastSignatureProcessed;
        }

        // Extract signature strings để check với external function
        const signatureStrings = allSignatures.map((sig) => sig.signature);

        // Check signatures đã processed từ external source
        const processedSignatures = await Promise.resolve(
            checkProcessedSignatures(signatureStrings)
        );
        const processedSet = new Set(processedSignatures);

        if (debugEnabled) {
            console.log(
                `${LOG_PREFIXES.DEBUG} Already processed signatures: ${processedSignatures.length}/${signatureStrings.length}`
            );
        }

        // Filter out signatures đã processed và failed transactions
        const newSignatures = allSignatures.filter(
            (sig) => !processedSet.has(sig.signature) && !sig.err
        );

        if (debugEnabled) {
            console.log(
                `${LOG_PREFIXES.EVENT} New signatures to process: ${newSignatures.length}`
            );
        }

        // Nếu không có signatures mới để process
        if (newSignatures.length === 0) {
            // Vẫn update lastSignatureProcessed = newest signature from query
            const newestSignature = allSignatures[0]?.signature;
            if (debugEnabled && newestSignature) {
                console.log(
                    `${LOG_PREFIXES.DEBUG} No new signatures to process, updating cursor to: ${newestSignature}`
                );
            }
            return newestSignature || lastSignatureProcessed;
        }

        // Process signatures theo thứ tự chronological (oldest first)
        // Solana trả về newest → oldest, nên cần reverse
        const orderedSignatures = newSignatures.reverse();

        let latestProcessedSignature: string | undefined;
        let processedCount = 0;

        if (debugEnabled) {
            console.log(
                `${LOG_PREFIXES.EVENT} Batch processing ${orderedSignatures.length} signatures`
            );
        }

        try {
            // Batch fetch parsed transactions
            const signatureStringsToProcess = orderedSignatures.map(
                (sig) => sig.signature
            );
            const parsedTransactions = await connection.getParsedTransactions(
                signatureStringsToProcess,
                {
                    maxSupportedTransactionVersion: 0,
                }
            );

            if (debugEnabled) {
                console.log(
                    `${LOG_PREFIXES.DEBUG} Fetched ${parsedTransactions.length} parsed transactions`
                );
            }

            // Process each transaction with its corresponding signature info
            for (let i = 0; i < parsedTransactions.length; i++) {
                const parsedTx = parsedTransactions[i];
                const signatureInfo = orderedSignatures[i];

                if (debugEnabled) {
                    console.log(
                        `${LOG_PREFIXES.EVENT} Processing signature: ${signatureInfo.signature}`
                    );
                }

                try {
                    // Skip if transaction is null or failed
                    if (!parsedTx || !parsedTx.meta) {
                        if (debugEnabled) {
                            console.log(
                                `${LOG_PREFIXES.DEBUG} Skipping null/failed transaction: ${signatureInfo.signature}`
                            );
                        }
                        latestProcessedSignature = signatureInfo.signature;
                        continue;
                    }

                    // Parse events from this transaction
                    const formattedEvent = parseTransactionFromParsedTx(
                        parsedTx,
                        signatureInfo,
                        program
                    );

                    if (formattedEvent) {
                        // Call onTransaction callback
                        for (const event of formattedEvent) {
                            await onTransaction(event);
                        }
                        processedCount++;
                    }

                    // Track latest processed signature
                    latestProcessedSignature = signatureInfo.signature;
                } catch (error) {
                    console.error(
                        `${LOG_PREFIXES.ERROR} Error processing signature ${signatureInfo.signature}:`,
                        error
                    );
                    // Continue processing other signatures
                    latestProcessedSignature = signatureInfo.signature;
                }
            }
        } catch (error) {
            console.error(
                `${LOG_PREFIXES.ERROR} Error batch fetching transactions:`,
                error
            );

            // Fallback to individual processing if batch fails
            if (debugEnabled) {
                console.log(
                    `${LOG_PREFIXES.DEBUG} Falling back to individual transaction processing`
                );
            }
        }

        if (debugEnabled) {
            console.log(
                `${LOG_PREFIXES.INFO} Successfully processed ${processedCount} transactions`
            );
            console.log(
                `${LOG_PREFIXES.INFO} Latest processed signature: ${latestProcessedSignature}`
            );
        }

        // Return newest signature from the batch (cho next iteration)
        // Solana signatures are sorted newest first, so allSignatures[0] is newest
        const newestSignature = allSignatures[0].signature;

        if (debugEnabled) {
            console.log(
                `${LOG_PREFIXES.SAVE} Returning newest signature for next iteration: ${newestSignature}`
            );
        }

        return newestSignature;
    } catch (error) {
        console.error(
            `${LOG_PREFIXES.ERROR} Error in streamSolanaSingleIteration:`,
            error
        );
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
    commitment = "confirmed",
    shouldContinue,
    program,
}: {
    connection: Connection;
    programId: PublicKey;
    initialLastSignature?: string;
    checkProcessedSignatures: (
        signatures: string[]
    ) => Promise<string[]> | string[];
    onTransaction: (event: TFormattedEvent) => Promise<void>;
    saveLastSignature: (signature: string) => Promise<void>;
    batchSize?: number;
    sleepTime?: number;
    commitment?: "processed" | "confirmed" | "finalized";
    shouldContinue?: () => Promise<boolean> | boolean;
    program?: Program<any>; // Optional Anchor program for IDL parsing
}): Promise<void> => {
    const debugEnabled = process.env.DEBUG_STREAM_SOLANA === "1";
    let lastSignatureProcessed = initialLastSignature;

    if (debugEnabled) {
        console.log(`${LOG_PREFIXES.INFO} Starting continuous streaming`);
        console.log(
            `${LOG_PREFIXES.INFO} Initial last signature: ${lastSignatureProcessed || "None"
            }`
        );
    }

    while (true) {
        try {
            // Check if we should continue
            if (shouldContinue) {
                const continueStreaming = await Promise.resolve(shouldContinue());
                if (!continueStreaming) {
                    if (debugEnabled) {
                        console.log(
                            `${LOG_PREFIXES.INFO} Streaming stopped by shouldContinue function`
                        );
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
                    console.log(
                        `${LOG_PREFIXES.SAVE} Updated last signature: ${lastSignatureProcessed}`
                    );
                }
            }

            // Sleep before next iteration
            await sleep(sleepTime);
        } catch (error) {
            console.error(
                `${LOG_PREFIXES.ERROR} Error in continuous streaming:`,
                error
            );
            await sleep(1000); // Short sleep before retry
        }
    }
};

/**
 * Example usage for premarket trading
 */
export const streamPremarketWithExternalCheck = async () => {
    const connection = new Connection(
        process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
    );
    const TRADING_PROGRAM_ID = new PublicKey(
        "Amj2QtxyLr6GMgBzN2pB5qaq5V8J7jTBrqc4Ar7y4G5t"
    );

    // Example external check function (database, cache, etc.)
    const checkProcessedSignatures = async (signatures: string[]) => {
        // Giả sử check từ database
        // return await db.getProcessedSignatures(signatures);

        // Mock implementation
        console.log(`Checking ${signatures.length} signatures against database...`);

        // Giả sử 20% signatures đã processed
        // const signatures = signatures.filter(() => Math.random() < 0.2);
        return [];
    };

    const tradingProgram = new Program(
        tradingProgramIdl as any,
        TRADING_PROGRAM_ID,
        new ClientProvider(connection)
    );

    // Example onTransaction callback
    const onTransaction = async (transaction: any) => {
        console.log(
            `   ✅ Found transaction: ${JSON.stringify(transaction, null, 2)}`
        );

        // Format the event with proper decimals
        const formattedTransaction = await formatEvent(transaction, connection);
        const event = new OrderMatchedEvent(formattedTransaction);
        console.log(
            `   🔄 Formatted transaction: ${JSON.stringify(event, null, 2)}`
        );
    };

    // Example save function
    const saveLastSignature = async (signature: string) => {
        console.log(`Saving last processed signature: ${signature}`);
        // await db.saveLastSignature(signature);
    };

    // Start streaming
    await streamSolanaContinuous({
        connection,
        programId: TRADING_PROGRAM_ID,
        initialLastSignature: undefined, // Start from latest
        checkProcessedSignatures,
        onTransaction,
        saveLastSignature,
        batchSize: 1000,
        sleepTime: 30000,
        commitment: 'confirmed',
        shouldContinue: () => true, // Run indefinitely,
        program: tradingProgram,
    });
    // const lastSignature = await streamSolanaSingleIteration({
    //     connection,
    //     programId: TRADING_PROGRAM_ID,
    //     checkProcessedSignatures,
    //     onTransaction,
    //     batchSize: 1,
    //     commitment: "confirmed",
    //     program: tradingProgram,
    // });

    // console.log("Last signature:", lastSignature);
};



if (require.main === module) {
    streamPremarketWithExternalCheck()
        .then()
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
