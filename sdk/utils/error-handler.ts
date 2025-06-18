/**
 * Enhanced Error Handler - Parse and preserve Anchor/Solana error details
 */

import * as anchor from "@coral-xyz/anchor";
import { SendTransactionError } from "@solana/web3.js";
import { SDKError, SDKErrorCode } from "../types";

// Error types that can occur
export enum ErrorType {
    ANCHOR_ERROR = 'ANCHOR_ERROR',
    PROGRAM_ERROR = 'PROGRAM_ERROR',
    SEND_TRANSACTION_ERROR = 'SEND_TRANSACTION_ERROR',
    RPC_ERROR = 'RPC_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Enhanced error details interface
export interface ErrorDetails {
    type: ErrorType;
    programId?: string;
    errorCode?: number;
    errorName?: string;
    originalMessage?: string;
    logs?: string[];
    transactionSignature?: string;
    instruction?: number;
}

/**
 * Parse and extract detailed error information from Anchor/Solana errors
 */
export function parseError(error: any): ErrorDetails {
    // Handle Anchor errors (program-specific errors)
    if (error instanceof anchor.AnchorError) {
        return {
            type: ErrorType.ANCHOR_ERROR,
            programId: error.program?.toString(),
            errorCode: error.error.errorCode.number,
            errorName: error.error.errorCode.code,
            originalMessage: error.error.errorMessage,
            logs: error.logs,
            instruction: typeof error.error.origin === 'number' ? error.error.origin : undefined
        };
    }

    // Handle ProgramError (generic Solana program errors)
    if (error instanceof anchor.ProgramError) {
        return {
            type: ErrorType.PROGRAM_ERROR,
            programId: error.program?.toString(),
            errorCode: error.code,
            originalMessage: error.msg,
            logs: error.logs
        };
    }

    // Handle SendTransactionError (transaction-level errors)
    if (error instanceof SendTransactionError) {
        return {
            type: ErrorType.SEND_TRANSACTION_ERROR,
            originalMessage: error.message,
            logs: error.logs,
            transactionSignature: undefined // Cannot access private property
        };
    }

    // Handle RPC errors
    if (error?.code && error?.message) {
        return {
            type: ErrorType.RPC_ERROR,
            errorCode: error.code,
            originalMessage: error.message,
            logs: error.data?.logs
        };
    }

    // Handle timeout errors
    if (error?.message?.includes('timeout') || error?.message?.includes('Timeout')) {
        return {
            type: ErrorType.TIMEOUT_ERROR,
            originalMessage: error.message
        };
    }

    // Unknown error type
    return {
        type: ErrorType.UNKNOWN_ERROR,
        originalMessage: error?.message || error?.toString() || 'Unknown error occurred'
    };
}

/**
 * Create enhanced SDK error with preserved details
 */
export function createSDKError(
    code: SDKErrorCode,
    message: string,
    originalError?: any
): SDKError {
    const errorDetails = originalError ? parseError(originalError) : null;

    // Create enhanced error message with details
    let enhancedMessage = message;
    if (errorDetails) {
        switch (errorDetails.type) {
            case ErrorType.ANCHOR_ERROR:
                enhancedMessage = `${message}: ${errorDetails.errorName} (${errorDetails.errorCode}) - ${errorDetails.originalMessage}`;
                break;
            case ErrorType.PROGRAM_ERROR:
                enhancedMessage = `${message}: Program Error ${errorDetails.errorCode} - ${errorDetails.originalMessage}`;
                break;
            case ErrorType.SEND_TRANSACTION_ERROR:
                enhancedMessage = `${message}: Transaction failed - ${errorDetails.originalMessage}`;
                break;
            case ErrorType.RPC_ERROR:
                enhancedMessage = `${message}: RPC Error ${errorDetails.errorCode} - ${errorDetails.originalMessage}`;
                break;
            case ErrorType.TIMEOUT_ERROR:
                enhancedMessage = `${message}: ${errorDetails.originalMessage}`;
                break;
            default:
                enhancedMessage = `${message}: ${errorDetails.originalMessage}`;
        }
    }

    const sdkError = new SDKError(code, enhancedMessage, originalError);

    // Attach additional details for programmatic access
    (sdkError as any).details = errorDetails;
    (sdkError as any).logs = errorDetails?.logs;
    (sdkError as any).programId = errorDetails?.programId;
    (sdkError as any).errorCode = errorDetails?.errorCode;
    (sdkError as any).errorName = errorDetails?.errorName;

    return sdkError;
}

/**
 * Get user-friendly error message for common errors
 */
export function getUserFriendlyMessage(error: SDKError): string {
    const details = (error as any).details as ErrorDetails;

    if (!details) {
        return error.message;
    }

    // Map common error codes to user-friendly messages  
    const commonErrors: Record<string, string> = {
        // Vault errors
        'InsufficientBalance': 'Insufficient balance in your account',
        'VaultPaused': 'Vault operations are temporarily paused',
        'UnauthorizedTrader': 'Your account is not authorized for trading',
        'InvalidTokenMint': 'Invalid token type',
        'ZeroAmount': 'Amount must be greater than zero',
        'InvalidAdmin': 'Invalid admin account',
        'TokenMintMismatch': 'Token mint does not match',
        'ArithmeticOverflow': 'Calculation overflow error',
        'TransferFailed': 'Token transfer failed',
        'AccountAlreadyInitialized': 'Account is already initialized',
        'AccountNotInitialized': 'Account has not been initialized',

        // Trading errors
        'UnauthorizedRelayer': 'Transaction not authorized by relayer',
        'TradingPaused': 'Trading is temporarily paused',
        'OrderExpired': 'Order has expired',
        'TradeAlreadySettled': 'Trade has already been settled',
        'GracePeriodActive': 'Cannot cancel trade during grace period',
        'OnlySellerCanSettle': 'Only the seller can settle this trade',
        'OnlyBuyerCanCancel': 'Only the buyer can cancel this trade',
        'TokenNotMapped': 'Token has not been mapped to a real token',
        'SelfTrade': 'Cannot trade with yourself',
        'TokenAlreadyMapped': 'Token has already been mapped',
        'InvalidTokenAddress': 'Invalid token address',
        'DuplicateSymbol': 'Token symbol already exists',
        'SymbolTooLong': 'Token symbol is too long',
        'NameTooLong': 'Token name is too long',
        'InvalidSettleTime': 'Invalid settlement time',
        'IncompatibleOrders': 'Orders cannot be matched',
        'InvalidFillAmount': 'Invalid fill amount',
        'ExceedOrderAmount': 'Fill amount exceeds order amount',
        'BelowMinimumFill': 'Fill amount below minimum',
        'PriceTooLow': 'Price is too low',
        'PriceTooHigh': 'Price is too high',
        'InvalidSignature': 'Invalid order signature',
        'GracePeriodExpired': 'Grace period has expired',
        'InvalidCollateralRatio': 'Invalid collateral ratio',
        'MathOverflow': 'Mathematical calculation overflow',
    };

    if (details.errorName && commonErrors[details.errorName]) {
        return commonErrors[details.errorName];
    }

    return error.message;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: SDKError): boolean {
    const details = (error as any).details as ErrorDetails;

    if (!details) {
        return false;
    }

    // RPC errors and timeouts are often retryable
    if (details.type === ErrorType.RPC_ERROR || details.type === ErrorType.TIMEOUT_ERROR) {
        return true;
    }

    // Some specific errors are retryable
    const retryableErrors = [
        'BlockhashNotFound',
        'TransactionExpired',
        'InstructionError',
        'AccountInUse'
    ];

    return retryableErrors.some(retryableError =>
        details.originalMessage?.includes(retryableError)
    );
}

/**
 * Extract program logs for debugging
 */
export function extractProgramLogs(error: SDKError): string[] {
    const details = (error as any).details as ErrorDetails;
    return details?.logs || [];
}

/**
 * Check if error is from specific program
 */
export function isErrorFromProgram(error: SDKError, programId: string): boolean {
    const details = (error as any).details as ErrorDetails;
    return details?.programId === programId;
} 