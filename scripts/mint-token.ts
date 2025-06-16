#!/usr/bin/env ts-node

/**
 * Mint Token Script
 * Based on DEPLOYMENT_GUIDE.md specifications
 * 
 * This script mints test tokens for development and testing purposes.
 * Can create new token mints or mint to existing mints.
 * Useful for testing vault deposits and trading operations.
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    getAssociatedTokenAddress,
    getMintLen,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getMinimumBalanceForRentExemptMint
} from "@solana/spl-token";
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
 * Parse amount with decimals
 */
function parseTokenAmount(amount: string, decimals: number = 6): bigint {
    const parts = amount.split('.');
    const wholePart = parts[0] || '0';
    const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);

    const totalAmount = wholePart + fractionalPart;
    return BigInt(totalAmount);
}

/**
 * Format token amount for display
 */
function formatTokenAmount(amount: bigint, decimals: number = 6): string {
    const amountStr = amount.toString();
    const wholePart = amountStr.slice(0, -decimals) || '0';
    const fractionalPart = amountStr.slice(-decimals).padStart(decimals, '0');
    return `${wholePart}.${fractionalPart}`;
}

/**
 * Generate random token name and symbol
 */
function generateTokenInfo(): { name: string; symbol: string } {
    const adjectives = ['Fast', 'Smart', 'Epic', 'Super', 'Ultra', 'Mega', 'Hyper', 'Quantum'];
    const nouns = ['Token', 'Coin', 'Cash', 'Credit', 'Point', 'Dollar', 'Buck', 'Gem'];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return {
        name: `${adjective} ${noun}`,
        symbol: `${adjective.slice(0, 2).toUpperCase()}${noun.slice(0, 2).toUpperCase()}`
    };
}

/**
 * Main function to mint tokens
 */
