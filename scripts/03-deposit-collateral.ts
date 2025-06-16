#!/usr/bin/env ts-node

/**
 * Deposit Collateral Script - Lean Version
 * Auto-creates vault ATA if needed and deposits collateral in single transaction
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    Transaction
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
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

interface UserBalance {
    user: PublicKey;
    tokenMint: PublicKey;
    balance: anchor.BN;
    bump: number;
}

interface VaultAuthority {
    tokenMint: PublicKey;
    totalDeposits: anchor.BN;
    vaultAta: PublicKey;
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
 * Get user balance PDA
 */
function getUserBalancePDA(programId: PublicKey, user: PublicKey, tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("user_balance"), user.toBuffer(), tokenMint.toBuffer()],
        programId
    );
}

/**
 * Get vault authority PDA
 */
function getVaultAuthorityPDA(programId: PublicKey, tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vault_authority"), tokenMint.toBuffer()],
        programId
    );
}

/**
 * Parse amount with decimals
 */
function parseTokenAmount(amount: string, decimals: number = 6): anchor.BN {
    const parts = amount.split('.');
    const wholePart = parts[0] || '0';
    const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);

    const totalAmount = wholePart + fractionalPart;
    return new anchor.BN(totalAmount);
}

/**
 * Format token amount for display
 */
function formatTokenAmount(amount: anchor.BN, decimals: number = 6): string {
    const amountStr = amount.toString();
    const wholePart = amountStr.slice(0, -decimals) || '0';
    const fractionalPart = amountStr.slice(-decimals).padStart(decimals, '0');
    return `${wholePart}.${fractionalPart}`;
}

/**
 * Main function to deposit collateral
 */
async function depositCollateral(): Promise<void> {
    console.log("🚀 Depositing Collateral...");

    // Configuration
    const tokenMint = new PublicKey('5FPTnHuxwyqSpuRdjQwaemi8YoW5KT7CeMWQ55v6mCef');
    const depositAmount = new anchor.BN(1 * 10 ** 6); // 1 token
    const vaultProgramId = new PublicKey('a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE');

    // Setup
    const connection = new Connection(process.env.RPC_URL!, 'confirmed');
    const user = loadKeypairFromFile(process.env.DEPLOYER_KEYPAIR!);
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(user), { commitment: 'confirmed' });
    anchor.setProvider(provider);

    // Load program
    const idlPath = `target/idl/escrow_vault.json`;
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
    const vaultProgram = new anchor.Program(idl, vaultProgramId, provider);

    // Get accounts
    const [vaultConfigPDA] = getVaultConfigPDA(vaultProgramId);
    const [userBalancePDA] = getUserBalancePDA(vaultProgramId, user.publicKey, tokenMint);
    const [vaultAuthorityPDA] = getVaultAuthorityPDA(vaultProgramId, tokenMint);
    const userAta = await getAssociatedTokenAddress(tokenMint, user.publicKey);
    const vaultAta = await getAssociatedTokenAddress(tokenMint, vaultAuthorityPDA, true);

    console.log(`💰 Amount: ${formatTokenAmount(depositAmount)} tokens`);
    console.log(`🏦 Vault ATA: ${vaultAta.toString()}`);

    try {
        // Check if vault ATA exists
        const vaultAtaInfo = await connection.getAccountInfo(vaultAta);
        const needCreateVaultAta = !vaultAtaInfo;

        if (needCreateVaultAta) {
            console.log("📝 Creating vault ATA + depositing...");

            // Create combined transaction
            const createVaultAtaIx = createAssociatedTokenAccountInstruction(
                user.publicKey,
                vaultAta,
                vaultAuthorityPDA,
                tokenMint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            const depositIx = await vaultProgram.methods
                .depositCollateral(depositAmount)
                .accounts({
                    config: vaultConfigPDA,
                    userBalance: userBalancePDA,
                    vaultAuthority: vaultAuthorityPDA,
                    vaultAta: vaultAta,
                    userAta: userAta,
                    tokenMint: tokenMint,
                    user: user.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .instruction();

            const transaction = new Transaction().add(createVaultAtaIx).add(depositIx);
            const tx = await connection.sendTransaction(transaction, [user]);
            await connection.confirmTransaction(tx, 'confirmed');

            console.log(`✅ Vault ATA created and deposited! TX: ${tx}`);
        } else {
            console.log("🚀 Depositing to existing vault...");

            const tx = await vaultProgram.methods
                .depositCollateral(depositAmount)
                .accounts({
                    config: vaultConfigPDA,
                    userBalance: userBalancePDA,
                    vaultAuthority: vaultAuthorityPDA,
                    vaultAta: vaultAta,
                    userAta: userAta,
                    tokenMint: tokenMint,
                    user: user.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([user])
                .rpc();

            console.log(`✅ Deposited successfully! TX: ${tx}`);
        }

        // Quick verification
        const userBalance = await vaultProgram.account.userBalance.fetch(userBalancePDA) as any;
        console.log(`💰 New vault balance: ${formatTokenAmount(userBalance.balance)} tokens`);

    } catch (error) {
        console.error("❌ Failed:", error);
        throw error;
    }
}

/**
 * Entry point
 */
if (require.main === module) {
    depositCollateral()
        .then(() => console.log("🎉 Completed!"))
        .catch(console.error);
}

export {
    depositCollateral,
    loadKeypairFromFile,
    getVaultConfigPDA,
    getUserBalancePDA,
    getVaultAuthorityPDA,
    parseTokenAmount,
    formatTokenAmount
}; 