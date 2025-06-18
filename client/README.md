# Orca Trading Client

NextJS-based client application for interacting with the Orca Solana Premarket Trading System.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- pnpm
- Phantom wallet browser extension (for testing)

### Installation & Development

```bash
# From the root directory
pnpm install

# Start the development server
pnpm dev:client

# Or run from client directory
cd client
pnpm dev
```

The client will be available at http://localhost:3000

## 🏗️ Project Structure

```
client/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   └── TradingDemo.tsx
│   ├── hooks/            # Custom React hooks
│   │   └── useTrading.ts
│   └── providers/        # Context providers
│       └── WalletProvider.tsx
├── package.json
└── README.md
```

## 🔧 Features

### Current (Demo Phase)
- ✅ Wallet connection setup (Phantom)
- ✅ Basic UI with Tailwind CSS
- ✅ Trading hook structure
- ✅ SDK integration foundation

### Planned
- 🔄 Create token markets
- 🔄 Place buy/sell orders
- 🔄 View order book
- 🔄 Trade settlement
- 🔄 Balance management

## 🛠️ Development

### Local SDK Development
The client uses the local SDK through pnpm workspace:

```bash
# Build SDK when making changes
pnpm build:sdk

# Or run SDK in watch mode
pnpm dev:sdk
```

### Environment Variables
Create `.env.local` if needed:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

## 🔗 Dependencies

### Core
- Next.js 15 with App Router
- React 19
- TypeScript 5
- Tailwind CSS 4

### Solana
- @solana/wallet-adapter-* (wallet integration)
- @solana/web3.js
- @orca/solana-trading-sdk (workspace dependency)

## 🎯 Usage

1. **Connect Wallet**: Click the connect button and select Phantom
2. **Create Market**: Use the demo interface to create a token market
3. **View Results**: Transaction results will be displayed in the UI

## 🚧 Development Notes

- Wallet adapters are set up for Phantom wallet
- SDK calls are currently mocked until full integration
- UI is responsive and includes error handling
- All components use TypeScript for type safety

## 📝 Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```