async function mintToken(): Promise<void> {
    console.log("🚀 Starting Token Minting...");
    console.log("=====================================");

    // Parse command line arguments
    const args = process.argv.slice(2);
    let tokenMint: PublicKey | null = null;
    let mintAmount: bigint;
    let decimals = 6;
    let createNewMint = false;

    if (args.length === 0) {
        console.error("❌ Usage:");
        console.error("   Create new mint: npx ts-node scripts/mint-token.ts new <amount> [decimals]");
        console.error("   Mint to existing: npx ts-node scripts/mint-token.ts <mint_address> <amount>");
        console.error("");
        console.error("   Examples:");
        console.error("   npx ts-node scripts/mint-token.ts new 1000000 6");
        console.error("   npx ts-node scripts/mint-token.ts 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 50000");
        console.error("");
        console.error("   Common devnet tokens:");
        console.error("   - USDC: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
        console.error("   - USDT: EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS");
        process.exit(1);
    }

    try {
        if (args[0].toLowerCase() === 'new') {
            createNewMint = true;
            if (args.length < 2) {
                console.error("❌ Amount required for new mint");
                process.exit(1);
            }
            mintAmount = parseTokenAmount(args[1], decimals);
            if (args[2]) {
                decimals = parseInt(args[2]);
                mintAmount = parseTokenAmount(args[1], decimals);
            }
            console.log(`🆕 Creating new token mint`);
            console.log(`📊 Mint Amount: ${formatTokenAmount(mintAmount, decimals)} tokens`);
            console.log(`🔢 Decimals: ${decimals}`);
        } else {
            tokenMint = new PublicKey(args[0]);
            if (args.length < 2) {
                console.error("❌ Amount required for minting");
                process.exit(1);
            }
            mintAmount = parseTokenAmount(args[1], decimals);
            console.log(`💰 Token Mint: ${tokenMint.toString()}`);
            console.log(`📊 Mint Amount: ${formatTokenAmount(mintAmount, decimals)} tokens`);
        }
    } catch (error) {
        console.error("❌ Invalid mint address or amount");
        process.exit(1);
    }

    // Validate environment variables
    const requiredEnvVars = [
        'SOLANA_NETWORK',
        'RPC_URL',
        'DEPLOYER_KEYPAIR'  // Mint authority
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

        const mintAuthority = loadKeypairFromFile(process.env.DEPLOYER_KEYPAIR!);

        console.log(`📡 Network: ${process.env.SOLANA_NETWORK}`);
        console.log(`🏦 RPC URL: ${process.env.RPC_URL}`);
        console.log(`👑 Mint Authority: ${mintAuthority.publicKey.toString()}`);

        // 2. Check balance
        const balance = await connection.getBalance(mintAuthority.publicKey);
        if (balance < LAMPORTS_PER_SOL * 0.1) {
            console.log("💰 Low SOL balance, requesting airdrop...");
            if (process.env.SOLANA_NETWORK === 'devnet') {
                const signature = await connection.requestAirdrop(
                    mintAuthority.publicKey,
                    LAMPORTS_PER_SOL
                );
                await connection.confirmTransaction(signature);
                console.log("✅ Airdrop completed");
            } else {
                console.warn("⚠️  Low SOL balance for transaction fees");
            }
        }

        let mintKeypair: Keypair | null = null;

        // 3. Create new mint if needed
        if (createNewMint) {
            console.log("\n🆕 Creating new token mint...");

            mintKeypair = Keypair.generate();
            tokenMint = mintKeypair.publicKey;

            const tokenInfo = generateTokenInfo();
            console.log(`🏷️  Token Name: ${tokenInfo.name}`);
            console.log(`🎯 Token Symbol: ${tokenInfo.symbol}`);
            console.log(`💰 Token Mint: ${tokenMint.toString()}`);

            // Calculate rent for mint account
            const rentExempt = await getMinimumBalanceForRentExemptMint(connection);

            // Create mint account
            const createMintTransaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: mintAuthority.publicKey,
                    newAccountPubkey: tokenMint,
                    space: getMintLen([]),
                    lamports: rentExempt,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMintInstruction(
                    tokenMint,
                    decimals,
                    mintAuthority.publicKey,
                    mintAuthority.publicKey,
                    TOKEN_PROGRAM_ID
                )
            );

            console.log("🔄 Creating mint account...");
            const mintTx = await connection.sendTransaction(
                createMintTransaction,
                [mintAuthority, mintKeypair]
            );
            await connection.confirmTransaction(mintTx, 'confirmed');

            console.log(`✅ Mint created: ${mintTx}`);
        } else {
            console.log("\n🔍 Using existing token mint...");
            console.log(`💰 Token Mint: ${tokenMint!.toString()}`);

            // Verify mint exists and get info
            try {
                const mintInfo = await connection.getAccountInfo(tokenMint!);
                if (!mintInfo) {
                    throw new Error("Mint account not found");
                }
                console.log("✅ Mint account verified");
            } catch (error) {
                console.error("❌ Invalid or non-existent mint address");
                throw error;
            }
        }

        // 4. Get or create associated token account
        console.log("\n🔗 Setting up token account...");
        const userAta = await getAssociatedTokenAddress(
            tokenMint!,
            mintAuthority.publicKey
        );

        console.log(`📦 Associated Token Account: ${userAta.toString()}`);

        // Check if ATA exists
        const ataInfo = await connection.getAccountInfo(userAta);
        let createAtaTx: string | null = null;

        if (!ataInfo) {
            console.log("📝 Creating associated token account...");
            const createAtaTransaction = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    mintAuthority.publicKey,
                    userAta,
                    mintAuthority.publicKey,
                    tokenMint!,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );

            createAtaTx = await connection.sendTransaction(
                createAtaTransaction,
                [mintAuthority]
            );
            await connection.confirmTransaction(createAtaTx, 'confirmed');

            console.log(`✅ ATA created: ${createAtaTx}`);
        } else {
            console.log("✅ Associated token account already exists");
        }

        // 5. Check current token balance
        console.log("\n💰 Checking current token balance...");
        let currentBalance = BigInt(0);
        try {
            const tokenAccount = await connection.getTokenAccountBalance(userAta);
            currentBalance = BigInt(tokenAccount.value.amount);
            console.log(`💰 Current balance: ${formatTokenAmount(currentBalance, decimals)} tokens`);
        } catch (error) {
            console.log("💰 Current balance: 0 tokens (new account)");
        }

        // 6. Mint tokens
        console.log("\n🎯 Minting tokens...");
        console.log(`   Mint: ${tokenMint!.toString()}`);
        console.log(`   Recipient: ${mintAuthority.publicKey.toString()}`);
        console.log(`   Amount: ${formatTokenAmount(mintAmount, decimals)} tokens`);

        const mintToTransaction = new Transaction().add(
            createMintToInstruction(
                tokenMint!,
                userAta,
                mintAuthority.publicKey,
                Number(mintAmount),
                [],
                TOKEN_PROGRAM_ID
            )
        );

        let mintToTx: string;
        try {
            mintToTx = await connection.sendTransaction(
                mintToTransaction,
                [mintAuthority]
            );
            await connection.confirmTransaction(mintToTx, 'confirmed');

            console.log(`✅ Tokens minted successfully!`);
            console.log(`🔗 Transaction: ${mintToTx}`);

        } catch (error) {
            console.error("❌ Minting failed:");
            console.error("Error details:", error);
            throw error;
        }

        // 7. Verify minting
        console.log("\n🔍 Verifying minting...");
        const updatedTokenAccount = await connection.getTokenAccountBalance(userAta);
        const newBalance = BigInt(updatedTokenAccount.value.amount);
        const expectedBalance = currentBalance + mintAmount;

        console.log("📋 Balance Verification:");
        console.log(`   Previous Balance: ${formatTokenAmount(currentBalance, decimals)} tokens`);
        console.log(`   Minted Amount: ${formatTokenAmount(mintAmount, decimals)} tokens`);
        console.log(`   New Balance: ${formatTokenAmount(newBalance, decimals)} tokens`);
        console.log(`   Expected Balance: ${formatTokenAmount(expectedBalance, decimals)} tokens`);

        if (newBalance === expectedBalance) {
            console.log("✅ Balance verification successful");
        } else {
            console.error("❌ Balance verification failed");
            throw new Error("Balance mismatch");
        }

        // 8. Get transaction details
        console.log("\n📊 Transaction Details:");
        const txDetails = await connection.getTransaction(mintToTx, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (txDetails) {
            console.log(`   Slot: ${txDetails.slot}`);
            console.log(`   Block Time: ${new Date(txDetails.blockTime! * 1000).toISOString()}`);
            console.log(`   Fee: ${txDetails.meta?.fee} lamports`);
        }

        console.log("\n🎉 Token minting completed successfully!");
        console.log("=====================================");

        // 9. Summary information
        console.log("\n📋 Token Summary:");
        console.log(`   Token Mint: ${tokenMint!.toString()}`);
        console.log(`   Decimals: ${decimals}`);
        console.log(`   Your Token Account: ${userAta.toString()}`);
        console.log(`   Total Balance: ${formatTokenAmount(newBalance, decimals)} tokens`);

        if (createNewMint) {
            console.log(`   Mint Authority: ${mintAuthority.publicKey.toString()}`);
            console.log(`   Freeze Authority: ${mintAuthority.publicKey.toString()}`);
        }

        // 10. Next steps information
        console.log("\n📝 Next Steps:");
        console.log("1. Use these tokens for testing vault deposits");
        console.log("2. Share token mint address with other testers");
        console.log("3. Mint more tokens as needed for testing");

        console.log("\n🔗 Useful Commands:");
        console.log(`   View token account: solana account ${userAta.toString()}`);
        console.log(`   View mint info: solana account ${tokenMint!.toString()}`);
        console.log(`   Check balance: spl-token balance ${tokenMint!.toString()}`);

        if (createNewMint) {
            console.log("\n🎯 Test with Vault:");
            console.log(`   Deposit: npx ts-node scripts/deposit-collateral.ts ${tokenMint!.toString()} 100`);
            console.log(`   Withdraw: npx ts-node scripts/withdraw-collateral.ts ${tokenMint!.toString()} 50`);
        }

    } catch (error) {
        console.error("❌ Token minting failed:");
        console.error(error);
        process.exit(1);
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    mintToken()
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

export {
    mintToken,
    loadKeypairFromFile,
    parseTokenAmount,
    formatTokenAmount,
    generateTokenInfo
}; 