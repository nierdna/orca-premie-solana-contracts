#!/usr/bin/env ts-node

/**
 * Settle Trade Script
 * Seller delivers tokens to buyer - Final settlement
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    ComputeBudgetProgram,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
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
 * Check if an account exists
 */
async function accountExists(connection: Connection, address: PublicKey): Promise<boolean> {
    try {
        const accountInfo = await connection.getAccountInfo(address);
        return accountInfo !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Settle trade
 */
async function settleTrade(): Promise<void> {
    console.log("✅ Starting Trade Settlement...");

    // Validate required environment variables
    const requiredEnvVars = [
        'SOLANA_NETWORK', 'RPC_URL', 'SELL_TRADER_KEYPAIR',
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
        const sellTrader = loadKeypairFromFile(process.env.SELL_TRADER_KEYPAIR!);

        // Get addresses from environment
        const tradeRecordAddress = new PublicKey(process.env.TRADE_RECORD_ADDRESS!);

        // Program IDs
        const vaultProgramId = new PublicKey('a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE');
        const tradingProgramId = new PublicKey('Amj2QtxyLr6GMgBzN2pB5qaq5V8J7jTBrqc4Ar7y4G5t');

        console.log(`🏪 Sell Trader: ${sellTrader.publicKey.toString()}`);
        console.log(`📋 Trade Record: ${tradeRecordAddress.toString()}`);

        // Setup Anchor provider
        const provider = new anchor.AnchorProvider(
            connection,
            new anchor.Wallet(sellTrader),
            { commitment: 'confirmed' }
        );
        anchor.setProvider(provider);

        // Load trading program
        let tradingProgram;
        try {
            const idlPath = `target/idl/premarket_trade.json`;
            if (fs.existsSync(idlPath)) {
                console.log(`🔍 Loading trading program IDL from ${idlPath}`);
                const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
                tradingProgram = new anchor.Program(idl, tradingProgramId, provider);
                console.log(`✅ Trading program loaded successfully`);
            } else {
                console.log(`🔍 Loading trading program IDL from ${idlPath}`);
                tradingProgram = await anchor.Program.at(tradingProgramId, provider);
                console.log(`✅ Trading program loaded successfully`);
            }
        } catch (error) {
            console.error("❌ Failed to load trading program IDL:", error);
            throw new Error("Failed to load trading program IDL");
        }

        // Fetch trade record to get required information
        console.log(`🔍 Fetching trade record from ${tradeRecordAddress.toString()}`);
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
        if (tradeRecord.targetMint) {
            console.log(`  Target Mint: ${tradeRecord.targetMint.toString()}`);
        }

        // Verify sell trader
        if (!tradeRecord.seller.equals(sellTrader.publicKey)) {
            throw new Error("Only the sell trader can settle this trade");
        }

        // Check if already settled
        if (tradeRecord.settled) {
            throw new Error("Trade has already been settled");
        }

        // Get token market and real token info
        const tokenMarket = await tradingProgram.account.tokenMarket.fetch(tradeRecord.tokenId) as any;
        const realTokenMint = tokenMarket.realMint;
        const collateralMint = tradeRecord.collateralMint;

        console.log(`🪙 Real Token Mint: ${realTokenMint.toString()}`);
        console.log(`💎 Collateral Mint: ${collateralMint.toString()}`);

        // Get PDAs
        const [tradeConfigPDA] = getTradeConfigPDA(tradingProgramId);
        const [vaultConfigPDA] = getVaultConfigPDA(vaultProgramId);
        const [sellUserBalancePDA] = getUserBalancePDA(vaultProgramId, tradeRecord.seller, collateralMint);
        const [vaultAuthorityPDA] = getVaultAuthorityPDA(vaultProgramId, collateralMint);

        // Get associated token accounts
        const sellerTokenAta = getAssociatedTokenAddressSync(realTokenMint, sellTrader.publicKey);
        const buyerTokenAta = getAssociatedTokenAddressSync(realTokenMint, tradeRecord.buyer);
        const sellerCollateralAta = getAssociatedTokenAddressSync(collateralMint, sellTrader.publicKey);
        const vaultAta = await getAssociatedTokenAddress(collateralMint, vaultAuthorityPDA, true);

        // Check if buyer's token account exists
        const buyerAccountExists = await accountExists(connection, buyerTokenAta);
        console.log(`🔍 Buyer Token Account exists: ${buyerAccountExists}`);

        console.log("🔑 Accounts:");
        console.log(`  Seller Token ATA: ${sellerTokenAta.toString()}`);
        console.log(`  Buyer Token ATA: ${buyerTokenAta.toString()}`);
        console.log(`  Seller Collateral ATA: ${sellerCollateralAta.toString()}`);
        console.log(`  Vault ATA: ${vaultAta.toString()}`);
        console.log(`  Trade Config: ${tradeConfigPDA.toString()}`);
        console.log(`  Vault Config: ${vaultConfigPDA.toString()}`);
        console.log(`  Sell User Balance: ${sellUserBalancePDA.toString()}`);
        console.log(`  Vault Authority: ${vaultAuthorityPDA.toString()}`);

        // Prepare instructions
        const instructions: TransactionInstruction[] = [];

        // Add create associated token account instruction if needed
        if (!buyerAccountExists) {
            console.log("🏗️ Creating buyer's associated token account...");
            const createAccountIx = createAssociatedTokenAccountInstruction(
                sellTrader.publicKey, // payer
                buyerTokenAta,        // associated token account
                tradeRecord.buyer,    // owner
                realTokenMint,        // mint
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            instructions.push(createAccountIx);
        }

        // Add settle trade instruction
        console.log("🚀 Preparing settle trade instruction...");
        const settleTradeIx = await tradingProgram.methods
            .settleTrade()
            .accounts({
                tradeRecord: tradeRecordAddress,
                tokenMarket: tradeRecord.tokenId,
                config: tradeConfigPDA,
                seller: sellTrader.publicKey,
                vaultProgram: vaultProgramId,
                vaultConfig: vaultConfigPDA,
                sellerBalance: sellUserBalancePDA,
                vaultAuthority: vaultAuthorityPDA,
                vaultAta: vaultAta,
                sellerCollateralAta: sellerCollateralAta,
                sellerTokenAta: sellerTokenAta,
                buyerTokenAta: buyerTokenAta,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
            })
            .instruction();

        instructions.push(settleTradeIx);

        // Create and send transaction
        console.log(`📦 Creating transaction with ${instructions.length} instruction(s)...`);
        const transaction = new Transaction();
        transaction.add(...instructions).add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 }));

        // Send transaction
        const tx = await provider.sendAndConfirm(transaction, [sellTrader], {
            commitment: 'confirmed'
        });

        console.log(`✅ Trade settled successfully!`);
        console.log(`🔗 Transaction: ${tx}`);

        // Verify settlement
        const updatedTradeRecord = await tradingProgram.account.tradeRecord.fetch(tradeRecordAddress) as any;
        console.log(`✅ Verified - Trade Status: ${updatedTradeRecord.settled ? 'Settled' : 'Not Settled'}`);

        if (updatedTradeRecord.settled) {
            console.log(`🎉 Trade successfully settled!`);
            console.log(`💰 Buyer received ${tradeRecord.filledAmount.toString()} tokens`);
            console.log(`💎 Collateral returned to both parties`);
        } else {
            console.log(`⚠️  Trade not settled yet`);
        }

        console.log("🎉 Trade settlement completed!");

    } catch (error) {
        console.error("❌ Trade settlement failed:", error);
        throw error;
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    settleTrade()
        .then(() => {
            console.log("✅ Script completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

export { settleTrade, loadKeypairFromFile, getTradeConfigPDA, getVaultConfigPDA, getUserBalancePDA }; 