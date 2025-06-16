#!/usr/bin/env ts-node

/**
 * Initialize Vault Program Script
 * Based on DEPLOYMENT_GUIDE.md specifications
 * 
 * This script initializes the vault system with admin and emergency admin
 * following the exact pattern from the deployment documentation.
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
 * Get or create PDA for vault config
 */
function getVaultConfigPDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vault_config")],
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
 * Main initialization function
 */
async function initializeVault(): Promise<void> {
    console.log("🚀 Starting Vault Program Initialization...");
    console.log("=====================================");

    // Validate environment variables
    const requiredEnvVars = [
        'SOLANA_NETWORK',
        'RPC_URL',
        'DEPLOYER_KEYPAIR',
        'ADMIN_KEYPAIR',
        'EMERGENCY_ADMIN_KEYPAIR'
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
        console.log(deployer);
        const admin = loadKeypairFromFile(process.env.ADMIN_KEYPAIR!);
        const emergencyAdmin = loadKeypairFromFile(process.env.EMERGENCY_ADMIN_KEYPAIR!);

        console.log(`📡 Network: ${process.env.SOLANA_NETWORK}`);
        console.log(`🏦 RPC URL: ${process.env.RPC_URL}`);
        console.log(`👤 Deployer: ${deployer.publicKey.toString()}`);
        console.log(`👑 Admin: ${admin.publicKey.toString()}`);
        console.log(`🚨 Emergency Admin: ${emergencyAdmin.publicKey.toString()}`);

        // 2. Ensure accounts are funded
        console.log("\n💰 Checking account funding...");
        // await ensureFunding(connection, deployer, 2);
        // await ensureFunding(connection, admin, 1);
        // await ensureFunding(connection, emergencyAdmin, 1);

        // 3. Get vault program ID
        // const vaultProgramKeypair = loadKeypairFromFile(process.env.VAULT_PROGRAM_KEYPAIR!);
        const vaultProgramId = new PublicKey('a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE');

        console.log(`🏗️ Vault Program ID: ${vaultProgramId.toString()}`);

        // 4. Setup Anchor provider and program
        console.log("\n⚓ Setting up Anchor provider...");
        const provider = new anchor.AnchorProvider(
            connection,
            new anchor.Wallet(deployer),
            { commitment: 'confirmed' }
        );
        anchor.setProvider(provider);

        // Load the program IDL
        let vaultProgram;
        try {
            // Try to load from target/idl first
            const idlPath = `target/idl/escrow_vault.json`;
            if (fs.existsSync(idlPath)) {
                const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
                vaultProgram = new anchor.Program(idl, vaultProgramId, provider);
            } else {
                // Try to fetch from chain
                vaultProgram = await anchor.Program.at(vaultProgramId, provider);
            }
        } catch (error) {
            console.error("❌ Failed to load program IDL. Make sure program is deployed and IDL is available.");
            throw error;
        }

        // 5. Get vault config PDA
        const [vaultConfigPDA, vaultConfigBump] = getVaultConfigPDA(vaultProgramId);
        console.log(`🔑 Vault Config PDA: ${vaultConfigPDA.toString()}`);
        console.log(`🎯 PDA Bump: ${vaultConfigBump}`);

        // 6. Check if vault is already initialized
        console.log("\n🔍 Checking if vault is already initialized...");
        try {
            const existingConfig = await vaultProgram.account.vaultConfig.fetch(vaultConfigPDA) as VaultConfig;
            console.log("⚠️  Vault already initialized!");
            console.log(`   Admin: ${existingConfig.admin.toString()}`);
            console.log(`   Emergency Admin: ${existingConfig.emergencyAdmin.toString()}`);
            console.log(`   Paused: ${existingConfig.paused}`);
            console.log(`   Authorized Traders: ${existingConfig.authorizedTraders.length}`);

            // Ask user if they want to continue
            console.log("\n🤔 Vault is already initialized. Exiting...");
            return;
        } catch (error) {
            console.log("✅ Vault not yet initialized. Proceeding...");
        }

        // 7. Initialize the vault
        console.log("\n🚀 Initializing vault...");
        console.log(`   Admin: ${admin.publicKey.toString()}`);
        console.log(`   Emergency Admin: ${emergencyAdmin.publicKey.toString()}`);
        let tx: string;

        try {
            // Simulate transaction first
            const simulation = await vaultProgram.methods
                .initializeVault(admin.publicKey, emergencyAdmin.publicKey)
                .accounts({
                    config: vaultConfigPDA,
                    admin: deployer.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .simulate();

            console.log("✅ Transaction simulation successful");

            // Execute actual transaction
            tx = await vaultProgram.methods
                .initializeVault(admin.publicKey, emergencyAdmin.publicKey)
                .accounts({
                    config: vaultConfigPDA,
                    admin: deployer.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([deployer])
                .rpc();

            console.log(`✅ Vault initialized successfully!`);
            console.log(`🔗 Transaction: ${tx}`);
        } catch (error) {
            console.error("❌ Transaction failed:");
            console.error("Error details:", error);
            throw error;
        }


        // 8. Verify initialization
        console.log("\n🔍 Verifying initialization...");
        const vaultConfig = await vaultProgram.account.vaultConfig.fetch(vaultConfigPDA) as VaultConfig;

        console.log("📋 Vault Configuration:");
        console.log(`   Admin: ${vaultConfig.admin.toString()}`);
        console.log(`   Emergency Admin: ${vaultConfig.emergencyAdmin.toString()}`);
        console.log(`   Paused: ${vaultConfig.paused}`);
        console.log(`   Authorized Traders: ${vaultConfig.authorizedTraders.length}`);
        console.log(`   Bump: ${vaultConfig.bump}`);

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

        console.log("\n🎉 Vault initialization completed successfully!");
        console.log("=====================================");

        // 10. Next steps information
        console.log("\n📝 Next Steps:");
        console.log("1. Deploy and initialize Trading Program");
        console.log("2. Authorize Trading Program in Vault");
        console.log("3. Configure supported tokens");
        console.log("4. Test basic operations");

        console.log("\n🔗 Useful Commands:");
        console.log(`   View vault config: solana account ${vaultConfigPDA.toString()}`);
        console.log(`   View program: solana program show ${vaultProgramId.toString()}`);

    } catch (error) {
        console.error("❌ Vault initialization failed:");
        console.error(error);
        process.exit(1);
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    initializeVault()
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

export { initializeVault, loadKeypairFromFile, getVaultConfigPDA }; 