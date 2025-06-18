/**
 * Trading Operations - All trading related operations
 */

import * as anchor from "@coral-xyz/anchor";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { TradingClient } from "./trading-client";
import { VaultClient } from "../vault/vault-client";
import {
    getTradeConfigPDA,
    getUserBalancePDA,
    getVaultConfigPDA,
    getVaultAuthorityPDA
} from "../utils/pda";
import { DEFAULT_ECONOMIC_CONFIG, DEFAULT_TECHNICAL_CONFIG } from "../utils/constants";
import {
    TokenMarketParams,
    MapTokenParams,
    MatchOrdersParams,
    TransactionResult,
    TradingInitResult,
    TokenMarketResult,
    TradeMatchResult,
    EconomicConfig,
    TechnicalConfig,
    SDKError,
    SDKErrorCode,
    OperationContext
} from "../types";

/**
 * Initialize trading system
 */
export async function initializeTrading(
    client: TradingClient,
    context: OperationContext,
    vaultProgramId: PublicKey,
    economicConfig: EconomicConfig = DEFAULT_ECONOMIC_CONFIG,
    technicalConfig: TechnicalConfig = DEFAULT_TECHNICAL_CONFIG
): Promise<TradingInitResult> {
    try {
        const provider = client.createProvider(context.wallet);
        const program = await client.getProgram(provider);
        const [tradeConfigPDA] = getTradeConfigPDA(client.getConfig().tradingProgramId);

        // Check if already initialized
        try {
            await program.account.tradeConfig.fetch(tradeConfigPDA);
            throw new SDKError(SDKErrorCode.ALREADY_INITIALIZED, "Trading already initialized");
        } catch (error) {
            if (error instanceof SDKError) {
                throw error;
            }
            // Continue with initialization if account doesn't exist
        }

        // Build transaction
        const ix = await program.methods
            .initializeTrading(vaultProgramId, economicConfig, technicalConfig)
            .accounts({
                admin: context.wallet.publicKey,
                tradeConfig: tradeConfigPDA,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        const transaction = new Transaction().add(ix);

        // Execute transaction
        const signature = await client.executeTransaction(transaction, context);

        // Get transaction details
        const txDetails = await client.getTransactionDetails(signature);

        return {
            signature,
            tradeConfigPDA,
            vaultProgram: vaultProgramId,
            slot: txDetails?.slot,
            blockTime: txDetails?.blockTime ? txDetails.blockTime * 1000 : undefined,
            fee: txDetails?.meta?.fee,
        };
    } catch (error) {
        if (error instanceof SDKError) {
            throw error;
        }
        throw new SDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to initialize trading",
            error as Error
        );
    }
}

/**
 * Create token market
 */
export async function createTokenMarket(
    client: TradingClient,
    context: OperationContext,
    params: TokenMarketParams
): Promise<TokenMarketResult> {
    try {
        const provider = client.createProvider(context.wallet);
        const program = await client.getProgram(provider);
        const [tradeConfigPDA] = getTradeConfigPDA(client.getConfig().tradingProgramId);

        // Generate keypair for TokenMarket (user-controlled, not PDA)
        const tokenMarket = Keypair.generate();

        // Build instruction
        const ix = await program.methods
            .createTokenMarket(params.symbol, params.name, params.settleTimeLimit)
            .accounts({
                admin: context.wallet.publicKey,
                tokenMarket: tokenMarket.publicKey,
                config: tradeConfigPDA,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        // Create transaction
        const transaction = new Transaction().add(ix);

        // CRITICAL: Set transaction parameters before partial signing
        // This ensures the tokenMarket signature is created with complete transaction message
        const { blockhash } = await client.getConnection().getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = context.wallet.publicKey;

        // Now safe to sign with tokenMarket keypair (complete transaction message)
        transaction.partialSign(tokenMarket);

        // Execute with wallet adapter (executeTransaction won't override blockhash/feePayer)
        const signature = await client.executeTransaction(transaction, context);

        // Get transaction details
        const txDetails = await client.getTransactionDetails(signature);

        return {
            signature,
            tokenMarket: tokenMarket.publicKey,
            symbol: params.symbol,
            name: params.name,
            slot: txDetails?.slot,
            blockTime: txDetails?.blockTime ? txDetails.blockTime * 1000 : undefined,
            fee: txDetails?.meta?.fee,
        };
    } catch (error) {
        throw new SDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to create token market",
            error as Error
        );
    }
}

/**
 * Map real token to token market
 */
export async function mapToken(
    client: TradingClient,
    context: OperationContext,
    params: MapTokenParams
): Promise<TransactionResult> {
    try {
        const provider = client.createProvider(context.wallet);
        const program = await client.getProgram(provider);
        const [tradeConfigPDA] = getTradeConfigPDA(client.getConfig().tradingProgramId);

        // Build instruction
        const ix = await program.methods
            .mapToken(params.realMint)
            .accounts({
                admin: context.wallet.publicKey,
                tokenMarket: params.tokenMarket,
                config: tradeConfigPDA,
                realMint: params.realMint,
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
        throw new SDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to map token",
            error as Error
        );
    }
}

/**
 * Manage relayers (add or remove)
 */
export async function manageRelayers(
    client: TradingClient,
    context: OperationContext,
    relayerAddress: PublicKey,
    isAdd: boolean
): Promise<TransactionResult> {
    try {
        const provider = client.createProvider(context.wallet);
        const program = await client.getProgram(provider);
        const [tradeConfigPDA] = getTradeConfigPDA(client.getConfig().tradingProgramId);

        // Build instruction
        const ix = await program.methods
            .manageRelayers(relayerAddress, isAdd)
            .accounts({
                admin: context.wallet.publicKey,
                config: tradeConfigPDA,
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
        throw new SDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            `Failed to ${isAdd ? 'add' : 'remove'} relayer`,
            error as Error
        );
    }
}

/**
 * Match buy and sell orders
 */
export async function matchOrders(
    tradingClient: TradingClient,
    vaultClient: VaultClient,
    params: MatchOrdersParams,
    context: OperationContext
): Promise<TradeMatchResult> {
    try {
        const provider = tradingClient.createProvider(context.wallet);
        const tradingProgram = await tradingClient.getProgram(provider);
        const tradingProgramId = tradingClient.getConfig().tradingProgramId;
        const vaultProgramId = vaultClient.getConfig().vaultProgramId;

        // Generate trade record keypair (this is the key insight!)
        const tradeRecord = Keypair.generate();

        // Get PDAs
        const [tradeConfigPDA] = getTradeConfigPDA(tradingProgramId);
        const [buyUserBalancePDA] = getUserBalancePDA(vaultProgramId, params.buyOrder.trader, params.buyOrder.collateralToken);
        const [sellUserBalancePDA] = getUserBalancePDA(vaultProgramId, params.sellOrder.trader, params.sellOrder.collateralToken);
        const [vaultConfigPDA] = getVaultConfigPDA(vaultProgramId);
        const [vaultAuthorityPDA] = getVaultAuthorityPDA(vaultProgramId, params.buyOrder.collateralToken);

        // Get token accounts
        const buyerCollateralAta = await getAssociatedTokenAddress(params.buyOrder.collateralToken, params.buyOrder.trader);
        const sellerCollateralAta = await getAssociatedTokenAddress(params.sellOrder.collateralToken, params.sellOrder.trader);

        // Build instruction
        const ix = await tradingProgram.methods
            .matchOrders(
                params.buyOrder,
                params.sellOrder,
                params.fillAmount || null
            )
            .accounts({
                relayer: context.wallet.publicKey, // from context now
                tradeRecord: tradeRecord.publicKey,
                tokenMarket: params.buyOrder.tokenId,
                config: tradeConfigPDA,
                buyerBalance: buyUserBalancePDA,
                sellerBalance: sellUserBalancePDA,
                vaultProgram: vaultProgramId,
                vaultConfig: vaultConfigPDA,
                vaultAuthority: vaultAuthorityPDA,
                buyerCollateralAta: buyerCollateralAta,
                sellerCollateralAta: sellerCollateralAta,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
            })
            .instruction();

        // Create transaction
        const transaction = new Transaction().add(ix);

        // Add compute budget instruction
        transaction.add(
            anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
                units: 400_000
            })
        );

        // CRITICAL: Set transaction parameters before partial signing
        // This ensures the tradeRecord signature is created with complete transaction message
        const { blockhash } = await tradingClient.getConnection().getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = context.wallet.publicKey;

        // Now safe to sign with tradeRecord keypair (complete transaction message)
        transaction.partialSign(tradeRecord);

        // Execute with wallet adapter (executeTransaction won't override blockhash/feePayer)
        const signature = await tradingClient.executeTransaction(transaction, context);

        // Get transaction details
        const txDetails = await tradingClient.getTransactionDetails(signature);

        return {
            signature,
            tradeRecord: tradeRecord.publicKey,
            buyTrader: params.buyOrder.trader,
            sellTrader: params.sellOrder.trader,
            amount: params.fillAmount || params.buyOrder.amount,
            price: params.buyOrder.price,
            slot: txDetails?.slot,
            blockTime: txDetails?.blockTime ? txDetails.blockTime * 1000 : undefined,
            fee: txDetails?.meta?.fee,
        };
    } catch (error) {
        throw new SDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to match orders",
            error as Error
        );
    }
}

/**
 * Settle trade (seller delivers tokens)
 */
export async function settleTrade(
    tradingClient: TradingClient,
    vaultClient: VaultClient,
    tradeRecordAddress: PublicKey,
    context: OperationContext
): Promise<TransactionResult> {
    try {
        const provider = tradingClient.createProvider(context.wallet);
        const tradingProgram = await tradingClient.getProgram(provider);
        const vaultProgramId = vaultClient.getConfig().vaultProgramId;

        // Get trade record info
        const tradeRecord = await tradingProgram.account.tradeRecord.fetch(tradeRecordAddress) as any;

        // Verify seller
        if (!tradeRecord.seller.equals(context.wallet.publicKey)) {
            throw new SDKError(SDKErrorCode.UNAUTHORIZED, "Only the sell trader can settle this trade");
        }

        // Check if already settled
        if (tradeRecord.settled) {
            throw new SDKError(SDKErrorCode.ALREADY_INITIALIZED, "Trade has already been settled");
        }

        // Get token market and real token info
        const tokenMarket = await tradingProgram.account.tokenMarket.fetch(tradeRecord.tokenId) as any;
        const realTokenMint = tokenMarket.realMint;
        const collateralMint = tradeRecord.collateralMint;

        // Get PDAs and token accounts
        const [tradeConfigPDA] = getTradeConfigPDA(tradingClient.getConfig().tradingProgramId);
        const [vaultConfigPDA] = getVaultConfigPDA(vaultProgramId);
        const [sellUserBalancePDA] = getUserBalancePDA(vaultProgramId, tradeRecord.seller, collateralMint);
        const [vaultAuthorityPDA] = getVaultAuthorityPDA(vaultProgramId, collateralMint);

        // Get associated token accounts
        const sellerTokenAta = await getAssociatedTokenAddress(realTokenMint, context.wallet.publicKey);
        const buyerTokenAta = await getAssociatedTokenAddress(realTokenMint, tradeRecord.buyer);
        const sellerCollateralAta = await getAssociatedTokenAddress(collateralMint, context.wallet.publicKey);
        const vaultAta = await getAssociatedTokenAddress(collateralMint, vaultAuthorityPDA, true);

        // Check if buyer's token account exists
        const buyerAccountExists = await tradingClient.accountExists(buyerTokenAta);

        // Prepare instructions
        const instructions: TransactionInstruction[] = [];

        // Add create associated token account instruction if needed
        if (!buyerAccountExists) {
            const createAccountIx = createAssociatedTokenAccountInstruction(
                context.wallet.publicKey, // payer
                buyerTokenAta,    // associated token account
                tradeRecord.buyer, // owner
                realTokenMint,    // mint
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            instructions.push(createAccountIx);
        }

        // Add settle trade instruction
        const settleTradeIx = await tradingProgram.methods
            .settleTrade()
            .accounts({
                tradeRecord: tradeRecordAddress,
                tokenMarket: tradeRecord.tokenId,
                config: tradeConfigPDA,
                seller: context.wallet.publicKey,
                vaultProgram: vaultProgramId,
                vaultConfig: vaultConfigPDA,
                sellerBalance: sellUserBalancePDA,
                vaultAuthority: vaultAuthorityPDA,
                vaultAta: vaultAta,
                sellerCollateralAta: sellerCollateralAta,
                sellerTokenAta: sellerTokenAta,
                buyerTokenAta: buyerTokenAta,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
            })
            .instruction();

        instructions.push(settleTradeIx);

        // Create transaction
        const transaction = new Transaction();
        transaction.add(...instructions);

        // Execute with wallet
        const signature = await tradingClient.executeTransaction(transaction, context);

        // Get transaction details
        const txDetails = await tradingClient.getTransactionDetails(signature);

        return {
            signature,
            slot: txDetails?.slot,
            blockTime: txDetails?.blockTime ? txDetails.blockTime * 1000 : undefined,
            fee: txDetails?.meta?.fee,
        };
    } catch (error) {
        throw new SDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to settle trade",
            error as Error
        );
    }
}

/**
 * Cancel trade after grace period
 */
export async function cancelTrade(
    tradingClient: TradingClient,
    vaultClient: VaultClient,
    tradeRecordAddress: PublicKey,
    context: OperationContext
): Promise<TransactionResult> {
    try {
        const provider = tradingClient.createProvider(context.wallet);
        const tradingProgram = await tradingClient.getProgram(provider);
        const vaultProgramId = vaultClient.getConfig().vaultProgramId;

        // Get trade record info
        const tradeRecord = await tradingProgram.account.tradeRecord.fetch(tradeRecordAddress) as any;

        // Verify buyer can cancel
        if (!tradeRecord.buyer.equals(context.wallet.publicKey)) {
            throw new SDKError(SDKErrorCode.UNAUTHORIZED, "Only the buy trader can cancel this trade");
        }

        // Check if already settled
        if (tradeRecord.settled) {
            throw new SDKError(SDKErrorCode.ALREADY_INITIALIZED, "Trade has already been settled");
        }

        // Get token market and check grace period
        const tokenMarket = await tradingProgram.account.tokenMarket.fetch(tradeRecord.tokenId) as any;
        const currentTime = Math.floor(Date.now() / 1000);
        const gracePeriodEnd = tradeRecord.matchTime.toNumber() + tokenMarket.settleTimeLimit;

        if (currentTime <= gracePeriodEnd) {
            throw new SDKError(SDKErrorCode.INVALID_CONFIG, "Grace period has not expired yet. Cannot cancel trade.");
        }

        const collateralMint = tradeRecord.collateralMint;

        // Get PDAs and token accounts
        const [tradeConfigPDA] = getTradeConfigPDA(tradingClient.getConfig().tradingProgramId);
        const [vaultConfigPDA] = getVaultConfigPDA(vaultProgramId);
        const [buyUserBalancePDA] = getUserBalancePDA(vaultProgramId, tradeRecord.buyer, collateralMint);
        const [sellUserBalancePDA] = getUserBalancePDA(vaultProgramId, tradeRecord.seller, collateralMint);
        const [vaultAuthorityPDA] = getVaultAuthorityPDA(vaultProgramId, collateralMint);

        // Get associated token accounts
        const buyerCollateralAta = await getAssociatedTokenAddress(collateralMint, context.wallet.publicKey);
        const sellerCollateralAta = await getAssociatedTokenAddress(collateralMint, tradeRecord.seller);
        const vaultAta = await getAssociatedTokenAddress(collateralMint, vaultAuthorityPDA, true);

        // Build instruction
        const ix = await tradingProgram.methods
            .cancelTrade()
            .accounts({
                tradeRecord: tradeRecordAddress,
                tokenMarket: tradeRecord.tokenId,
                config: tradeConfigPDA,
                buyer: context.wallet.publicKey,
                vaultProgram: vaultProgramId,
                vaultConfig: vaultConfigPDA,
                buyerBalance: buyUserBalancePDA,
                sellerBalance: sellUserBalancePDA,
                vaultAuthority: vaultAuthorityPDA,
                vaultAta: vaultAta,
                buyerCollateralAta: buyerCollateralAta,
                sellerCollateralAta: sellerCollateralAta,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
            })
            .instruction();

        // Create transaction
        const transaction = new Transaction().add(ix);

        // Add compute budget instruction
        transaction.add(
            anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
                units: 400_000
            })
        );

        // Execute with wallet
        const signature = await tradingClient.executeTransaction(transaction, context);

        // Get transaction details
        const txDetails = await tradingClient.getTransactionDetails(signature);

        return {
            signature,
            slot: txDetails?.slot,
            blockTime: txDetails?.blockTime ? txDetails.blockTime * 1000 : undefined,
            fee: txDetails?.meta?.fee,
        };
    } catch (error) {
        throw new SDKError(
            SDKErrorCode.TRANSACTION_FAILED,
            "Failed to cancel trade",
            error as Error
        );
    }
} 