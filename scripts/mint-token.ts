#!/usr/bin/env ts-node

/**
 * Mint Token Script
 * Creates new token mints or mints to existing mints for testing purposes.
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
    return BigInt(wholePart + fractionalPart);
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
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error("Usage:");
        console.error("  Create new: npx ts-node scripts/mint-token.ts new <amount> [decimals]");
        console.error("  Mint existing: npx ts-node scripts/mint-token.ts <mint_address> <amount>");
        process.exit(1);
    }

    let tokenMint: PublicKey | null = null;
    let mintAmount: bigint;
    let decimals = 6;
    let createNewMint = false;

    if (args[0].toLowerCase() === 'new') {
        createNewMint = true;
        mintAmount = parseTokenAmount(args[1], decimals);
        if (args[2]) {
            decimals = parseInt(args[2]);
            mintAmount = parseTokenAmount(args[1], decimals);
        }
    } else {
        tokenMint = new PublicKey(args[0]);
        mintAmount = parseTokenAmount(args[1], decimals);
    }

    // Validate required env vars
    if (!process.env.RPC_URL || !process.env.DEPLOYER_KEYPAIR) {
        throw new Error("Missing RPC_URL or DEPLOYER_KEYPAIR environment variables");
    }

    const connection = new Connection(process.env.RPC_URL, 'confirmed');
    const mintAuthority = loadKeypairFromFile(process.env.DEPLOYER_KEYPAIR);

    // Check balance and airdrop if needed
    const balance = await connection.getBalance(mintAuthority.publicKey);
    if (balance < LAMPORTS_PER_SOL * 0.1 && process.env.SOLANA_NETWORK === 'devnet') {
        console.log("Requesting airdrop...");
        const signature = await connection.requestAirdrop(mintAuthority.publicKey, LAMPORTS_PER_SOL);
        await connection.confirmTransaction(signature);
    }

    // Create new mint if needed
    if (createNewMint) {
        const mintKeypair = Keypair.generate();
        tokenMint = mintKeypair.publicKey;

        const rentExempt = await getMinimumBalanceForRentExemptMint(connection);
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

        const mintTx = await connection.sendTransaction(createMintTransaction, [mintAuthority, mintKeypair]);
        await connection.confirmTransaction(mintTx, 'confirmed');
        console.log(`✅ New mint created: ${tokenMint.toString()}`);
    }

    // Get or create ATA
    const userAta = await getAssociatedTokenAddress(tokenMint!, mintAuthority.publicKey);
    const ataInfo = await connection.getAccountInfo(userAta);

    if (!ataInfo) {
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
        const createAtaTx = await connection.sendTransaction(createAtaTransaction, [mintAuthority]);
        await connection.confirmTransaction(createAtaTx, 'confirmed');
    }

    // Mint tokens
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

    const mintToTx = await connection.sendTransaction(mintToTransaction, [mintAuthority]);
    await connection.confirmTransaction(mintToTx, 'confirmed');

    console.log(`✅ Minted ${args[1]} tokens to ${mintAuthority.publicKey.toString()}`);
    console.log(`Token Mint: ${tokenMint!.toString()}`);
    console.log(`Transaction: ${mintToTx}`);
}

/**
 * Entry point
 */
if (require.main === module) {
    mintToken().catch(console.error);
}

export {
    mintToken,
    loadKeypairFromFile,
    parseTokenAmount,
    formatTokenAmount,
    generateTokenInfo
}; 