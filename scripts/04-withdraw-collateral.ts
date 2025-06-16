#!/usr/bin/env ts-node

/**
 * Withdraw Collateral Script - Lean Version
 * Withdraws all available balance from vault
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Load keypair from file
function loadKeypairFromFile(filepath: string): Keypair {
    const expandedPath = filepath.replace('~', process.env.HOME || '');
    const secretKey = JSON.parse(fs.readFileSync(expandedPath, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

// Get PDAs
function getVaultConfigPDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([Buffer.from("vault_config")], programId);
}

function getUserBalancePDA(programId: PublicKey, user: PublicKey, tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("user_balance"), user.toBuffer(), tokenMint.toBuffer()],
        programId
    );
}

function getVaultAuthorityPDA(programId: PublicKey, tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vault_authority"), tokenMint.toBuffer()],
        programId
    );
}

// Format token amount for display
function formatTokenAmount(amount: anchor.BN, decimals: number = 6): string {
    const amountStr = amount.toString();
    const wholePart = amountStr.slice(0, -decimals) || '0';
    const fractionalPart = amountStr.slice(-decimals).padStart(decimals, '0');
    return `${wholePart}.${fractionalPart}`;
}

async function withdrawCollateral(): Promise<void> {
    console.log("🚀 Withdrawing Collateral...");

    // Configuration
    const tokenMint = new PublicKey('5FPTnHuxwyqSpuRdjQwaemi8YoW5KT7CeMWQ55v6mCef');
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

    try {
        // Get current balance
        const userBalance = await vaultProgram.account.userBalance.fetch(userBalancePDA) as any;
        const currentBalance = userBalance.balance;

        if (currentBalance.isZero()) {
            console.log("❌ No balance to withdraw");
            return;
        }

        const withdrawAmount = currentBalance; // Withdraw all available
        console.log(`💰 Withdrawing: ${formatTokenAmount(withdrawAmount)} tokens`);

        // Execute withdrawal
        const tx = await vaultProgram.methods
            .withdrawCollateral(withdrawAmount)
            .accounts({
                config: vaultConfigPDA,
                userBalance: userBalancePDA,
                vaultAuthority: vaultAuthorityPDA,
                vaultAta: vaultAta,
                userAta: userAta,
                tokenMint: tokenMint,
                user: user.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([user])
            .rpc();

        console.log(`✅ Withdrawn successfully! TX: ${tx}`);

        // Quick verification
        const updatedBalance = await vaultProgram.account.userBalance.fetch(userBalancePDA) as any;
        console.log(`💰 Remaining balance: ${formatTokenAmount(updatedBalance.balance)} tokens`);

    } catch (error) {
        if (error instanceof Error && error.message.includes("Account does not exist")) {
            console.log("❌ No user balance account found. Nothing to withdraw.");
        } else {
            console.error("❌ Failed:", error);
            throw error;
        }
    }
}

if (require.main === module) {
    withdrawCollateral()
        .then(() => console.log("🎉 Completed!"))
        .catch(console.error);
}

export { withdrawCollateral }; 