import {
    Connection,
    PublicKey,
} from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { OrderMatchedEvent } from "../types/events";
import { formatEvent } from "./format-events";
import { parseTransactionForEvents } from "./parse-transaction";
import { LOG_PREFIXES } from "./logs";

/**
 * Parse events from a specific transaction signature
 * Tham khảo logic từ stream events để parse events từ 1 signature cụ thể
 * 
 * @param connection Solana connection
 * @param signature Transaction signature string
 * @param program Optional Anchor program for IDL parsing
 * @param programId Program ID to verify the transaction belongs to this program
 * @returns Array of formatted OrderMatchedEvent objects
 */
export const parseEventsFromSignature = async (
    connection: Connection,
    signature: string,
    program?: Program<any>,
    programId?: PublicKey
): Promise<OrderMatchedEvent[]> => {
    const debugEnabled = process.env.DEBUG_PARSE_EVENTS === "1";

    try {
        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.INFO} Parsing events from signature: ${signature}`);
        }

        // Method 1: Use the existing parseTransactionForEvents function
        if (program) {
            const rawEvents = await parseTransactionForEvents(
                connection,
                signature,
                program
            );

            if (debugEnabled) {
                console.log(`${LOG_PREFIXES.DEBUG} Found ${rawEvents.length} raw events`);
            }

            const formattedEvents: OrderMatchedEvent[] = [];

            for (const rawEvent of rawEvents) {
                try {
                    // Format the event with proper decimals
                    const formattedEvent = await formatEvent(rawEvent, connection);

                    if (debugEnabled) {
                        console.log(`${LOG_PREFIXES.DEBUG} Formatted event:`, formattedEvent);
                    }

                    // Create OrderMatchedEvent object
                    const orderMatchedEvent = new OrderMatchedEvent(formattedEvent);
                    formattedEvents.push(orderMatchedEvent);

                    if (debugEnabled) {
                        console.log(`${LOG_PREFIXES.INFO} Created OrderMatchedEvent:`, orderMatchedEvent.toJSON());
                    }
                } catch (formatError) {
                    console.error(
                        `${LOG_PREFIXES.ERROR} Error formatting event from signature ${signature}:`,
                        formatError
                    );
                    // Continue processing other events
                }
            }

            return formattedEvents;
        }

        // Method 2: Manual parsing if no program provided
        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.DEBUG} No program provided, using manual parsing`);
        }

        const parsedTx = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });

        if (!parsedTx || !parsedTx.meta) {
            if (debugEnabled) {
                console.log(`${LOG_PREFIXES.DEBUG} No parsed transaction found for signature: ${signature}`);
            }
            return [];
        }

        // Check if transaction belongs to the specified program (if provided)
        if (programId) {
            const hasProgram = parsedTx.transaction.message.accountKeys.some(
                (key) => key.pubkey.equals(programId)
            );

            if (!hasProgram) {
                if (debugEnabled) {
                    console.log(`${LOG_PREFIXES.DEBUG} Transaction does not belong to program: ${programId.toString()}`);
                }
                return [];
            }
        }

        // Check if transaction was successful
        if (parsedTx.meta.err) {
            if (debugEnabled) {
                console.log(`${LOG_PREFIXES.DEBUG} Transaction failed:`, parsedTx.meta.err);
            }
            return [];
        }

        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.INFO} Manual parsing not fully implemented yet`);
        }

        // TODO: Implement manual log parsing if needed
        // For now, return empty array since we need the program for proper event parsing
        return [];

    } catch (error) {
        console.error(
            `${LOG_PREFIXES.ERROR} Error parsing events from signature ${signature}:`,
            error
        );
        return [];
    }
};

/**
 * Parse events from multiple signatures in parallel
 * Parse events từ nhiều signatures cùng lúc để tăng performance
 * 
 * @param connection Solana connection
 * @param signatures Array of transaction signature strings
 * @param program Optional Anchor program for IDL parsing
 * @param programId Program ID to verify transactions belong to this program
 * @returns Array of formatted OrderMatchedEvent objects from all signatures
 */
export const parseEventsFromSignatures = async (
    connection: Connection,
    signatures: string[],
    program?: Program<any>,
    programId?: PublicKey
): Promise<OrderMatchedEvent[]> => {
    const debugEnabled = process.env.DEBUG_PARSE_EVENTS === "1";

    if (debugEnabled) {
        console.log(`${LOG_PREFIXES.INFO} Parsing events from ${signatures.length} signatures`);
    }

    try {
        // Process all signatures in parallel
        const parsePromises = signatures.map((signature) =>
            parseEventsFromSignature(connection, signature, program, programId)
        );

        const results = await Promise.all(parsePromises);

        // Flatten results array
        const allEvents = results.flat();

        if (debugEnabled) {
            console.log(`${LOG_PREFIXES.INFO} Total events found: ${allEvents.length}`);
        }

        return allEvents;
    } catch (error) {
        console.error(
            `${LOG_PREFIXES.ERROR} Error parsing events from multiple signatures:`,
            error
        );
        return [];
    }
};

