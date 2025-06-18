/**
 * Vault Operations - All vault related operations
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import { VaultClient } from "./vault-client";
import {
    getVaultConfigPDA,
    getUserBalancePDA,
    getVaultAuthorityPDA
} from "../utils/pda";
import { formatTokenAmount } from "../utils/token";
import {
    DepositParams,
    WithdrawParams,
    InitializeVaultParams,
    TransactionResult,
    VaultInitResult,
    SDKError,
    SDKErrorCode,
    OperationContext
} from "../types";
import { createSDKError } from "../utils/error-handler";

/**
 * Initialize vault system
 */
export async function initializeVault(
    client: VaultClient,
    context: OperationContext,
    params: InitializeVaultParams
): Promise<VaultInitResult> {
    try {
        const provider = client.createProvider(context.wallet);
        const program = await client.getProgram(provider);
        const [vaultConfigPDA] = getVaultConfigPDA(client.getConfig().vaultProgramId);

        // Check if already initialized
        try {
            await program.account.vaultConfig.fetch(vaultConfigPDA);
            throw createSDKError(SDKErrorCode.ALREADY_INITIALIZED, "Vault already initialized");
        } catch (error) {
            if (error instanceof SDKError) {
                throw error;
            }
            // Continue with initialization if account doesn't exist
        }

        // Build instruction
        const ix = await program.methods
            .initializeVault(params.admin, params.emergencyAdmin)
            .accounts({
                config: vaultConfigPDA,
                admin: context.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        // Create transaction
        const transaction = new Transaction().add(ix);

        // Execute with wallet
        const signature = await client.executeTransaction(transaction, context);

        // Get transaction details
        const txDetails = await client.getTransactionDetails(signature);

        return {
            signature,
            vaultConfigPDA,
            admin: params.admin,
            emergencyAdmin: params.emergencyAdmin,
            slot: txDetails?.slot,
            blockTime: txDetails?.blockTime ? txDetails.blockTime * 1000 : undefined,
            fee: txDetails?.meta?.fee,
        };
    } catch (error) {
        if (error instanceof SDKError) {
            throw error;
        }
        throw createSDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to initialize vault",
            error
        );
    }
}

/**
 * Add authorized trader to vault
 */
export async function addAuthorizedTrader(
    client: VaultClient,
    context: OperationContext,
    traderProgramId: PublicKey
): Promise<string> {
    try {
        const provider = client.createProvider(context.wallet);
        const program = await client.getProgram(provider);
        const [vaultConfigPDA] = getVaultConfigPDA(client.getConfig().vaultProgramId);

        // Verify vault exists and admin authority
        const vaultConfig = await program.account.vaultConfig.fetch(vaultConfigPDA) as any;
        if (!vaultConfig.admin.equals(context.wallet.publicKey)) {
            throw new SDKError(SDKErrorCode.UNAUTHORIZED, "Admin wallet does not match vault admin");
        }

        // Check if already authorized
        const isAlreadyAuthorized = vaultConfig.authorizedTraders.some(
            (trader: PublicKey) => trader.equals(traderProgramId)
        );

        if (isAlreadyAuthorized) {
            throw new SDKError(SDKErrorCode.ALREADY_INITIALIZED, "Trading program already authorized");
        }

        // Build instruction
        const ix = await program.methods
            .addAuthorizedTrader(traderProgramId)
            .accounts({
                config: vaultConfigPDA,
                admin: context.wallet.publicKey,
            })
            .instruction();

        // Create transaction
        const transaction = new Transaction().add(ix);

        // Execute with wallet
        const signature = await client.executeTransaction(transaction, context);

        return signature;
    } catch (error) {
        if (error instanceof SDKError) {
            throw error;
        }
        throw new SDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to add authorized trader",
            error as Error
        );
    }
}

/**
 * Deposit collateral to vault
 */
