import { Connection, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import tradingProgramIdl from "../idl/premarket_trade.json";
import "dotenv/config";
import {
    parseEventsFromSignature,
} from "../utils/parse-events-from-signature";
import { ClientProvider } from "../utils/client-provider";

/**
 * Example: Parse events from a single signature
 * Demo cách sử dụng utils function để parse events từ 1 signature cụ thể
 */
const parseEventsFromSingleSignature = async () => {
    const connection = new Connection(
        process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
    );

    const TRADING_PROGRAM_ID = new PublicKey(
        "Amj2QtxyLr6GMgBzN2pB5qaq5V8J7jTBrqc4Ar7y4G5t"
    );

    // Create program instance for IDL parsing
    const tradingProgram = new Program(
        tradingProgramIdl as any,
        TRADING_PROGRAM_ID,
        new ClientProvider(connection)
    );

    // Example signature to parse (replace with actual signature)
    const exampleSignature =
        "5iDMJT2VAuKKU7r6hNzR34rqPx3h5nTPxodhMXCJH1JHBq9iNSnkNA2ComweUfPXeGD8CfjHaxUxYc7MaKzRcyVy";

    console.log("🔍 Parsing events from signature:", exampleSignature);

    try {
        // Method 1: Parse events from single signature
        const events = await parseEventsFromSignature(
            connection,
            exampleSignature,
            tradingProgram,
            TRADING_PROGRAM_ID
        );

        console.log(`\n✅ Found ${events.length} events:`);
        events.forEach((event, index) => {
            console.log(`\n📊 Event ${index + 1}:`);
            console.log(`   - Event Name: ${event.eventName}`);
            console.log(`   - Trade ID: ${event.tradeId}`);
            console.log(`   - Buyer: ${event.buyer}`);
            console.log(`   - Seller: ${event.seller}`);
            console.log(`   - Price: ${event.price}`);
            console.log(`   - Filled Amount: ${event.filledAmount}`);
            console.log(`   - Buyer Collateral: ${event.buyerCollateral}`);
            console.log(`   - Seller Collateral: ${event.sellerCollateral}`);
            console.log(`   - Transaction Hash: ${event.transactionHash}`);
            console.log(`   - Block Number: ${event.blockNumber}`);
            console.log(
                `   - Timestamp: ${new Date(event.timestamp * 1000).toISOString()}`
            );

            // Print full JSON for debugging
            console.log(`   - Full JSON:`, JSON.stringify(event.toJSON(), null, 2));
        });
    } catch (error) {
        console.error("❌ Error parsing events:", error);
    }
};

// Main execution
if (require.main === module) {
    parseEventsFromSingleSignature()
        .then(() => console.log("✅ Single signature parsing completed"))
        .catch(console.error);
}

export { parseEventsFromSingleSignature };
