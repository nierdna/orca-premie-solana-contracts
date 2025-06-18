/**
 * Token utilities
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

/**
 * Parse token amount with decimals
 */
export function parseTokenAmount(amount: string, decimals: number = 6): anchor.BN {
    const parts = amount.split('.');
    const wholePart = parts[0] || '0';
    const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);

    const totalAmount = wholePart + fractionalPart;
    return new anchor.BN(totalAmount);
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: anchor.BN, decimals: number = 6): string {
    const amountStr = amount.toString();
    if (amountStr.length <= decimals) {
        const paddedAmount = amountStr.padStart(decimals + 1, '0');
        const wholePart = paddedAmount.slice(0, -decimals) || '0';
        const fractionalPart = paddedAmount.slice(-decimals);
        return `${wholePart}.${fractionalPart}`;
    }

    const wholePart = amountStr.slice(0, -decimals) || '0';
    const fractionalPart = amountStr.slice(-decimals).padStart(decimals, '0');
    return `${wholePart}.${fractionalPart}`;
}

/**
 * Parse price with scale
 */
export function parsePrice(price: string): anchor.BN {
    return parseTokenAmount(price, 6);
}

/**
 * Format price for display
 */
export function formatPrice(price: anchor.BN): string {
    return formatTokenAmount(price, 6);
}

/**
 * Convert amount to lamports/smallest unit
 */
export function toSmallestUnit(amount: number, decimals: number = 6): anchor.BN {
    return new anchor.BN(amount * Math.pow(10, decimals));
}

/**
 * Convert from lamports/smallest unit to decimal
 */
export function fromSmallestUnit(amount: anchor.BN, decimals: number = 6): number {
    return amount.toNumber() / Math.pow(10, decimals);
} 