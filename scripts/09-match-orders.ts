#!/usr/bin/env ts-node

/**
 * Match Orders Script
 * Core business logic - Match buy and sell orders with collateral locking
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import * as fs from "fs";
import dotenv from "dotenv";
import { getVaultConfigPDA } from "./01-initialize-vault";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getVaultAuthorityPDA } from "./03-deposit-collateral";
import { Program } from "@coral-xyz/anchor";
import { PremarketTrade } from "../target/types/premarket_trade";
import { EscrowVault } from "../target/types/escrow_vault";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

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

function getOrderStatusPDA(programId: PublicKey, trader: PublicKey, nonce: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("order_status"),
            trader.toBuffer(),
            new anchor.BN(nonce).toArrayLike(Buffer, 'le', 8)
        ],
        programId
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

// Signature functions removed - not needed in relayer-authorized model

// Load programs
// const provider = anchor.AnchorProvider.env();
// anchor.setProvider(provider);

// const tradingProgram = anchor.workspace.PremarketTrade as Program<PremarketTrade>;
// const vaultProgram = anchor.workspace.EscrowVault as Program<EscrowVault>;

// Constants
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const PRICE_SCALE = 1_000_000; // 6 decimals

/**
 * Match orders
 */
async function matchOrders(): Promise<void> {
    console.log("🎯 Starting Order Matching...");

    // Validate required environment variables
    const requiredEnvVars = [
        'SOLANA_NETWORK', 'RPC_URL', 'RELAYER_KEYPAIR',
        'TOKEN_MARKET_ADDRESS', 'COLLATERAL_MINT',
        'BUY_TRADER_KEYPAIR', 'SELL_TRADER_KEYPAIR',
        'ORDER_AMOUNT', 'ORDER_PRICE', 'BUY_NONCE', 'SELL_NONCE'
    ];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }

    try {
        // Setup connection and keypairs
        const connection = new Connection(process.env.RPC_URL!, 'confirmed');
        const relayer = loadKeypairFromFile(process.env.RELAYER_KEYPAIR!);
        const buyTrader = loadKeypairFromFile(process.env.BUY_TRADER_KEYPAIR!);
        const sellTrader = loadKeypairFromFile(process.env.SELL_TRADER_KEYPAIR!);

        // Generate keypair for TradeRecord (user-controlled, not PDA)
        const tradeRecord = Keypair.generate();

        // Get addresses from environment
        const tokenMarketAddress = new PublicKey(process.env.TOKEN_MARKET_ADDRESS!);
        const collateralMint = new PublicKey(process.env.COLLATERAL_MINT!);

        // Order parameters
        const amount = parseInt(process.env.ORDER_AMOUNT!);
        const price = parseInt(process.env.ORDER_PRICE!);
        const buyNonce = parseInt(process.env.BUY_NONCE!);
        const sellNonce = parseInt(process.env.SELL_NONCE!);
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        const fillAmount = process.env.FILL_AMOUNT ? parseInt(process.env.FILL_AMOUNT!) : null;

        // Program IDs
        const vaultProgramId = new PublicKey('a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE');
        const tradingProgramId = new PublicKey('Amj2QtxyLr6GMgBzN2pB5qaq5V8J7jTBrqc4Ar7y4G5t');

        console.log(`🤖 Relayer: ${relayer.publicKey.toString()}`);
        console.log(`💰 Buy Trader: ${buyTrader.publicKey.toString()}`);
        console.log(`🏪 Sell Trader: ${sellTrader.publicKey.toString()}`);
        console.log(`📋 Trade Record: ${tradeRecord.publicKey.toString()}`);
        console.log(`🏪 Token Market: ${tokenMarketAddress.toString()}`);
        console.log(`💎 Collateral Mint: ${collateralMint.toString()}`);
        console.log(`📊 Amount: ${amount}, Price: ${price}`);
        if (fillAmount) console.log(`🎯 Fill Amount: ${fillAmount}`);

        // Setup Anchor provider
        const provider = new anchor.AnchorProvider(
            connection,
            new anchor.Wallet(relayer),
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

        // Create PreOrder objects
        const buyOrder = {
            trader: buyTrader.publicKey,
            collateralToken: collateralMint,
            tokenId: tokenMarketAddress, // TokenMarket address as token_id
            amount: new anchor.BN(amount),
            price: new anchor.BN(price),
            isBuy: true,
            nonce: new anchor.BN(buyNonce),
            deadline: new anchor.BN(deadline),
        };

        const sellOrder = {
            trader: sellTrader.publicKey,
            collateralToken: collateralMint,
            tokenId: tokenMarketAddress, // TokenMarket address as token_id
            amount: new anchor.BN(amount),
            price: new anchor.BN(price),
            isBuy: false,
            nonce: new anchor.BN(sellNonce),
            deadline: new anchor.BN(deadline),
        };

        // No need to sign orders in relayer-authorized model
        console.log("🔐 Relayer-authorized matching model - no signatures needed");

        // Get PDAs
        const [tradeConfigPDA] = getTradeConfigPDA(tradingProgramId);
        const [buyOrderStatusPDA] = getOrderStatusPDA(tradingProgramId, buyTrader.publicKey, buyNonce);
        const [sellOrderStatusPDA] = getOrderStatusPDA(tradingProgramId, sellTrader.publicKey, sellNonce);
        const [buyUserBalancePDA] = getUserBalancePDA(vaultProgramId, buyTrader.publicKey, collateralMint);
        const [sellUserBalancePDA] = getUserBalancePDA(vaultProgramId, sellTrader.publicKey, collateralMint);
        const [vaultConfigPDA] = getVaultConfigPDA(vaultProgramId);
        const [vaultAuthorityPDA] = getVaultAuthorityPDA(vaultProgramId, collateralMint);
        const buyerCollateralAta = await getAssociatedTokenAddress(collateralMint, buyTrader.publicKey);
        const sellerCollateralAta = await getAssociatedTokenAddress(collateralMint, sellTrader.publicKey);


        console.log("🔑 PDAs:");
        console.log(`  Trade Config: ${tradeConfigPDA.toString()}`);
        console.log(`  Buy Order Status: ${buyOrderStatusPDA.toString()}`);
        console.log(`  Sell Order Status: ${sellOrderStatusPDA.toString()}`);
        console.log(`  Buy User Balance: ${buyUserBalancePDA.toString()}`);
        console.log(`  Sell User Balance: ${sellUserBalancePDA.toString()}`);

        // Match orders - ultra lightweight transaction
        console.log("🚀 Matching orders with relayer authorization...");

        const tx = await tradingProgram.methods
            .matchOrders(
                buyOrder,
                sellOrder,
                fillAmount ? new anchor.BN(fillAmount) : null
            )
            .accounts({
                relayer: relayer.publicKey,
                tradeRecord: tradeRecord.publicKey,
                tokenMarket: tokenMarketAddress,
                config: tradeConfigPDA,
                // buyOrderStatus: buyOrderStatusPDA,
                // sellOrderStatus: sellOrderStatusPDA,
                buyerBalance: buyUserBalancePDA,
                sellerBalance: sellUserBalancePDA,
                vaultProgram: vaultProgramId,
                vaultConfig: vaultConfigPDA,
                vaultAuthority: vaultAuthorityPDA,
                buyerCollateralAta: buyerCollateralAta,
                sellerCollateralAta: sellerCollateralAta,
                tokenProgram: TOKEN_PROGRAM_ID,           
                systemProgram: SystemProgram.programId,
                instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
            }).preInstructions([
            // Much lower compute budget needed - no signature verification
                anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
                    units: 450_000 // Reduced from 400k - no Ed25519Program overhead
                })
            ])
            .signers([relayer, tradeRecord])
            .rpc();

        console.log(`✅ Orders matched successfully!`);
        console.log(`🔗 Transaction: ${tx}`);
        console.log(`📋 Trade Record: ${tradeRecord.publicKey.toString()}`);

        // Save trade record keypair for future settlement
        // const keypairPath = `./keys/trade-record-${Date.now()}.json`;
        // fs.writeFileSync(keypairPath, JSON.stringify(Array.from(tradeRecord.secretKey)));
        // console.log(`💾 Trade record keypair saved to: ${keypairPath}`);

        // Verify trade creation
        console.log("🔍 Verifying trade creation...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        const tradeRecordAccount = await tradingProgram.account.tradeRecord.fetch(tradeRecord.publicKey, 'processed') as any;
        console.log(`✅ Trade Record: ${tradeRecordAccount}`);
        // console.log(`✅ Verified - Trade Status: ${Object.keys(tradeRecordAccount.status)[0]}`);
        // console.log(`✅ Verified - Buy Trader: ${tradeRecordAccount.buyTrader.toString()}`);
        // console.log(`✅ Verified - Sell Trader: ${tradeRecordAccount.sellTrader.toString()}`);
        // console.log(`✅ Verified - Amount: ${tradeRecordAccount.amount.toString()}`);
        // console.log(`✅ Verified - Price: ${tradeRecordAccount.price.toString()}`);

        console.log("🎉 Order matching completed!");

    } catch (error) {
        console.error("❌ Order matching failed:", error);
        throw error;
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    matchOrders()
        .then(() => {
            console.log("✅ Script completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

export { matchOrders, loadKeypairFromFile, getTradeConfigPDA, getOrderStatusPDA, getUserBalancePDA }; 