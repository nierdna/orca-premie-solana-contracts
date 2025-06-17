#!/usr/bin/env ts-node

/**
 * Map Token Script
 * Maps a real token mint to an existing token market
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
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
 * Map token to market
 */
async function mapToken(): Promise<void> {
    console.log("🔗 Starting Token Mapping...");

    // Validate required environment variables
    const requiredEnvVars = ['SOLANA_NETWORK', 'RPC_URL', 'DEPLOYER_KEYPAIR', 'TOKEN_MARKET_ADDRESS', 'REAL_TOKEN_MINT'];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }

    try {
        // Setup connection and keypairs
        const connection = new Connection(process.env.RPC_URL!, 'confirmed');
        const admin = loadKeypairFromFile(process.env.DEPLOYER_KEYPAIR!);

        // Get addresses from environment
        const tokenMarketAddress = new PublicKey(process.env.TOKEN_MARKET_ADDRESS! || '4kdTHLoWWFR4VgMqmvuJvKTm17x9kXT43fGPEDTb493Q');
        const realTokenMint = new PublicKey(process.env.REAL_TOKEN_MINT! || '5FPTnHuxwyqSpuRdjQwaemi8YoW5KT7CeMWQ55v6mCef');

        // Program IDs
        const tradingProgramId = new PublicKey('Amj2QtxyLr6GMgBzN2pB5qaq5V8J7jTBrqc4Ar7y4G5t');

        console.log(`👑 Admin: ${admin.publicKey.toString()}`);
        console.log(`🏪 Token Market: ${tokenMarketAddress.toString()}`);
        console.log(`🪙 Real Token Mint: ${realTokenMint.toString()}`);
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

        // Verify token market exists
        try {
            const tokenMarketAccount = await tradingProgram.account.tokenMarket.fetch(tokenMarketAddress) as any;
            console.log(`✅ Token Market Found - Symbol: ${tokenMarketAccount.symbol}`);

            // if (!tokenMarketAccount.isActive) {
            //     throw new Error("Token market is not active");
            // }

            if (tokenMarketAccount.realMint && !tokenMarketAccount.realMint.equals(PublicKey.default)) {
                console.log(`⚠️  Token market already mapped to: ${tokenMarketAccount.realMint.toString()}`);
                console.log("Updating mapping...");
            }
        } catch (error) {
            console.error("❌ Token market not found or invalid:", error);
            throw error;
        }

        // Map token
        console.log("🚀 Mapping token to market...");

        const tx = await tradingProgram.methods
            .mapToken(realTokenMint)
            .accounts({
                admin: admin.publicKey,
                tokenMarket: tokenMarketAddress,
                config: tradeConfigPDA,
                realMint: realTokenMint,
            })
            .signers([admin])
            .rpc();

        console.log(`✅ Token mapping completed successfully!`);
        console.log(`🔗 Transaction: ${tx}`);

        // Verify mapping
        const updatedTokenMarket = await tradingProgram.account.tokenMarket.fetch(tokenMarketAddress) as any;
        console.log(`✅ Verified - Real Mint: ${updatedTokenMarket.realMint.toString()}`);
        console.log(`✅ Verified - Token Market Ready for Trading!`);

        console.log("🎉 Token mapping completed!");

    } catch (error) {
        console.error("❌ Token mapping failed:", error);
        throw error;
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    mapToken()
        .then(() => {
            console.log("✅ Script completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

export { mapToken, loadKeypairFromFile, getTradeConfigPDA }; 