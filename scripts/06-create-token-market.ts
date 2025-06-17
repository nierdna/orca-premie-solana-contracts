#!/usr/bin/env ts-node

/**
 * Create Token Market Script
 * Creates a new token market for premarket trading
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import * as fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Load keypair from file path
 */
function loadKeypairFromFile(filepath: string): Keypair {
    const expandedPath = filepath.replace('~', process.env.HOME || '');
    const secretKey = JSON.parse(fs.readFileSync(expandedPath, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

/**
 * Get PDA for trade config
 */
function getTradeConfigPDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("trade_config")],
        programId
    );
}

/**
 * Create token market
 */
async function createTokenMarket(): Promise<void> {
    console.log("🏪 Starting Token Market Creation...");

    // Validate required environment variables
    const requiredEnvVars = ['SOLANA_NETWORK', 'RPC_URL', 'ADMIN_KEYPAIR'];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }

    try {
        // Setup connection and keypairs
        const connection = new Connection(process.env.RPC_URL!, 'confirmed');
        const admin = loadKeypairFromFile(process.env.DEPLOYER_KEYPAIR!);

        // Generate keypair for TokenMarket (user-controlled, not PDA)
        const tokenMarket = Keypair.generate();

        // Program IDs
        const tradingProgramId = new PublicKey('6AXDZgH6QnCwCzJZEYp7bsQrq4yxMmhLMus66zy4ZkNF');

        console.log(`👑 Admin: ${admin.publicKey.toString()}`);
        console.log(`🏪 Token Market: ${tokenMarket.publicKey.toString()}`);
        console.log(`📈 Trading Program: ${tradingProgramId.toString()}`);

        // Setup Anchor provider
        const provider = new anchor.AnchorProvider(
            connection,
            new anchor.Wallet(admin),
            { commitment: 'confirmed' }
        );
        anchor.setProvider(provider);

        // Load trading program
        let tradingProgram;
        try {
            const idlPath = `target/idl/premarket_trade.json`;
            if (fs.existsSync(idlPath)) {
                const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
                tradingProgram = new anchor.Program(idl, tradingProgramId, provider);
            } else {
                tradingProgram = await anchor.Program.at(tradingProgramId, provider);
            }
        } catch (error) {
            console.error("❌ Failed to load trading program IDL:", error);
            throw new Error("Failed to load trading program IDL");
        }

        // Get trade config PDA
        const [tradeConfigPDA] = getTradeConfigPDA(tradingProgramId);

        // Token market parameters from environment or defaults
        const symbol = process.env.TOKEN_SYMBOL || "TEST";
        const name = process.env.TOKEN_NAME || "Test Token";
        const settleTimeLimit = parseInt(process.env.SETTLE_TIME_LIMIT || "86400"); // 24 hours default

        console.log(`🎯 Symbol: ${symbol}`);
        console.log(`📝 Name: ${name}`);
        console.log(`⏰ Settle Time Limit: ${settleTimeLimit} seconds`);

        // Create token market
        console.log("🚀 Creating token market...");

        const tx = await tradingProgram.methods
            .createTokenMarket(symbol, name, settleTimeLimit)
            .accounts({
                admin: admin.publicKey,
                tokenMarket: tokenMarket.publicKey,
                config: tradeConfigPDA,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin, tokenMarket])
            .rpc();

        console.log(`✅ Token market created successfully!`);
        console.log(`🔗 Transaction: ${tx}`);
        console.log(`🏪 Token Market Address: ${tokenMarket.publicKey.toString()}`);

        // Save token market keypair for future use
        const keypairPath = `./keys/token-market-${symbol.toLowerCase()}.json`;
        fs.writeFileSync(keypairPath, JSON.stringify(Array.from(tokenMarket.secretKey)));
        console.log(`💾 Token market keypair saved to: ${keypairPath}`);

        // Verify creation
        const tokenMarketAccount = await tradingProgram.account.tokenMarket.fetch(tokenMarket.publicKey) as any;
        console.log(`✅ Verified - Symbol: ${tokenMarketAccount.symbol}`);
        console.log(`✅ Verified - Name: ${tokenMarketAccount.name}`);
        console.log(`✅ Verified - Active: ${tokenMarketAccount.isActive}`);

        console.log("🎉 Token market creation completed!");

    } catch (error) {
        console.error("❌ Token market creation failed:", error);
        throw error;
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    createTokenMarket()
        .then(() => {
            console.log("✅ Script completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

export { createTokenMarket, loadKeypairFromFile, getTradeConfigPDA }; 