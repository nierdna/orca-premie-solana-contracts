/**
 * Wallet abstraction for supporting both Keypair and Wallet Adapter
 */

import { PublicKey, Transaction, Keypair } from "@solana/web3.js";

/**
 * Base wallet interface that both Keypair and Wallet Adapter can implement
 */
export interface WalletSigner {
    publicKey: PublicKey;
    signTransaction(transaction: Transaction): Promise<Transaction>;
    signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}

/**
 * Keypair wrapper to implement WalletSigner interface
 * Used for server-side operations and testing
 */
export class KeypairWallet implements WalletSigner {
    constructor(private keypair: Keypair) { }

    get publicKey(): PublicKey {
        return this.keypair.publicKey;
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        transaction.partialSign(this.keypair);
        return transaction;
    }

    async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        return transactions.map(tx => {
            tx.partialSign(this.keypair);
            return tx;
        });
    }

    /**
     * Access to underlying keypair for compatibility with existing code
     */
    getKeypair(): Keypair {
        return this.keypair;
    }
}

/**
 * Wallet adapter wrapper for client-side integration
 * Compatible with @solana/wallet-adapter-react
 */
export class AdapterWallet implements WalletSigner {
    constructor(private adapter: any) {
        if (!adapter?.publicKey) {
            throw new Error('Wallet adapter must be connected and have a public key');
        }
    }

    get publicKey(): PublicKey {
        return this.adapter.publicKey;
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        if (!this.adapter.signTransaction) {
            throw new Error('Wallet adapter does not support transaction signing');
        }
        return await this.adapter.signTransaction(transaction);
    }

    async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        if (!this.adapter.signAllTransactions) {
            throw new Error('Wallet adapter does not support multiple transaction signing');
        }
        return await this.adapter.signAllTransactions(transactions);
    }

    /**
     * Check if wallet is connected
     */
    get connected(): boolean {
        return this.adapter.connected && !!this.adapter.publicKey;
    }

    /**
     * Get wallet name
     */
    get name(): string {
        return this.adapter.name || 'Unknown Wallet';
    }
}

/**
 * Utility function to create wallet signer from different sources
 */
export function createWalletSigner(source: Keypair | any): WalletSigner {
    if (source instanceof Keypair) {
        return new KeypairWallet(source);
    } else if (source?.publicKey) {
        return new AdapterWallet(source);
    } else {
        throw new Error('Invalid wallet source. Must be Keypair or wallet adapter');
    }
}

/**
 * Type guard to check if wallet is a KeypairWallet
 */
export function isKeypairWallet(wallet: WalletSigner): wallet is KeypairWallet {
    return wallet instanceof KeypairWallet;
}

/**
 * Type guard to check if wallet is an AdapterWallet
 */
export function isAdapterWallet(wallet: WalletSigner): wallet is AdapterWallet {
    return wallet instanceof AdapterWallet;
} 