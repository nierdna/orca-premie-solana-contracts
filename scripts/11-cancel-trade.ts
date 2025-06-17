#!/usr/bin/env ts-node

/**
 * Cancel Trade Script
 * Cancel trade after grace period with penalty distribution
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
} from "@solana/spl-token";
import * as fs from "fs";
import dotenv from "dotenv";
import { getVaultAuthorityPDA } from "./03-deposit-collateral";

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
 * Get PDAs
 */
function getTradeConfigPDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("trade_config")],
        programId
    );
}

function getVaultConfigPDA(vaultProgramId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vault_config")],
        vaultProgramId
    );
}

function getUserBalancePDA(vaultProgramId: PublicKey, user: PublicKey, mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("user_balance"),
            user.toBuffer(),
            mint.toBuffer()
        ],
        vaultProgramId
    );
}

/**
 * Cancel trade
 */
async function cancelTrade(): Promise<void> {
    console.log("❌ Starting Trade Cancellation...");

    // Validate required environment variables
    const requiredEnvVars = [
        'SOLANA_NETWORK', 'RPC_URL', 'BUY_TRADER_KEYPAIR',
        'TRADE_RECORD_ADDRESS'
    ];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }

    try {
        // Setup connection and keypairs
        const connection = new Connection(process.env.RPC_URL!, 'confirmed');
        const buyTrader = loadKeypairFromFile(process.env.BUY_TRADER_KEYPAIR!);

        // Get addresses from environment
        const tradeRecordAddress = new PublicKey(process.env.TRADE_RECORD_ADDRESS!);

        // Program IDs
        const vaultProgramId = new PublicKey('a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE');
        const tradingProgramId = new PublicKey('Amj2QtxyLr6GMgBzN2pB5qaq5V8J7jTBrqc4Ar7y4G5t');

        console.log(`👤 Buy Trader (Canceller): ${buyTrader.publicKey.toString()}`);
        console.log(`📋 Trade Record: ${tradeRecordAddress.toString()}`);

        // Setup Anchor provider
        const provider = new anchor.AnchorProvider(
            connection,
            new anchor.Wallet(buyTrader),
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

        // Fetch trade record to get required information
        const tradeRecord = await tradingProgram.account.tradeRecord.fetch(tradeRecordAddress) as any;
        console.log(`📊 Trade Info:`);
        console.log(`  Trade ID: ${tradeRecord.tradeId.toString()}`);
        console.log(`  Buyer: ${tradeRecord.buyer.toString()}`);
        console.log(`  Seller: ${tradeRecord.seller.toString()}`);
        console.log(`  Token ID: ${tradeRecord.tokenId.toString()}`);
        console.log(`  Collateral Mint: ${tradeRecord.collateralMint.toString()}`);
        console.log(`  Filled Amount: ${tradeRecord.filledAmount.toString()}`);
        console.log(`  Price: ${tradeRecord.price.toString()}`);
        console.log(`  Buyer Collateral: ${tradeRecord.buyerCollateral.toString()}`);
        console.log(`  Seller Collateral: ${tradeRecord.sellerCollateral.toString()}`);
        console.log(`  Match Time: ${new Date(tradeRecord.matchTime.toNumber() * 1000).toISOString()}`);
        console.log(`  Settled: ${tradeRecord.settled}`);

        // Verify buy trader can cancel
        if (!tradeRecord.buyer.equals(buyTrader.publicKey)) {
            throw new Error("Only the buy trader can cancel this trade");
        }

        // Check if already settled
        if (tradeRecord.settled) {
            throw new Error("Trade has already been settled");
        }

        // Get token market and check grace period
        const tokenMarket = await tradingProgram.account.tokenMarket.fetch(tradeRecord.tokenId) as any;
        const currentTime = Math.floor(Date.now() / 1000);
        const gracePeriodEnd = tradeRecord.matchTime.toNumber() + tokenMarket.settleTimeLimit;

        console.log(`⏰ Current Time: ${new Date(currentTime * 1000).toISOString()}`);
        console.log(`⏰ Grace Period End: ${new Date(gracePeriodEnd * 1000).toISOString()}`);
        console.log(`⏰ Time Until Grace Period End: ${Math.max(0, gracePeriodEnd - currentTime)} seconds`);

        if (currentTime <= gracePeriodEnd) {
            throw new Error("Grace period has not expired yet. Cannot cancel trade.");
        }

        const collateralMint = tradeRecord.collateralMint;
        console.log(`💎 Collateral Mint: ${collateralMint.toString()}`);

        // Get PDAs
        const [tradeConfigPDA] = getTradeConfigPDA(tradingProgramId);
        const [vaultConfigPDA] = getVaultConfigPDA(vaultProgramId);
        const [buyUserBalancePDA] = getUserBalancePDA(vaultProgramId, tradeRecord.buyer, collateralMint);
        const [sellUserBalancePDA] = getUserBalancePDA(vaultProgramId, tradeRecord.seller, collateralMint);
        const [vaultAuthorityPDA] = getVaultAuthorityPDA(vaultProgramId, collateralMint);

        // Get associated token accounts
        const buyerCollateralAta = getAssociatedTokenAddressSync(collateralMint, buyTrader.publicKey);
        const sellerCollateralAta = getAssociatedTokenAddressSync(collateralMint, tradeRecord.seller);
        const vaultAta = await getAssociatedTokenAddress(collateralMint, vaultAuthorityPDA, true);

        // Get trade config data
        const tradeConfig = await tradingProgram.account.tradeConfig.fetch(tradeConfigPDA) as any;
        console.log("\n📊 Trade Config Data:");
        console.log(`  Admin: ${tradeConfig.admin.toString()}`);
        console.log(`  Vault Program: ${tradeConfig.vaultProgram.toString()}`);
        console.log(`  Buyer Collateral Ratio: ${tradeConfig.economicConfig.buyerCollateralRatio}`);
        console.log(`  Seller Collateral Ratio: ${tradeConfig.economicConfig.sellerCollateralRatio}`);
        console.log(`  Seller Reward BPS: ${tradeConfig.economicConfig.sellerRewardBps}`);
        console.log(`  Late Penalty BPS: ${tradeConfig.economicConfig.latePenaltyBps}`);
        console.log(`  Min Fill Amount: ${tradeConfig.economicConfig.minimumFillAmount.toString()}`);
        console.log(`  Max Order Amount: ${tradeConfig.economicConfig.maximumOrderAmount.toString()}`);
        console.log(`  Min Settle Time: ${tradeConfig.technicalConfig.minSettleTime}`);
        console.log(`  Max Settle Time: ${tradeConfig.technicalConfig.maxSettleTime}`);


        console.log("🔑 Accounts:");
        console.log(`  Buyer Collateral ATA: ${buyerCollateralAta.toString()}`);
        console.log(`  Seller Collateral ATA: ${sellerCollateralAta.toString()}`);
        console.log(`  Vault ATA: ${vaultAta.toString()}`);
        console.log(`  Trade Config: ${tradeConfigPDA.toString()}`);
        console.log(`  Vault Config: ${vaultConfigPDA.toString()}`);
        console.log(`  Buy User Balance: ${buyUserBalancePDA.toString()}`);
        console.log(`  Sell User Balance: ${sellUserBalancePDA.toString()}`);
        console.log(`  Vault Authority: ${vaultAuthorityPDA.toString()}`);

        // Cancel trade
        console.log("🚀 Cancelling trade...");

        const tx = await tradingProgram.methods
            .cancelTrade()
            .accounts({
                tradeRecord: tradeRecordAddress,
                tokenMarket: tradeRecord.tokenId,
                config: tradeConfigPDA,
                buyer: buyTrader.publicKey,
                vaultProgram: vaultProgramId,
                vaultConfig: vaultConfigPDA,
                buyerBalance: buyUserBalancePDA,
                sellerBalance: sellUserBalancePDA,
                vaultAuthority: vaultAuthorityPDA,
                vaultAta: vaultAta,
                buyerCollateralAta: buyerCollateralAta,
                sellerCollateralAta: sellerCollateralAta,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
            }).postInstructions([
                // Tăng compute budget
                anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
                    units: 400_000 // Tăng từ 200k lên 400k
                })
            ])
            .signers([buyTrader])
            .rpc();

        console.log(`✅ Trade cancelled successfully!`);
        console.log(`🔗 Transaction: ${tx}`);

        // Verify cancellation
        const updatedTradeRecord = await tradingProgram.account.tradeRecord.fetch(tradeRecordAddress) as any;
        console.log(`✅ Verified - Trade Status: ${updatedTradeRecord.settled ? 'Cancelled' : 'Not Cancelled'}`);

        if (updatedTradeRecord.settled) {
            console.log(`❌ Trade successfully cancelled!`);
            console.log(`⚠️  Late cancellation - Penalties applied`);
            console.log(`💰 Buyer receives compensation from seller's collateral`);
            console.log(`💎 Remaining collateral returned to seller`);
        } else {
            console.log(`⚠️  Trade not cancelled yet`);
        }

        console.log("🎉 Trade cancellation completed!");

    } catch (error) {
        console.error("❌ Trade cancellation failed:", error);
        throw error;
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    cancelTrade()
        .then(() => {
            console.log("✅ Script completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

export { cancelTrade, loadKeypairFromFile, getTradeConfigPDA, getVaultConfigPDA, getUserBalancePDA }; 