#!/usr/bin/env ts-node

/**
 * Initialize Trading Program Script
 * Optimized version with core functionality only
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

// Core types
interface EconomicConfig {
    buyerCollateralRatio: number;
    sellerCollateralRatio: number;
    sellerRewardBps: number;
    latePenaltyBps: number;
    minimumFillAmount: anchor.BN;
    maximumOrderAmount: anchor.BN;
}

interface TechnicalConfig {
    minSettleTime: number;
    maxSettleTime: number;
}

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
 * Create economic configuration
 */
function createEconomicConfig(): EconomicConfig {
    return {
        buyerCollateralRatio: parseInt(process.env.BUYER_COLLATERAL_RATIO || '10000'),
        sellerCollateralRatio: parseInt(process.env.SELLER_COLLATERAL_RATIO || '10000'),
        sellerRewardBps: parseInt(process.env.SELLER_REWARD_BPS || '0'),
        latePenaltyBps: parseInt(process.env.LATE_PENALTY_BPS || '10000'),
        minimumFillAmount: new anchor.BN(process.env.MINIMUM_FILL_AMOUNT || '1000'),
        maximumOrderAmount: new anchor.BN(process.env.MAXIMUM_ORDER_AMOUNT || '1000000000000'),
    };
}

/**
 * Create technical configuration
 */
function createTechnicalConfig(): TechnicalConfig {
    return {
        minSettleTime: parseInt(process.env.MIN_SETTLE_TIME || '3600'),
        maxSettleTime: parseInt(process.env.MAX_SETTLE_TIME || '2592000'),
    };
}

/**
 * Main initialization function
 */
async function initializeTrading(): Promise<void> {
    console.log("🚀 Starting Trading Program Initialization...");

    // Validate required environment variables
    const requiredEnvVars = ['SOLANA_NETWORK', 'RPC_URL', 'DEPLOYER_KEYPAIR', 'ADMIN_KEYPAIR'];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }

    try {
        // Setup connection and keypairs
        const connection = new Connection(process.env.RPC_URL!, 'confirmed');
        const deployer = loadKeypairFromFile(process.env.DEPLOYER_KEYPAIR!);
        const admin = loadKeypairFromFile(process.env.ADMIN_KEYPAIR!);

        // Program IDs
        const vaultProgramId = new PublicKey('a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE');
        const tradingProgramId = new PublicKey('6AXDZgH6QnCwCzJZEYp7bsQrq4yxMmhLMus66zy4ZkNF');

        console.log(`👤 Deployer: ${deployer.publicKey.toString()}`);
        console.log(`👑 Admin: ${admin.publicKey.toString()}`);
        console.log(`🏗️ Vault Program: ${vaultProgramId.toString()}`);
        console.log(`📈 Trading Program: ${tradingProgramId.toString()}`);

        // Setup Anchor provider
        const provider = new anchor.AnchorProvider(
            connection,
            new anchor.Wallet(deployer),
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
            console.error("❌ Failed to load trading program IDL. Make sure program is deployed and IDL is available.", error);
            throw new Error("Failed to load trading program IDL");
        }

        // Get trade config PDA
        const [tradeConfigPDA, tradeConfigBump] = getTradeConfigPDA(tradingProgramId);
        console.log(`🔑 Trade Config PDA: ${tradeConfigPDA.toString()}`);

        // Create configurations
        const economicConfig = createEconomicConfig();
        const technicalConfig = createTechnicalConfig();

        // Check if already initialized
        try {
            await tradingProgram.account.tradeConfig.fetch(tradeConfigPDA);
            console.log("⚠️  Trading already initialized! Exiting...");
            return;
        } catch (error) {
            console.log("✅ Proceeding with initialization...");
        }

        // Initialize trading system
        console.log("🚀 Initializing trading system...");

        const tx = await tradingProgram.methods
            .initializeTrading(vaultProgramId, economicConfig, technicalConfig)
            .accounts({
                admin: deployer.publicKey,
                tradeConfig: tradeConfigPDA,
                systemProgram: SystemProgram.programId,
            })
            .signers([deployer])
            .rpc();

        console.log(`✅ Trading initialized successfully!`);
        console.log(`🔗 Transaction: ${tx}`);

        // Basic verification
        const tradeConfig = await tradingProgram.account.tradeConfig.fetch(tradeConfigPDA) as any;
        console.log(`✅ Verified - Admin: ${tradeConfig.admin.toString()}`);
        console.log(`✅ Verified - Vault Program: ${tradeConfig.vaultProgram.toString()}`);

        console.log("🎉 Initialization completed!");

    } catch (error) {
        console.error("❌ Trading initialization failed:", error);
        throw error;
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    initializeTrading()
        .then(() => {
            console.log("✅ Script completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

export { initializeTrading, loadKeypairFromFile, getTradeConfigPDA, createEconomicConfig, createTechnicalConfig }; 