export async function depositCollateral(
    client: VaultClient,
    context: OperationContext,
    params: DepositParams
): Promise<TransactionResult> {
    try {
        const provider = client.createProvider(context.wallet);
        const program = await client.getProgram(provider);
        const connection = client.getConnection();
        const vaultProgramId = client.getConfig().vaultProgramId;

        // Get PDAs
        const [vaultConfigPDA] = getVaultConfigPDA(vaultProgramId);
        const [userBalancePDA] = getUserBalancePDA(vaultProgramId, context.wallet.publicKey, params.tokenMint);
        const [vaultAuthorityPDA] = getVaultAuthorityPDA(vaultProgramId, params.tokenMint);

        // Get token accounts
        const userAta = await getAssociatedTokenAddress(params.tokenMint, context.wallet.publicKey);
        const vaultAta = await getAssociatedTokenAddress(params.tokenMint, vaultAuthorityPDA, true);

        // Check if vault ATA exists
        const vaultAtaInfo = await connection.getAccountInfo(vaultAta);
        const needCreateVaultAta = !vaultAtaInfo;

        // Prepare instructions
        const instructions: TransactionInstruction[] = [];

        if (needCreateVaultAta) {
            // Add vault ATA creation instruction
            const createVaultAtaIx = createAssociatedTokenAccountInstruction(
                context.wallet.publicKey,
                vaultAta,
                vaultAuthorityPDA,
                params.tokenMint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            instructions.push(createVaultAtaIx);
        }

        // Add deposit instruction
        const depositIx = await program.methods
            .depositCollateral(params.amount)
            .accounts({
                config: vaultConfigPDA,
                userBalance: userBalancePDA,
                vaultAuthority: vaultAuthorityPDA,
                vaultAta: vaultAta,
                userAta: userAta,
                tokenMint: params.tokenMint,
                user: context.wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        instructions.push(depositIx);

        // Create transaction
        const transaction = new Transaction().add(...instructions);

        // Execute with wallet
        const signature = await client.executeTransaction(transaction, context);

        // Get transaction details
        const txDetails = await client.getTransactionDetails(signature);

        return {
            signature,
            slot: txDetails?.slot,
            blockTime: txDetails?.blockTime ? txDetails.blockTime * 1000 : undefined,
            fee: txDetails?.meta?.fee,
        };
    } catch (error) {
        throw createSDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to deposit collateral",
            error as Error
        );
    }
}

/**
 * Withdraw collateral from vault
 */
export async function withdrawCollateral(
    client: VaultClient,
    context: OperationContext,
    params: WithdrawParams
): Promise<TransactionResult> {
    try {
        const provider = client.createProvider(context.wallet);
        const program = await client.getProgram(provider);
        const vaultProgramId = client.getConfig().vaultProgramId;

        // Get PDAs
        const [vaultConfigPDA] = getVaultConfigPDA(vaultProgramId);
        const [userBalancePDA] = getUserBalancePDA(vaultProgramId, context.wallet.publicKey, params.tokenMint);
        const [vaultAuthorityPDA] = getVaultAuthorityPDA(vaultProgramId, params.tokenMint);

        // Get token accounts
        const userAta = await getAssociatedTokenAddress(params.tokenMint, context.wallet.publicKey);
        const vaultAta = await getAssociatedTokenAddress(params.tokenMint, vaultAuthorityPDA, true);

        // Check user balance
        try {
            const userBalance = await program.account.userBalance.fetch(userBalancePDA) as any;
            if (userBalance.balance.lt(params.amount)) {
                throw new SDKError(
                    SDKErrorCode.INSUFFICIENT_BALANCE,
                    `Insufficient balance. Available: ${formatTokenAmount(userBalance.balance)}, Requested: ${formatTokenAmount(params.amount)}`
                );
            }
        } catch (error) {
            if (error instanceof SDKError) {
                throw error;
            }
            throw new SDKError(SDKErrorCode.ACCOUNT_NOT_FOUND, "User balance account not found");
        }

        // Build instruction
        const ix = await program.methods
            .withdrawCollateral(params.amount)
            .accounts({
                config: vaultConfigPDA,
                userBalance: userBalancePDA,
                vaultAuthority: vaultAuthorityPDA,
                vaultAta: vaultAta,
                userAta: userAta,
                user: context.wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .instruction();

        // Create transaction
        const transaction = new Transaction().add(ix);

        // Execute with wallet
        const signature = await client.executeTransaction(transaction, context);

        // Get transaction details
        const txDetails = await client.getTransactionDetails(signature);

        return {
            signature,
            slot: txDetails?.slot,
            blockTime: txDetails?.blockTime ? txDetails.blockTime * 1000 : undefined,
            fee: txDetails?.meta?.fee,
        };
    } catch (error) {
        throw createSDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to withdraw collateral",
            error as Error
        );
    }
}

/**
 * Withdraw all available collateral
 */
export async function withdrawAllCollateral(
    client: VaultClient,
    context: OperationContext,
    tokenMint: PublicKey
): Promise<TransactionResult> {
    try {
        // Get current balance
        const provider = client.createProvider(context.wallet);
        const program = await client.getProgram(provider);
        const vaultProgramId = client.getConfig().vaultProgramId;
        const [userBalancePDA] = getUserBalancePDA(vaultProgramId, context.wallet.publicKey, tokenMint);

        const userBalance = await program.account.userBalance.fetch(userBalancePDA) as any;
        const availableAmount = userBalance.balance;

        if (availableAmount.isZero()) {
            throw new SDKError(SDKErrorCode.INSUFFICIENT_BALANCE, "No balance to withdraw");
        }

        return await withdrawCollateral(client, context, {
            tokenMint,
            amount: availableAmount,
        });
    } catch (error) {
        if (error instanceof SDKError) {
            throw error;
        }
        throw new SDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to withdraw all collateral",
            error as Error
        );
    }
}

/**
 * Get user balance in vault (read-only operation)
 */
export async function getUserVaultBalance(
    client: VaultClient,
    user: PublicKey,
    tokenMint: PublicKey
): Promise<anchor.BN> {
    try {
        // For read-only operations, create dummy provider
        const dummyKeypair = Keypair.generate();
        const dummyWallet = {
            publicKey: dummyKeypair.publicKey,
            signTransaction: async (tx: any) => tx,
            signAllTransactions: async (txs: any[]) => txs,
        };

        const provider = new anchor.AnchorProvider(
            client.getConnection(),
            dummyWallet as anchor.Wallet,
            { commitment: 'confirmed' }
        );

        const program = await client.getProgram(provider);
        const vaultProgramId = client.getConfig().vaultProgramId;

        const [userBalancePDA] = getUserBalancePDA(vaultProgramId, user, tokenMint);

        try {
            const userBalance = await program.account.userBalance.fetch(userBalancePDA) as any;
            return userBalance.balance;
        } catch (error) {
            // Return zero if account doesn't exist
            return new anchor.BN(0);
        }
    } catch (error) {
        throw new SDKError(
            SDKErrorCode.ACCOUNT_NOT_FOUND,
            "Failed to get user vault balance",
            error as Error
        );
    }
} 