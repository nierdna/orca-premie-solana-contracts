/**
 * Base Client - Common functionality for all clients
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { SDKConfig, SDKError, SDKErrorCode, WalletSigner, OperationContext } from "../types";
import { validateSDKConfig } from "./validation";
import { getIdlByFileName, type IdlFileName } from "./idl-constants";
import { createSDKError } from "./error-handler";

export abstract class BaseClient<T extends anchor.Idl> {
    protected connection: Connection;
    protected config: SDKConfig;
    protected program: anchor.Program<T> | null = null;

    constructor(config: SDKConfig) {
        validateSDKConfig(config);
        this.config = config;
        this.connection = new Connection(config.rpcUrl, 'confirmed');
    }

    /**
     * Create Anchor provider with wallet signer
     */
    createProvider(wallet: WalletSigner): anchor.AnchorProvider {
        const anchorWallet = {
            publicKey: wallet.publicKey,
            signTransaction: async <T extends anchor.web3.Transaction>(tx: T): Promise<T> => {
                const signedTx = await wallet.signTransaction(tx as anchor.web3.Transaction);
                return signedTx as T;
            },
            signAllTransactions: async <T extends anchor.web3.Transaction>(txs: T[]): Promise<T[]> => {
                const signedTxs = await wallet.signAllTransactions(txs as anchor.web3.Transaction[]);
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
    async executeTransaction(
        transaction: anchor.web3.Transaction,
        context: OperationContext
    ): Promise<string> {
        try {
            // Only set blockhash and feePayer if not already set
            // This prevents overwriting values set before partial signing
            if (!transaction.recentBlockhash) {
                const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.lastValidBlockHeight = lastValidBlockHeight;
            }
            console.log('    ✅ Transaction recentBlockhash ', transaction.recentBlockhash);


            if (!transaction.feePayer) {
                transaction.feePayer = context.wallet.publicKey;
            }
            console.log('    ✅ Transaction feePayer ', context.wallet.publicKey.toString());

            // Sign transaction with wallet
            const signedTx = await context.wallet.signTransaction(transaction);

            console.log('    ✅ Transaction signed ', signedTx.serialize().toString('hex'));

            // Send transaction
            const signature = await this.connection.sendRawTransaction(
                signedTx.serialize(),
                {
                    skipPreflight: context.skipPreflight || false,
                }
            );
            console.log('    ✅ Transaction sent ', signature);

            const start = Date.now();

            // Confirm transaction
            await this.connection.confirmTransaction(
                {
                    signature,
                    blockhash: transaction.recentBlockhash!,
                    lastValidBlockHeight: transaction.lastValidBlockHeight!,
                },
            );

            console.log('    ✅ Transaction confirmed in ', Date.now() - start, 'ms');

            return signature;
        } catch (error) {
            throw createSDKError(
                SDKErrorCode.TRANSACTION_FAILED,
                `Transaction execution failed`,
                error
            );
        }
    }

    /**
     * Abstract method to get program - implemented by child classes
     */
    abstract getProgram(provider: anchor.AnchorProvider): Promise<anchor.Program<T>>;

    /**
     * Load program with preloaded IDL or fetch from chain
     * Browser-compatible version that uses preloaded IDL constants
     */
    protected async loadProgram(
        provider: anchor.AnchorProvider,
        programId: PublicKey,
        idlSource: IdlFileName | anchor.Idl
    ): Promise<anchor.Program<T>> {
        try {
            anchor.setProvider(provider);

            let idl: anchor.Idl;

            // Check if idlSource is already an IDL object
            if (typeof idlSource === 'object' && idlSource !== null) {
                idl = idlSource;
            } else {
                // idlSource is a filename, try to get from preloaded constants
                const preloadedIdl = getIdlByFileName(idlSource);
                if (preloadedIdl) {
                    idl = preloadedIdl;
                } else {
                    // Fallback to fetching from chain if IDL not found in constants
                    console.warn(`IDL ${idlSource} not found in preloaded constants, fetching from chain...`);
                    this.program = await anchor.Program.at(programId, provider) as anchor.Program<T>;
                    return this.program;
                }
            }

            // Create program with IDL
            this.program = new anchor.Program(idl, programId, provider) as anchor.Program<T>;
            return this.program;

        } catch (error) {
            throw createSDKError(
                SDKErrorCode.PROGRAM_LOAD_FAILED,
                `Failed to load program`,
                error
            );
        }
    }

    /**
     * Alternative load method that uses preloaded IDL from config
     */
    protected async loadProgramFromConfig(
        provider: anchor.AnchorProvider,
        programId: PublicKey,
        preloadedIdl?: anchor.Idl
    ): Promise<anchor.Program<T>> {
        try {
            anchor.setProvider(provider);

            if (preloadedIdl) {
                // Use IDL from config
                this.program = new anchor.Program(preloadedIdl, programId, provider) as anchor.Program<T>;
            } else {
                // Fallback to fetching from chain
                this.program = await anchor.Program.at(programId, provider) as anchor.Program<T>;
            }

            return this.program;
        } catch (error) {
            throw createSDKError(
                SDKErrorCode.PROGRAM_LOAD_FAILED,
                `Failed to load program from config`,
                error
            );
        }
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