# 🚀 Premarket Trading Scripts

Tập hợp các script TypeScript cho hệ thống Premarket Trading trên Solana, bao gồm toàn bộ flow từ setup đến trading và settlement.

## 📋 Script Overview

### Core Setup Scripts
1. **01-initialize-vault.ts** - Khởi tạo Vault Program
2. **02-add-authorized-trader.ts** - Thêm authorized traders
3. **03-deposit-collateral.ts** - Deposit collateral cho trading
4. **04-withdraw-collateral.ts** - Withdraw collateral
5. **05-initialize-trading.ts** - Khởi tạo Trading Program

### Full Flow Trading Scripts
6. **06-create-token-market.ts** - Tạo token market mới
7. **07-map-token.ts** - Map real token với token market
8. **08-manage-relayers.ts** - Quản lý relayers (add/remove)
9. **09-match-orders.ts** - Match buy/sell orders (Core business logic)
10. **10-settle-trade.ts** - Settlement - seller giao token cho buyer
11. **11-cancel-trade.ts** - Cancel trade sau grace period

## 🔧 Environment Variables

Tạo file `.env` với các biến sau:

```bash
# Network Configuration
SOLANA_NETWORK=devnet
RPC_URL=https://api.devnet.solana.com

# Keypairs (paths to JSON files)
DEPLOYER_KEYPAIR=~/.config/solana/id.json
ADMIN_KEYPAIR=~/.config/solana/id.json
RELAYER_KEYPAIR=~/.config/solana/relayer.json
BUY_TRADER_KEYPAIR=~/.config/solana/buyer.json
SELL_TRADER_KEYPAIR=~/.config/solana/seller.json
TRADER_KEYPAIR=~/.config/solana/trader.json

# Program Configuration
VAULT_PROGRAM_ID=a7GxwYc2RSZgiHc9Z8YMr82NppshTNPbqMbfSfvyroE
TRADING_PROGRAM_ID=6AXDZgH6QnCwCzJZEYp7bsQrq4yxMmhLMus66zy4ZkNF

# Economic Configuration
BUYER_COLLATERAL_RATIO=10000  # 100%
SELLER_COLLATERAL_RATIO=10000 # 100%
SELLER_REWARD_BPS=0           # 0%
LATE_PENALTY_BPS=10000        # 100%
MINIMUM_FILL_AMOUNT=1000
MAXIMUM_ORDER_AMOUNT=1000000000000

# Technical Configuration
MIN_SETTLE_TIME=3600          # 1 hour
MAX_SETTLE_TIME=2592000       # 30 days

# Token Market Configuration
TOKEN_SYMBOL=TEST
TOKEN_NAME=Test Token
SETTLE_TIME_LIMIT=86400       # 24 hours

# Trading Configuration
TOKEN_MARKET_ADDRESS=          # Set after creating token market
REAL_TOKEN_MINT=               # Real token mint address
COLLATERAL_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v # USDC
RELAYER_ADDRESS=               # Relayer public key
RELAYER_ACTION=add             # add/remove

# Order Configuration
ORDER_AMOUNT=1000000           # 1 token (6 decimals)
ORDER_PRICE=1000000            # $1.00 (6 decimals)
BUY_NONCE=1
SELL_NONCE=2
FILL_AMOUNT=                   # Optional partial fill

# Trade Management
TRADE_RECORD_ADDRESS=          # Set after matching orders
```

## 🏃‍♂️ Chạy Scripts

### 1. Setup Phase

```bash
# Initialize Vault Program
npx ts-node scripts/01-initialize-vault.ts

# Add authorized traders
npx ts-node scripts/02-add-authorized-trader.ts

# Deposit collateral
npx ts-node scripts/03-deposit-collateral.ts

# Initialize Trading Program
npx ts-node scripts/05-initialize-trading.ts
```

### 2. Token Market Setup

```bash
# Create token market
npx ts-node scripts/06-create-token-market.ts

# Map real token to market
TOKEN_MARKET_ADDRESS=<từ_step_trước> \
REAL_TOKEN_MINT=<real_token_mint> \
npx ts-node scripts/07-map-token.ts

# Add relayers
RELAYER_ADDRESS=<relayer_pubkey> \
RELAYER_ACTION=add \
npx ts-node scripts/08-manage-relayers.ts
```

### 3. Trading Flow

```bash
# Match orders (Core business logic)
TOKEN_MARKET_ADDRESS=<token_market> \
COLLATERAL_MINT=<usdc_mint> \
ORDER_AMOUNT=1000000 \
ORDER_PRICE=1000000 \
BUY_NONCE=1 \
SELL_NONCE=2 \
npx ts-node scripts/09-match-orders.ts

# Settle trade (Seller delivers tokens)
TRADE_RECORD_ADDRESS=<từ_match_orders> \
SELL_TRADER_KEYPAIR=<seller_keypair> \
npx ts-node scripts/10-settle-trade.ts

# OR Cancel trade (After grace period)
TRADE_RECORD_ADDRESS=<từ_match_orders> \
TRADER_KEYPAIR=<buyer_or_seller_keypair> \
npx ts-node scripts/11-cancel-trade.ts
```

## 🔄 Full Flow Example

1. **Setup**: Initialize vault → Add traders → Deposit collateral → Initialize trading
2. **Market Setup**: Create token market → Map real token → Add relayers  
3. **Trading**: Match orders → Wait for settlement period → Settle or Cancel

## 📁 Key Storage

Scripts sẽ tự động lưu keypairs vào thư mục `./keys/`:
- `token-market-{symbol}.json` - TokenMarket keypair
- `trade-record-{timestamp}.json` - TradeRecord keypair

## 🛡️ Security Notes

1. **Signature Verification**: Orders được sign bằng ed25519
2. **Collateral Management**: Tự động lock/unlock collateral qua CPI calls
3. **Authority Checks**: Chỉ admin/relayer/trader có thể thực hiện actions tương ứng
4. **Time-based Logic**: Settlement có grace period và penalty mechanism

## 🔍 Troubleshooting

### Common Issues:

1. **IDL Not Found**: Đảm bảo program đã được build và deploy
2. **Insufficient Balance**: Check collateral balance trước khi trading
3. **Account Not Found**: Verify addresses trong environment variables
4. **Permission Denied**: Check signer authority cho từng instruction

### Debug Tips:

```bash
# Check account info
solana account <account_address> --url devnet

# Check program logs
solana logs <program_id> --url devnet

# Check transaction details  
solana confirm <transaction_signature> --url devnet
```

## 🏗️ Architecture

### Program Structure:
- **EscrowVault Program**: Quản lý collateral và balance
- **PreMarketTrade Program**: Xử lý trading logic và order matching

### Account Patterns:
- **PDAs**: VaultConfig, UserBalance, TradeConfig, OrderStatus
- **User-Controlled**: TokenMarket, TradeRecord (dùng keypairs)

### Cross-Program Integration:
- Trading Program gọi CPI đến Vault Program
- Vault Program quản lý custody và balance
- Trading Program xử lý business logic

## 📊 Economic Model

### Collateral Requirements:
- **Buyer**: 100% trade value default
- **Seller**: 100% trade value default  
- **Penalties**: Up to 100% for late settlement
- **Rewards**: Seller có thể nhận reward for early delivery

### Settlement Flow:
1. **Match Orders**: Lock collateral từ cả 2 bên
2. **Wait for Settlement**: Grace period cho seller giao token
3. **Settle**: Seller chuyển token → Unlock collateral
4. **Cancel**: Nếu quá hạn → Apply penalties

Tất cả scripts đều có error handling và verification để đảm bảo data consistency! 