/**
 * Base client for common functionality
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Transaction } from "@solana/web3.js";
import { SDKConfig, SDKError, SDKErrorCode, OperationContext, WalletSigner } from "../types";
import { validateSDKConfig } from "../utils/validation";

export abstract class BaseClient {
    protected connection: Connection;
    protected config: SDKConfig;
    protected program: anchor.Program | null = null;

    constructor(config: SDKConfig) {
        validateSDKConfig(config);
        this.config = config;
        this.connection = new Connection(config.rpcUrl, 'confirmed');
    }

    /**
     * Create Anchor provider with wallet signer
     */
    protected createProvider(wallet: WalletSigner): anchor.AnchorProvider {
        const anchorWallet = {
            publicKey: wallet.publicKey,
            signTransaction: async <T extends Transaction>(tx: T): Promise<T> => {
                const signedTx = await wallet.signTransaction(tx as Transaction);
                return signedTx as T;
            },
            signAllTransactions: async <T extends Transaction>(txs: T[]): Promise<T[]> => {
                const signedTxs = await wallet.signAllTransactions(txs as Transaction[]);
                return signedTxs as T[];
            },
        };

        return new anchor.AnchorProvider(
            this.connection,
            anchorWallet as anchor.Wallet,
            { commitment: 'confirmed' }
        );
    }

    /**
     * Execute transaction with proper error handling and signing
     */
    protected async executeTransaction(
        transaction: Transaction,
        context: OperationContext
    ): Promise<string> {
        try {
            // Only set blockhash and feePayer if not already set
            // This prevents overwriting values set before partial signing
            if (!transaction.recentBlockhash) {
                const { blockhash } = await this.connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
            }

            if (!transaction.feePayer) {
                transaction.feePayer = context.wallet.publicKey;
            }

            // Sign transaction with wallet
            const signedTx = await context.wallet.signTransaction(transaction);

            // Send transaction
            const signature = await this.connection.sendRawTransaction(
                signedTx.serialize(),
                {
                    skipPreflight: context.skipPreflight || false,
                }
            );

            // Confirm transaction
            await this.connection.confirmTransaction(
                signature,
                context.commitment || 'confirmed'
            );

            return signature;
        } catch (error) {
            throw new SDKError(
                SDKErrorCode.TRANSACTION_FAILED,
                `Transaction execution failed: ${error}`,
                error as Error
            );
        }
    }

    /**
     * Get program instance - to be implemented by subclasses
     */
    abstract getProgram(provider: anchor.AnchorProvider): Promise<anchor.Program>;

    /**
     * Load program IDL
     */
    protected async loadProgramIdl(idlPath: string, programId: string): Promise<any> {
        try {
            // Try to load from local file first
            const fs = await import('fs');
            if (fs.existsSync(idlPath)) {
                return JSON.parse(fs.readFileSync(idlPath, 'utf8'));
            }
        } catch (error) {
            // Continue to chain fetch if local fails
        }
        return null;
    }

    /**
     * Get connection
     */
    getConnection(): Connection {
        return this.connection;
    }

    /**
     * Get config
     */
    getConfig(): SDKConfig {
        return this.config;
    }

    /**
     * Check if account exists
     */
    async accountExists(address: anchor.web3.PublicKey): Promise<boolean> {
        try {
            const accountInfo = await this.connection.getAccountInfo(address);
            return accountInfo !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get transaction details
     */
    async getTransactionDetails(signature: string) {
        try {
            return await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });
        } catch (error) {
            return null;
        }
    }
} 