import { Program, EventParser, BorshCoder } from "@coral-xyz/anchor";
import { ParsedTransactionWithMeta, ConfirmedSignatureInfo, Connection } from "@solana/web3.js";

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
                return eventsData;
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
                    source: "eventparser",
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