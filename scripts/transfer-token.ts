#!/usr/bin/env ts-node

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import dotenv from "dotenv";

dotenv.config();

function loadKeypairFromFile(filepath: string): Keypair {
    const expandedPath = filepath.replace('~', process.env.HOME || '');
    const secretKey = JSON.parse(fs.readFileSync(expandedPath, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

function parseTokenAmount(amount: string, decimals: number = 6): bigint {
    const parts = amount.split('.');
    const wholePart = parts[0] || '0';
    const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
    return BigInt(wholePart + fractionalPart);
}

async function transferToken(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length < 4) {
        console.error("Usage: npx ts-node scripts/transfer-token.ts <mint> <to_address> <amount> <from_keypair>");
        console.error("Example: npx ts-node scripts/transfer-token.ts 4zMMC... 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM 100 ~/.config/solana/id.json");
        process.exit(1);
    }

    const [mintStr, toStr, amountStr, keypairPath] = args;

    try {
        const connection = new Connection(process.env.RPC_URL!, 'confirmed');
        const mint = new PublicKey(mintStr);
        const to = new PublicKey(toStr);
        const amount = parseTokenAmount(amountStr);
        const fromKeypair = loadKeypairFromFile(keypairPath);

        const fromAta = await getAssociatedTokenAddress(mint, fromKeypair.publicKey);
        const toAta = await getAssociatedTokenAddress(mint, to);

        console.log(`🔄 Transferring ${amountStr} tokens...`);
        console.log(`From: ${fromKeypair.publicKey.toString()}`);
        console.log(`To: ${to.toString()}`);

        const transferInstruction = createTransferInstruction(
            fromAta,
            toAta,
            fromKeypair.publicKey,
            Number(amount),
            [],
            TOKEN_PROGRAM_ID
        );

        const transaction = new (await import("@solana/web3.js")).Transaction().add(transferInstruction);

        const signature = await connection.sendTransaction(transaction, [fromKeypair]);
        await connection.confirmTransaction(signature, 'confirmed');

        console.log(`✅ Transfer completed: ${signature}`);

    } catch (error) {
        console.error("❌ Transfer failed:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    transferToken();
} 