#!/usr/bin/env ts-node

/**
 * Add Authorized Trader Script
 * Based on DEPLOYMENT_GUIDE.md specifications
 * 
 * This script adds a trading program to vault's authorized traders list.
 * Only admin can perform this operation.
 * Essential for cross-program integration.
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";
import * as fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Types for our program - matches Anchor generated types
interface VaultConfig {
    admin: PublicKey;
    emergencyAdmin: PublicKey;
    paused: boolean;
    authorizedTraders: PublicKey[];
    bump: number;
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
 * Get vault config PDA
 */
function getVaultConfigPDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vault_config")],
        programId
    );
}

/**
 * Main function to add authorized trader
 */
async function addAuthorizedTrader(): Promise<void> {
    console.log("🚀 Starting Add Authorized Trader...");
    console.log("=====================================");

    // Validate environment variables
    const requiredEnvVars = [
        'SOLANA_NETWORK',
        'RPC_URL',
        'ADMIN_KEYPAIR'
    ];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }

    // Get trader program ID from command line or use default trading program
    let traderProgramId: PublicKey;
    const args = process.argv.slice(2);

    if (args.length > 0) {
        try {
            traderProgramId = new PublicKey(args[0]);
            console.log(`📈 Using provided Trading Program ID: ${traderProgramId.toString()}`);
        } catch (error) {
            console.error("❌ Invalid program ID provided");
            process.exit(1);
        }
    } else {
        // Default to our trading program
        traderProgramId = new PublicKey('Amj2QtxyLr6GMgBzN2pB5qaq5V8J7jTBrqc4Ar7y4G5t');
        console.log(`📈 Using default Trading Program ID: ${traderProgramId.toString()}`);
    }

    try {
        // 1. Setup connection and keypairs
        console.log("🔗 Setting up connection and keypairs...");
        const connection = new Connection(process.env.RPC_URL!, 'confirmed');

        const admin = loadKeypairFromFile(process.env.ADMIN_KEYPAIR!);

        console.log(`📡 Network: ${process.env.SOLANA_NETWORK}`);
        console.log(`🏦 RPC URL: ${process.env.RPC_URL}`);
        console.log(`👑 Admin: ${admin.publicKey.toString()}`);

        // 2. Get vault program ID
        const vaultProgramId = new PublicKey('a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE');
        console.log(`🏗️ Vault Program ID: ${vaultProgramId.toString()}`);

        // 3. Setup Anchor provider and program
        console.log("\n⚓ Setting up Anchor provider...");
        const provider = new anchor.AnchorProvider(
            connection,
            new anchor.Wallet(admin),
            { commitment: 'confirmed' }
        );
        anchor.setProvider(provider);

        // Load the vault program IDL
        let vaultProgram;
        try {
            const idlPath = `target/idl/escrow_vault.json`;
            if (fs.existsSync(idlPath)) {
                const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
                vaultProgram = new anchor.Program(idl, vaultProgramId, provider);
            } else {
                vaultProgram = await anchor.Program.at(vaultProgramId, provider);
            }
        } catch (error) {
            console.error("❌ Failed to load vault program IDL. Make sure program is deployed and IDL is available.");
            throw error;
        }

        // 4. Get vault config PDA
        const [vaultConfigPDA] = getVaultConfigPDA(vaultProgramId);
        console.log(`🔑 Vault Config PDA: ${vaultConfigPDA.toString()}`);

        // 5. Check current vault config and authorized traders
        console.log("\n🔍 Checking current vault configuration...");
        let vaultConfig: VaultConfig;
        try {
            vaultConfig = await vaultProgram.account.vaultConfig.fetch(vaultConfigPDA) as VaultConfig;

            console.log("📋 Current Vault Configuration:");
            console.log(`   Admin: ${vaultConfig.admin.toString()}`);
            console.log(`   Emergency Admin: ${vaultConfig.emergencyAdmin.toString()}`);
            console.log(`   Paused: ${vaultConfig.paused}`);
            console.log(`   Current Authorized Traders: ${vaultConfig.authorizedTraders.length}`);

            // Display current authorized traders
            if (vaultConfig.authorizedTraders.length > 0) {
                console.log("\n📝 Currently Authorized Traders:");
                vaultConfig.authorizedTraders.forEach((trader, index) => {
                    console.log(`   ${index + 1}. ${trader.toString()}`);
                });
            }

        } catch (error) {
            console.error("❌ Vault not initialized. Please initialize vault first.");
            throw error;
        }

        // 6. Verify admin authority
        if (!vaultConfig.admin.equals(admin.publicKey)) {
            console.error("❌ Admin keypair does not match vault admin");
            console.error(`   Vault admin: ${vaultConfig.admin.toString()}`);
            console.error(`   Your admin: ${admin.publicKey.toString()}`);
            throw new Error("Unauthorized: Admin mismatch");
        }

        // 7. Check if trader is already authorized
        const isAlreadyAuthorized = vaultConfig.authorizedTraders.some(
            trader => trader.equals(traderProgramId)
        );

        if (isAlreadyAuthorized) {
            console.log("⚠️  Trading program is already authorized!");
            console.log(`   Program ID: ${traderProgramId.toString()}`);
            console.log("\n✅ No action needed. Trader is already in authorized list.");
            return;
        }

        // 8. Check if vault is paused
        if (vaultConfig.paused) {
            console.error("❌ Vault is currently paused. Cannot add authorized traders.");
            throw new Error("Vault paused");
        }

        // 9. Add authorized trader
        console.log("\n🚀 Adding authorized trader...");
        console.log(`   Trading Program: ${traderProgramId.toString()}`);
        console.log(`   Admin: ${admin.publicKey.toString()}`);

        let tx: string;

        try {
            // Simulate transaction first
            const simulation = await vaultProgram.methods
                .addAuthorizedTrader(traderProgramId)
                .accounts({
                    config: vaultConfigPDA,
                    admin: admin.publicKey,
                })
                .simulate();

            console.log("✅ Transaction simulation successful");

            // Execute actual transaction
            tx = await vaultProgram.methods
                .addAuthorizedTrader(traderProgramId)
                .accounts({
                    config: vaultConfigPDA,
                    admin: admin.publicKey,
                })
                .signers([admin])
                .rpc();

            console.log(`✅ Authorized trader added successfully!`);
            console.log(`🔗 Transaction: ${tx}`);

        } catch (error) {
            console.error("❌ Transaction failed:");
            console.error("Error details:", error);
            throw error;
        }

        // 10. Verify addition
        console.log("\n🔍 Verifying trader addition...");
        const updatedConfig = await vaultProgram.account.vaultConfig.fetch(vaultConfigPDA) as VaultConfig;

        console.log("📋 Updated Vault Configuration:");
        console.log(`   Total Authorized Traders: ${updatedConfig.authorizedTraders.length}`);

        const isNowAuthorized = updatedConfig.authorizedTraders.some(
            trader => trader.equals(traderProgramId)
        );

        if (isNowAuthorized) {
            console.log(`✅ Trader successfully authorized: ${traderProgramId.toString()}`);
        } else {
            console.error("❌ Trader not found in authorized list after transaction");
            throw new Error("Verification failed");
        }

        // 11. Display all authorized traders
        console.log("\n📝 All Authorized Traders:");
        updatedConfig.authorizedTraders.forEach((trader, index) => {
            const isNew = trader.equals(traderProgramId);
            console.log(`   ${index + 1}. ${trader.toString()} ${isNew ? '🆕' : ''}`);
        });

        // 12. Get transaction details
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

        console.log("\n🎉 Authorized trader addition completed successfully!");
        console.log("=====================================");

        // 13. Next steps information
        console.log("\n📝 Next Steps:");
        console.log("1. The trading program can now make CPI calls to vault");
        console.log("2. Test cross-program integration");
        console.log("3. Begin trading operations");

        console.log("\n🔗 Useful Commands:");
        console.log(`   View vault config: solana account ${vaultConfigPDA.toString()}`);
        console.log(`   View trading program: solana program show ${traderProgramId.toString()}`);

    } catch (error) {
        console.error("❌ Add authorized trader failed:");
        console.error(error);
        process.exit(1);
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    addAuthorizedTrader()
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

export { addAuthorizedTrader, loadKeypairFromFile, getVaultConfigPDA }; 