/**
 * Program Derived Address utilities
 */

import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
    VAULT_CONFIG_SEED,
    USER_BALANCE_SEED,
    VAULT_AUTHORITY_SEED,
    TRADE_CONFIG_SEED,
    ORDER_STATUS_SEED,
} from "./constants";

/**
 * Get vault config PDA
 */
export function getVaultConfigPDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_CONFIG_SEED)],
        programId
    );
}

/**
 * Get user balance PDA
 */
export function getUserBalancePDA(
    programId: PublicKey,
    user: PublicKey,
    tokenMint: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(USER_BALANCE_SEED),
            user.toBuffer(),
            tokenMint.toBuffer()
        ],
        programId
    );
}

/**
 * Get vault authority PDA
 */
export function getVaultAuthorityPDA(
    programId: PublicKey,
    tokenMint: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(VAULT_AUTHORITY_SEED),
            tokenMint.toBuffer()
        ],
        programId
    );
}

/**
 * Get trade config PDA
 */
export function getTradeConfigPDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(TRADE_CONFIG_SEED)],
        programId
    );
}

/**
 * Get order status PDA
 */
export function getOrderStatusPDA(
    programId: PublicKey,
    trader: PublicKey,
    nonce: number
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(ORDER_STATUS_SEED),
            trader.toBuffer(),
            new anchor.BN(nonce).toArrayLike(Buffer, 'le', 8)
        ],
        programId
    );
} 