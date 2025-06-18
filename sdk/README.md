# Orca Solana Trading SDK

A TypeScript SDK for the Orca Solana Premarket Trading System that supports both Keypair-based (server-side) and Wallet Adapter (client-side) authentication patterns.

## 🚀 Features

- **Dual Authentication Support**: Works with both `Keypair` (server/testing) and Wallet Adapter (client/dApp)
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Simple Transaction Handling**: Automatic keypair generation and signing for complex operations
- **React Integration**: Built-in hooks and components for React applications
- **Error Handling**: Comprehensive error types and handling
- **Modern Architecture**: Clean separation between business logic and authentication

## 📦 Installation

```bash
npm install @orca/solana-trading-sdk

# For client-side usage
npm install @solana/wallet-adapter-react @solana/wallet-adapter-wallets

# For server-side usage (development dependencies)
npm install --save-dev @types/node
```

## 🔧 Quick Start

### Server-side Usage (Keypair)

```typescript
import { OrcaSDK, KeypairWallet } from '@orca/solana-trading-sdk';
import { Keypair } from '@solana/web3.js';

// Create SDK instance
const sdk = OrcaSDK.create({
    network: 'devnet',
});

// Server-side authentication
const adminKeypair = Keypair.generate();
const adminWallet = new KeypairWallet(adminKeypair);

// Execute operations with context
const result = await sdk.trading.initializeTrading(
    { wallet: adminWallet },
    vaultProgramId,
    economicConfig
);
```

### Client-side Usage (Wallet Adapter)

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { OrcaSDK, AdapterWallet } from '@orca/solana-trading-sdk';

function TradingComponent() {
    const { wallet, connected } = useWallet();
    
    const sdk = OrcaSDK.create({
        network: 'devnet',
    });

    const handleDeposit = async () => {
        if (!connected || !wallet) return;
        
        const adapterWallet = new AdapterWallet(wallet.adapter);
        
        await sdk.vault.deposit(
            { wallet: adapterWallet },
            {
                tokenMint: USDC_MINT,
                amount: new anchor.BN(1000000),
            }
        );
    };

    return (
        <button onClick={handleDeposit}>
            Deposit to Vault
        </button>
    );
}
```

## 🎯 Key Concepts

### Wallet Abstraction

The SDK uses a `WalletSigner` interface that both Keypair and Wallet Adapter can implement:

```typescript
interface WalletSigner {
    publicKey: PublicKey;
    signTransaction(transaction: Transaction): Promise<Transaction>;
    signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}
```

### Operation Context

All operations require an `OperationContext` instead of passing keypairs directly:

```typescript
interface OperationContext {
    wallet: WalletSigner;
    skipPreflight?: boolean;
    commitment?: Commitment;
}
```

### Generated Keypairs

For operations requiring new accounts (like `matchOrders`), the SDK automatically:

1. Generates required keypairs client-side
2. Signs with generated keypairs first
3. Then signs with user's wallet
4. Submits the complete transaction

```typescript
// Inside matchOrders implementation
const tradeRecord = Keypair.generate();
const transaction = new Transaction().add(instruction);

// Sign with generated keypair first
transaction.partialSign(tradeRecord);

// Then execute with user's wallet
const signature = await client.executeTransaction(transaction, context);
```

## 📚 API Reference

### Core Classes

#### `OrcaSDK`

Main SDK entry point.

```typescript
const sdk = OrcaSDK.create({
    network: 'devnet' | 'mainnet' | 'localnet',
    rpcUrl?: string,
    vaultProgramId?: string,
    tradingProgramId?: string,
});
```

#### `KeypairWallet`

Wrapper for Solana Keypair to implement WalletSigner interface.

```typescript
const wallet = new KeypairWallet(keypair);
```

#### `AdapterWallet`

Wrapper for Wallet Adapter to implement WalletSigner interface.

```typescript
const wallet = new AdapterWallet(walletAdapter);
```

### Trading Operations

#### Initialize Trading System

```typescript
await sdk.trading.initializeTrading(
    context: OperationContext,
    vaultProgramId: PublicKey,
    economicConfig?: EconomicConfig,
    technicalConfig?: TechnicalConfig
): Promise<TradingInitResult>
```

#### Create Token Market

```typescript
await sdk.trading.createTokenMarket(
    context: OperationContext,
    params: {
        symbol: string;
        name: string;
        settleTimeLimit: number;
    }
): Promise<TokenMarketResult>
```

#### Match Orders

```typescript
await sdk.trading.matchOrders(
    params: {
        buyOrder: PreOrder;
        sellOrder: PreOrder;
        buySignature: number[];
        sellSignature: number[];
        fillAmount?: BN;
    },
    context: OperationContext
): Promise<TradeMatchResult>
```

### Vault Operations

#### Deposit

```typescript
await sdk.vault.deposit(
    context: OperationContext,
    params: {
        tokenMint: PublicKey;
        amount: BN;
    }
): Promise<TransactionResult>
```

#### Withdraw

```typescript
await sdk.vault.withdraw(
    context: OperationContext,
    params: {
        tokenMint: PublicKey;
        amount: BN;
    }
): Promise<TransactionResult>
```

## 🔗 React Integration

### useOrcaSDK Hook

```typescript
import { useOrcaSDK } from '@orca/solana-trading-sdk';

function Component() {
    const { sdk, connected, executeWithWallet } = useOrcaSDK();
    
    const deposit = async () => {
        await executeWithWallet(async (wallet) => {
            return await sdk.vault.deposit(
                { wallet },
                { tokenMint: USDC_MINT, amount: new BN(1000000) }
            );
        });
    };
}
```

## 🛠️ Development

### Running Examples

```bash
# Server-side example
npm run example:server

# Client-side example (requires React setup)
npm run example:client
```

### Testing

```bash
npm test
```

### Building

```bash
npm run build
```

## 🔒 Security Considerations

1. **Keypair Management**: Never expose private keys in client-side code
2. **Transaction Verification**: Always verify transaction parameters before signing
3. **Network Security**: Use HTTPS endpoints for RPC connections
4. **Wallet Security**: Respect wallet adapter security practices

## 🎨 Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Client App    │    │   Server App     │
│   (React)       │    │   (Node.js)      │
└─────────┬───────┘    └─────────┬────────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌──────────────────┐
│ AdapterWallet   │    │  KeypairWallet   │
│ (Wallet Adapter)│    │  (Keypair)       │
└─────────┬───────┘    └─────────┬────────┘
          │                      │
          └──────────┬───────────┘
                     ▼
            ┌─────────────────┐
            │  WalletSigner   │
            │   Interface     │
            └─────────┬───────┘
                      ▼
            ┌─────────────────┐
            │   Orca SDK      │
            │   Operations    │
            └─────────────────┘
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

- Documentation: [docs.orca.so](https://docs.orca.so)
- Issues: [GitHub Issues](https://github.com/orca/solana-contracts/issues)
- Discord: [Orca Community](https://discord.gg/orca) 