#!/usr/bin/env ts-node

/**
 * Manage Relayers Script
 * Add or remove relayers for the trading system
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
 * Manage relayers
 */
async function manageRelayers(): Promise<void> {
    console.log("🔧 Starting Relayer Management...");

    // Validate required environment variables
    const requiredEnvVars = ['SOLANA_NETWORK', 'RPC_URL', 'ADMIN_KEYPAIR', 'RELAYER_ADDRESS', 'RELAYER_ACTION'];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }

    try {
        // Setup connection and keypairs
        const connection = new Connection(process.env.RPC_URL!, 'confirmed');
        const admin = loadKeypairFromFile(process.env.ADMIN_KEYPAIR!);

        // Get relayer management parameters
        const relayerAddress = process.env.RELAYER_ADDRESS ? new PublicKey(process.env.RELAYER_ADDRESS!) : admin.publicKey;
        const action = process.env.RELAYER_ACTION!.toLowerCase();
        const isAdd = action === 'add' || action === 'true';

        if (!['add', 'remove', 'true', 'false'].includes(action)) {
            throw new Error("RELAYER_ACTION must be 'add', 'remove', 'true', or 'false'");
        }

        // Program IDs
        const tradingProgramId = new PublicKey('6AXDZgH6QnCwCzJZEYp7bsQrq4yxMmhLMus66zy4ZkNF');

        console.log(`👑 Admin: ${admin.publicKey.toString()}`);
        console.log(`🤖 Relayer: ${relayerAddress.toString()}`);
        console.log(`🎯 Action: ${isAdd ? 'ADD' : 'REMOVE'}`);
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

        // Check current trade config and relayer status
        try {
            const tradeConfig = await tradingProgram.account.tradeConfig.fetch(tradeConfigPDA) as any;
            console.log(`✅ Trade Config Found - Relayers Count: ${tradeConfig.relayers.length}`);

            const isCurrentlyRelayer = tradeConfig.relayers.some((r: PublicKey) => r.equals(relayerAddress));
            console.log(`📊 Current Status: ${isCurrentlyRelayer ? 'IS RELAYER' : 'NOT RELAYER'}`);

            if (isAdd && isCurrentlyRelayer) {
                console.log("⚠️  Relayer already exists, continuing anyway...");
            } else if (!isAdd && !isCurrentlyRelayer) {
                console.log("⚠️  Relayer doesn't exist, continuing anyway...");
            }
        } catch (error) {
            console.error("❌ Failed to fetch trade config:", error);
            throw error;
        }

        // Manage relayer
        console.log(`🚀 ${isAdd ? 'Adding' : 'Removing'} relayer...`);

        const tx = await tradingProgram.methods
            .manageRelayers(relayerAddress, isAdd)
            .accounts({
                admin: admin.publicKey,
                config: tradeConfigPDA,
            })
            .signers([admin])
            .rpc();

        console.log(`✅ Relayer management completed successfully!`);
        console.log(`🔗 Transaction: ${tx}`);

        // Verify changes
        const updatedTradeConfig = await tradingProgram.account.tradeConfig.fetch(tradeConfigPDA) as any;
        const isNowRelayer = updatedTradeConfig.relayers.some((r: PublicKey) => r.equals(relayerAddress));

        console.log(`✅ Verified - Total Relayers: ${updatedTradeConfig.relayers.length}`);
        console.log(`✅ Verified - ${relayerAddress.toString()} is ${isNowRelayer ? 'NOW A RELAYER' : 'NO LONGER A RELAYER'}`);
        console.log(`📋 All Relayers:`);
        updatedTradeConfig.relayers.forEach((relayer: PublicKey, index: number) => {
            console.log(`   ${index + 1}. ${relayer.toString()}`);
        });

        console.log("🎉 Relayer management completed!");

    } catch (error) {
        console.error("❌ Relayer management failed:", error);
        throw error;
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    manageRelayers()
        .then(() => {
            console.log("✅ Script completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

export { manageRelayers, loadKeypairFromFile, getTradeConfigPDA }; 