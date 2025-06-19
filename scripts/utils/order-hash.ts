/**
 * Order Hashing Utilities
 * TypeScript implementation matching Rust order hash calculation
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";

/**
 * PreOrder type definition (matches Rust struct)
 */
export interface PreOrder {
    trader: PublicKey;
    collateralToken: PublicKey;
    tokenId: PublicKey;
    amount: anchor.BN;
    price: anchor.BN;
    isBuy: boolean;
    nonce: anchor.BN;
    deadline: anchor.BN;
}

/**
 * Create order message for hashing (matches Rust implementation)
 * Replicates the create_order_message function from common.rs
 * 
 * @param order PreOrder object to hash
 * @returns Buffer containing the serialized order message
 */
export function createOrderMessage(order: PreOrder): Buffer {
    const message: Buffer[] = [];

    // Domain separator - matches Rust b"PreMarketOrder"
    message.push(Buffer.from("PreMarketOrder"));

    // trader (32 bytes)
    message.push(Buffer.from(order.trader.toBytes()));

    // collateral_token (32 bytes)
    message.push(Buffer.from(order.collateralToken.toBytes()));

    // token_id (32 bytes) 
    message.push(Buffer.from(order.tokenId.toBytes()));

    // amount (8 bytes, little endian)
    const amountBuffer = Buffer.allocUnsafe(8);
    amountBuffer.writeBigUInt64LE(BigInt(order.amount.toString()), 0);
    message.push(amountBuffer);

    // price (8 bytes, little endian)
    const priceBuffer = Buffer.allocUnsafe(8);
    priceBuffer.writeBigUInt64LE(BigInt(order.price.toString()), 0);
    message.push(priceBuffer);

    // is_buy (1 byte)
    message.push(Buffer.from([order.isBuy ? 1 : 0]));

    // nonce (8 bytes, little endian)
    const nonceBuffer = Buffer.allocUnsafe(8);
    nonceBuffer.writeBigUInt64LE(BigInt(order.nonce.toString()), 0);
    message.push(nonceBuffer);

    // deadline (8 bytes, little endian)
    const deadlineBuffer = Buffer.allocUnsafe(8);
    deadlineBuffer.writeBigUInt64LE(BigInt(order.deadline.toString()), 0);
    message.push(deadlineBuffer);

    return Buffer.concat(message);
}

/**
 * Calculate order hash (matches Rust implementation)
 * Replicates the calculate_order_hash function from utils.rs
 * 
 * @param order PreOrder object to hash
 * @returns Buffer containing the 32-byte hash
 */
export function calculateOrderHash(order: PreOrder): Buffer {
    const message = createOrderMessage(order);
    // Use SHA256 to match Solana's hash::hash function
    const hashBytes = sha256(message);
    return Buffer.from(hashBytes);
}

/**
 * Convert hash to hex string (matches Rust hex::encode)
 * 
 * @param hash Buffer containing hash bytes
 * @returns Hex string representation of the hash
 */
export function hashToHex(hash: Buffer): string {
    return hash.toString('hex');
}

/**
 * Calculate order hash and return as hex string (convenience function)
 * 
 * @param order PreOrder object to hash
 * @returns Hex string representation of the order hash
 */
export function calculateOrderHashHex(order: PreOrder): string {
    const hashBytes = calculateOrderHash(order);
    return hashToHex(hashBytes);
}

/**
 * Verify that two orders have different hashes (prevent duplicate orders)
 * 
 * @param order1 First order
 * @param order2 Second order
 * @returns true if orders have different hashes
 */
export function ordersHaveDifferentHashes(order1: PreOrder, order2: PreOrder): boolean {
    const hash1 = calculateOrderHash(order1);
    const hash2 = calculateOrderHash(order2);
    return !hash1.equals(hash2);
}

/**
 * Create a human-readable order summary with hash
 * 
 * @param order PreOrder object
 * @returns Object containing order summary and hash
 */
export function createOrderSummary(order: PreOrder) {
    const hash = calculateOrderHashHex(order);

    return {
        hash,
        trader: order.trader.toString(),
        tokenId: order.tokenId.toString(),
        collateralToken: order.collateralToken.toString(),
        amount: order.amount.toString(),
        price: order.price.toString(),
        isBuy: order.isBuy,
        nonce: order.nonce.toString(),
        deadline: order.deadline.toString(),
        type: order.isBuy ? 'BUY' : 'SELL'
    };
} 