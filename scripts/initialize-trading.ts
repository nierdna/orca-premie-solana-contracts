#!/usr/bin/env ts-node

/**
 * Initialize Trading Program Script
 * Based on DEPLOYMENT_GUIDE.md specifications
 * 
 * This script initializes the trading system with vault program reference,
 * economic and technical configurations following the exact pattern 
 * from the deployment documentation.
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";
import * as fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Types for our program - matches Anchor generated types
interface TradeConfig {
    admin: PublicKey;
    vaultProgram: PublicKey;
    economicConfig: EconomicConfig;
    technicalConfig: TechnicalConfig;
    relayers: PublicKey[];
    paused: boolean;
    bump: number;
}

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
 * Get or create PDA for trade config
 */
function getTradeConfigPDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("trade_config")],
        programId
    );
}

/**
 * Check account balance and airdrop if needed (devnet only)
 */
async function ensureFunding(
    connection: Connection,
    account: Keypair,
    requiredSol: number = 1
): Promise<void> {
    const balance = await connection.getBalance(account.publicKey);
    const requiredLamports = requiredSol * LAMPORTS_PER_SOL;

    if (balance < requiredLamports) {
        console.log(`💰 Account ${account.publicKey.toString()} needs funding...`);

        if (process.env.SOLANA_NETWORK === 'devnet') {
            console.log(`💸 Airdropping ${requiredSol} SOL...`);
            const signature = await connection.requestAirdrop(
                account.publicKey,
                requiredLamports - balance
            );
            await connection.confirmTransaction(signature);
            console.log(`✅ Airdrop completed: ${signature}`);
        } else {
            throw new Error(`Insufficient balance: ${balance / LAMPORTS_PER_SOL} SOL. Need ${requiredSol} SOL.`);
        }
    }
}

/**
 * Create economic configuration from environment variables
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
 * Create technical configuration from environment variables
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
    console.log("=====================================");

    // Validate environment variables
    const requiredEnvVars = [
        'SOLANA_NETWORK',
        'RPC_URL',
        'DEPLOYER_KEYPAIR',
        'ADMIN_KEYPAIR'
    ];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }

    try {
        // 1. Setup connection and keypairs
        console.log("🔗 Setting up connection and keypairs...");
        const connection = new Connection(process.env.RPC_URL!, 'confirmed');

        const deployer = loadKeypairFromFile(process.env.DEPLOYER_KEYPAIR!);
        const admin = loadKeypairFromFile(process.env.ADMIN_KEYPAIR!);

        console.log(`📡 Network: ${process.env.SOLANA_NETWORK}`);
        console.log(`🏦 RPC URL: ${process.env.RPC_URL}`);
        console.log(`👤 Deployer: ${deployer.publicKey.toString()}`);
        console.log(`👑 Admin: ${admin.publicKey.toString()}`);

        // 2. Get program IDs
        const vaultProgramId = new PublicKey('a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE');
        const tradingProgramId = new PublicKey('6AXDZgH6QnCwCzJZEYp7bsQrq4yxMmhLMus66zy4ZkNF');

        console.log(`🏗️ Vault Program ID: ${vaultProgramId.toString()}`);
        console.log(`📈 Trading Program ID: ${tradingProgramId.toString()}`);

        // 3. Setup Anchor provider and program
        console.log("\n⚓ Setting up Anchor provider...");
        const provider = new anchor.AnchorProvider(
            connection,
            new anchor.Wallet(deployer),
            { commitment: 'confirmed' }
        );
        anchor.setProvider(provider);

        // Load the trading program IDL
        let tradingProgram;
        try {
            // Try to load from target/idl first
            const idlPath = `target/idl/premarket_trade.json`;
            if (fs.existsSync(idlPath)) {
                const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
                tradingProgram = new anchor.Program(idl, tradingProgramId, provider);
            } else {
                // Try to fetch from chain
                tradingProgram = await anchor.Program.at(tradingProgramId, provider);
            }
        } catch (error) {
            console.error("❌ Failed to load trading program IDL. Make sure program is deployed and IDL is available.");
            throw error;
        }

        // 4. Get trade config PDA
        const [tradeConfigPDA, tradeConfigBump] = getTradeConfigPDA(tradingProgramId);
        console.log(`🔑 Trade Config PDA: ${tradeConfigPDA.toString()}`);
        console.log(`🎯 PDA Bump: ${tradeConfigBump}`);

        // 5. Create configurations
        const economicConfig = createEconomicConfig();
        const technicalConfig = createTechnicalConfig();

        console.log("\n📊 Economic Configuration:");
        console.log(`   Buyer Collateral Ratio: ${economicConfig.buyerCollateralRatio / 100}%`);
        console.log(`   Seller Collateral Ratio: ${economicConfig.sellerCollateralRatio / 100}%`);
        console.log(`   Seller Reward BPS: ${economicConfig.sellerRewardBps}`);
        console.log(`   Late Penalty BPS: ${economicConfig.latePenaltyBps}`);
        console.log(`   Minimum Fill Amount: ${economicConfig.minimumFillAmount.toString()}`);
        console.log(`   Maximum Order Amount: ${economicConfig.maximumOrderAmount.toString()}`);

        console.log("\n⚙️ Technical Configuration:");
        console.log(`   Min Settle Time: ${technicalConfig.minSettleTime}s (${technicalConfig.minSettleTime / 3600}h)`);
        console.log(`   Max Settle Time: ${technicalConfig.maxSettleTime}s (${technicalConfig.maxSettleTime / 86400}d)`);

        // 6. Check if trading is already initialized
        console.log("\n🔍 Checking if trading is already initialized...");
        try {
            const existingConfig = await tradingProgram.account.tradeConfig.fetch(tradeConfigPDA) as TradeConfig;
            console.log("⚠️  Trading already initialized!");
            console.log(`   Admin: ${existingConfig.admin.toString()}`);
            console.log(`   Vault Program: ${existingConfig.vaultProgram.toString()}`);
            console.log(`   Paused: ${existingConfig.paused}`);
            console.log(`   Relayers: ${existingConfig.relayers.length}`);

            console.log("\n🤔 Trading is already initialized. Exiting...");
            return;
        } catch (error) {
            console.log("✅ Trading not yet initialized. Proceeding...");
        }

        // 7. Initialize the trading system
        console.log("\n🚀 Initializing trading system...");
        console.log(`   Admin: ${admin.publicKey.toString()}`);
        console.log(`   Vault Program: ${vaultProgramId.toString()}`);

        let tx: string;

        try {
            // Simulate transaction first
            const simulation = await tradingProgram.methods
                .initializeTrading(vaultProgramId, economicConfig, technicalConfig)
                .accounts({
                    admin: deployer.publicKey,
                    tradeConfig: tradeConfigPDA,
                    systemProgram: SystemProgram.programId,
                })
                .simulate();

            console.log("✅ Transaction simulation successful");

            // Execute actual transaction
            tx = await tradingProgram.methods
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
        } catch (error) {
            console.error("❌ Transaction failed:");
            console.error("Error details:", error);
            throw error;
        }

        // 8. Verify initialization
        console.log("\n🔍 Verifying initialization...");
        const tradeConfig = await tradingProgram.account.tradeConfig.fetch(tradeConfigPDA) as TradeConfig;

        console.log("📋 Trading Configuration:");
        console.log(`   Admin: ${tradeConfig.admin.toString()}`);
        console.log(`   Vault Program: ${tradeConfig.vaultProgram.toString()}`);
        console.log(`   Paused: ${tradeConfig.paused}`);
        console.log(`   Relayers: ${tradeConfig.relayers.length}`);
        console.log(`   Bump: ${tradeConfig.bump}`);

        console.log("\n📊 Economic Config Verification:");
        console.log(`   Buyer Collateral: ${tradeConfig.economicConfig.buyerCollateralRatio / 100}%`);
        console.log(`   Seller Collateral: ${tradeConfig.economicConfig.sellerCollateralRatio / 100}%`);
        console.log(`   Seller Reward: ${tradeConfig.economicConfig.sellerRewardBps} BPS`);
        console.log(`   Late Penalty: ${tradeConfig.economicConfig.latePenaltyBps} BPS`);

        // 9. Get transaction details
        console.log("\n📊 Transaction Details:");
        const txDetails = await connection.getTransaction(tx, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (txDetails) {
            console.log(`   Slot: ${txDetails.slot}`);
            console.log(`   Block Time: ${new Date(txDetails.blockTime! * 1000).toISOString()}`);
            console.log(`   Fee: ${txDetails.meta?.fee} lamports`);
        }

        console.log("\n🎉 Trading initialization completed successfully!");
        console.log("=====================================");

        // 10. Next steps information
        console.log("\n📝 Next Steps:");
        console.log("1. Authorize Trading Program in Vault");
        console.log("2. Add relayers for order execution");
        console.log("3. Create token markets");
        console.log("4. Test basic trading operations");

        console.log("\n🔗 Useful Commands:");
        console.log(`   View trade config: solana account ${tradeConfigPDA.toString()}`);
        console.log(`   View trading program: solana program show ${tradingProgramId.toString()}`);
        console.log(`   Authorize in vault: Add ${tradingProgramId.toString()} to vault authorized traders`);

    } catch (error) {
        console.error("❌ Trading initialization failed:");
        console.error(error);
        process.exit(1);
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    initializeTrading()
        .then(() => {
            console.log("\n✅ Script completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n❌ Script failed:");
            console.error(error);
            process.exit(1);
        });
}

export { initializeTrading, loadKeypairFromFile, getTradeConfigPDA, createEconomicConfig, createTechnicalConfig }; 