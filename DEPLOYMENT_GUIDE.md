# 🚀 PREMARKET TRADING SYSTEM - DEPLOYMENT GUIDE

> **Complete deployment guide for Solana Premarket Trading System**  
> **Architecture**: 2-Program System (EscrowVault + PreMarketTrade)  
> **Status**: Production Ready ✅  
> **Date**: December 2024

---

## 📋 **TABLE OF CONTENTS**

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Program Compilation](#program-compilation)
4. [Deployment Sequence](#deployment-sequence)
5. [System Initialization](#system-initialization)
6. [Testing & Validation](#testing--validation)
7. [Production Deployment](#production-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Security Checklist](#security-checklist)

---

## 🔧 **PREREQUISITES**

### **Required Software**
```bash
# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup component add rustfmt
rustup update

# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
export PATH="/home/user/.local/share/solana/install/active_release/bin:$PATH"

# Anchor framework
npm install -g @coral-xyz/anchor-cli@0.29.0
anchor --version

# Node.js & pnpm
curl -fsSL https://fnm.vercel.app/install | bash
fnm use --install-if-missing 18
npm install -g pnpm
```

### **Required Accounts & Keys**
```bash
# Generate deployment keypairs
solana-keygen new --outfile ~/.config/solana/deployer.json
solana-keygen new --outfile ~/.config/solana/vault-program.json
solana-keygen new --outfile ~/.config/solana/trading-program.json
solana-keygen new --outfile ~/.config/solana/admin.json
solana-keygen new --outfile ~/.config/solana/emergency-admin.json

# Fund accounts (devnet/testnet)
solana airdrop 10 ~/.config/solana/deployer.json --url devnet
solana airdrop 5 ~/.config/solana/admin.json --url devnet
```

### **Environment Variables**
```bash
# Create .env file
cat > .env << EOF
# Network configuration
SOLANA_NETWORK=devnet  # devnet | testnet | mainnet-beta
RPC_URL=https://api.devnet.solana.com

# Program keypairs
DEPLOYER_KEYPAIR=~/.config/solana/deployer.json
VAULT_PROGRAM_KEYPAIR=~/.config/solana/vault-program.json
TRADING_PROGRAM_KEYPAIR=~/.config/solana/trading-program.json

# Admin keypairs
ADMIN_KEYPAIR=~/.config/solana/admin.json
EMERGENCY_ADMIN_KEYPAIR=~/.config/solana/emergency-admin.json

# Token mints (devnet examples)
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
USDT_MINT=EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS

# Economic parameters
BUYER_COLLATERAL_RATIO=10000    # 100%
SELLER_COLLATERAL_RATIO=10000   # 100%
SELLER_REWARD_BPS=0             # 0%
LATE_PENALTY_BPS=10000          # 100%
MINIMUM_FILL_AMOUNT=1000        # 0.001 tokens
MAXIMUM_ORDER_AMOUNT=1000000000000  # 1M tokens

# Technical parameters
MIN_SETTLE_TIME=3600            # 1 hour
MAX_SETTLE_TIME=2592000         # 30 days
EOF

# Load environment
source .env
```

---

## 🏗️ **ENVIRONMENT SETUP**

### **1. Clone Repository**
```bash
git clone <repository-url>
cd orca-solana-contracts
```

### **2. Install Dependencies**
```bash
# Install Rust dependencies
cd programs/escrow-vault && cargo build
cd ../premarket-trade && cargo build
cd ../shared && cargo build

# Install TypeScript dependencies
cd ../../
pnpm install
```

### **3. Configure Anchor**
```bash
# Update Anchor.toml
cat > Anchor.toml << EOF
[features]
resolution = true
skip-lint = false

[programs.devnet]
escrow_vault = "$(solana-keygen pubkey ~/.config/solana/vault-program.json)"
premarket_trade = "$(solana-keygen pubkey ~/.config/solana/trading-program.json)"

[programs.testnet]
escrow_vault = "$(solana-keygen pubkey ~/.config/solana/vault-program.json)"
premarket_trade = "$(solana-keygen pubkey ~/.config/solana/trading-program.json)"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "$SOLANA_NETWORK"
wallet = "$DEPLOYER_KEYPAIR"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
EOF
```

### **4. Update Program IDs**
```bash
# Update vault program ID
VAULT_PROGRAM_ID=$(solana-keygen pubkey ~/.config/solana/vault-program.json)
sed -i "s/declare_id!(\".*\")/declare_id!(\"$VAULT_PROGRAM_ID\")/" programs/escrow-vault/src/lib.rs

# Update trading program ID
TRADING_PROGRAM_ID=$(solana-keygen pubkey ~/.config/solana/trading-program.json)
sed -i "s/declare_id!(\".*\")/declare_id!(\"$TRADING_PROGRAM_ID\")/" programs/premarket-trade/src/lib.rs

# Update cross-program references
sed -i "s/VAULT_PROGRAM_ID: Pubkey = pubkey!(\".*\")/VAULT_PROGRAM_ID: Pubkey = pubkey!(\"$VAULT_PROGRAM_ID\")/" programs/shared/src/lib.rs
sed -i "s/TRADING_PROGRAM_ID: Pubkey = pubkey!(\".*\")/TRADING_PROGRAM_ID: Pubkey = pubkey!(\"$TRADING_PROGRAM_ID\")/" programs/shared/src/lib.rs
```

---

## 🔨 **PROGRAM COMPILATION**

### **1. Build Programs**
```bash
# Build all programs
anchor build

# Verify program sizes
ls -la target/deploy/
# escrow_vault.so should be < 200KB
# premarket_trade.so should be < 300KB
```

### **2. Generate IDLs**
```bash
# Generate TypeScript types
anchor idl parse --file target/idl/escrow_vault.json --out types/escrow_vault.ts
anchor idl parse --file target/idl/premarket_trade.json --out types/premarket_trade.ts
```

### **3. Verify Program IDs**
```bash
# Check program IDs match keypairs
echo "Vault Program ID: $(solana-keygen pubkey ~/.config/solana/vault-program.json)"
echo "Trading Program ID: $(solana-keygen pubkey ~/.config/solana/trading-program.json)"

# Verify in compiled programs
solana program show --programs | grep -E "(escrow_vault|premarket_trade)"
```

---

## 🚀 **DEPLOYMENT SEQUENCE**

### **Phase 1: Deploy Vault Program**
```bash
# Deploy vault program (independent)
solana program deploy \
  target/deploy/escrow_vault.so \
  --keypair ~/.config/solana/vault-program.json \
  --url $RPC_URL

# Verify deployment
solana program show $(solana-keygen pubkey ~/.config/solana/vault-program.json) --url $RPC_URL
```

### **Phase 2: Deploy Trading Program**
```bash
# Deploy trading program (references vault)
solana program deploy \
  target/deploy/premarket_trade.so \
  --keypair ~/.config/solana/trading-program.json \
  --url $RPC_URL

# Verify deployment
solana program show $(solana-keygen pubkey ~/.config/solana/trading-program.json) --url $RPC_URL
```

### **Phase 3: Upload IDLs**
```bash
# Upload vault IDL
anchor idl init \
  $(solana-keygen pubkey ~/.config/solana/vault-program.json) \
  --filepath target/idl/escrow_vault.json \
  --provider.cluster $SOLANA_NETWORK

# Upload trading IDL
anchor idl init \
  $(solana-keygen pubkey ~/.config/solana/trading-program.json) \
  --filepath target/idl/premarket_trade.json \
  --provider.cluster $SOLANA_NETWORK
```

---

## ⚙️ **SYSTEM INITIALIZATION**

### **1. Initialize Vault Program**
```typescript
// scripts/initialize-vault.ts
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

const connection = new Connection(process.env.RPC_URL!);
const deployer = Keypair.fromSecretKey(/* load from file */);
const admin = Keypair.fromSecretKey(/* load from file */);
const emergencyAdmin = Keypair.fromSecretKey(/* load from file */);

// Initialize vault
const tx = await vaultProgram.methods
  .initializeVault(admin.publicKey, emergencyAdmin.publicKey)
  .accounts({
    config: vaultConfigPDA,
    admin: deployer.publicKey,
    systemProgram: web3.SystemProgram.programId,
  })
  .signers([deployer])
  .rpc();

console.log("Vault initialized:", tx);
```

### **2. Initialize Trading Program**
```typescript
// scripts/initialize-trading.ts
const economicConfig = {
  buyerCollateralRatio: parseInt(process.env.BUYER_COLLATERAL_RATIO!),
  sellerCollateralRatio: parseInt(process.env.SELLER_COLLATERAL_RATIO!),
  sellerRewardBps: parseInt(process.env.SELLER_REWARD_BPS!),
  latePenaltyBps: parseInt(process.env.LATE_PENALTY_BPS!),
  minimumFillAmount: new BN(process.env.MINIMUM_FILL_AMOUNT!),
  maximumOrderAmount: new BN(process.env.MAXIMUM_ORDER_AMOUNT!),
};

const technicalConfig = {
  minSettleTime: parseInt(process.env.MIN_SETTLE_TIME!),
  maxSettleTime: parseInt(process.env.MAX_SETTLE_TIME!),
};

const tx = await tradingProgram.methods
  .initializeTrading(vaultProgramId, economicConfig, technicalConfig)
  .accounts({
    config: tradeConfigPDA,
    admin: deployer.publicKey,
    systemProgram: web3.SystemProgram.programId,
  })
  .signers([deployer])
  .rpc();

console.log("Trading initialized:", tx);
```

### **3. Authorize Trading Program**
```typescript
// scripts/authorize-trading.ts
const tx = await vaultProgram.methods
  .addAuthorizedTrader(tradingProgramId)
  .accounts({
    config: vaultConfigPDA,
    admin: admin.publicKey,
  })
  .signers([admin])
  .rpc();

console.log("Trading program authorized:", tx);
```

---

## 🧪 **TESTING & VALIDATION**

### **1. Unit Tests**
```bash
# Run all tests
anchor test

# Run specific test suites
anchor test --skip-deploy tests/vault.spec.ts
anchor test --skip-deploy tests/trading.spec.ts
anchor test --skip-deploy tests/integration.spec.ts
```

### **2. Integration Tests**
```typescript
// tests/integration.spec.ts
describe("End-to-End Trading Flow", () => {
  it("Complete trading cycle", async () => {
    // 1. Create token market
    const tokenMarket = await createTokenMarket("TEST", "Test Token", 86400);
    
    // 2. Map real token
    await mapToken(tokenMarket.publicKey, testTokenMint);
    
    // 3. Deposit collateral
    await depositCollateral(buyer, USDC_MINT, 1000);
    await depositCollateral(seller, USDC_MINT, 1000);
    
    // 4. Create and sign orders
    const buyOrder = createOrder(buyer, tokenMarket.publicKey, 100, 1000000, true);
    const sellOrder = createOrder(seller, tokenMarket.publicKey, 100, 1000000, false);
    
    // 5. Match orders
    const tradeRecord = await matchOrders(buyOrder, sellOrder);
    
    // 6. Settle trade
    await settleTrade(tradeRecord.publicKey, seller);
    
    // 7. Verify final state
    expect(await getTradeRecord(tradeRecord.publicKey)).to.have.property('settled', true);
  });
});
```

---

## 🌐 **PRODUCTION DEPLOYMENT**

### **1. Mainnet Preparation**
```bash
# Generate mainnet keypairs
solana-keygen new --outfile ~/.config/solana/mainnet-deployer.json
solana-keygen new --outfile ~/.config/solana/mainnet-vault.json
solana-keygen new --outfile ~/.config/solana/mainnet-trading.json
solana-keygen new --outfile ~/.config/solana/mainnet-admin.json

# Fund deployer account
# Transfer SOL from exchange or other wallet
solana transfer 10 $(solana-keygen pubkey ~/.config/solana/mainnet-deployer.json) \
  --from ~/.config/solana/funding-wallet.json \
  --url mainnet-beta
```

### **2. Security Audit**
```bash
# Run security checks
cargo audit
anchor test --skip-deploy

# Manual security review checklist:
# ✅ All admin functions properly protected
# ✅ Cross-program calls validated
# ✅ Account ownership checks in place
# ✅ Math operations use safe arithmetic
# ✅ No hardcoded addresses or keys
# ✅ Proper error handling throughout
```

### **3. Mainnet Deployment**
```bash
# Deploy to mainnet (irreversible!)
solana program deploy \
  target/deploy/escrow_vault.so \
  --keypair ~/.config/solana/mainnet-vault.json \
  --url mainnet-beta

solana program deploy \
  target/deploy/premarket_trade.so \
  --keypair ~/.config/solana/mainnet-trading.json \
  --url mainnet-beta

# Initialize programs on mainnet
npm run initialize:mainnet
```

---

## 📊 **MONITORING & MAINTENANCE**

### **1. Event Monitoring**
```typescript
// monitoring/event-listener.ts
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(process.env.RPC_URL!);

// Monitor trading events
connection.onLogs(
  new PublicKey(process.env.TRADING_PROGRAM_ID!),
  (logs, context) => {
    console.log("Trading Program Logs:", logs);
    
    // Parse and store events
    if (logs.logs.some(log => log.includes("OrdersMatched"))) {
      handleOrdersMatched(logs);
    }
    
    if (logs.logs.some(log => log.includes("TradeSettled"))) {
      handleTradeSettled(logs);
    }
    
    if (logs.logs.some(log => log.includes("TradingPaused"))) {
      handleEmergencyPause(logs);
    }
  },
  "confirmed"
);
```

### **2. Health Checks**
```typescript
// monitoring/health-check.ts
export async function systemHealthCheck() {
  const checks = {
    vaultProgram: await checkProgramHealth(VAULT_PROGRAM_ID),
    tradingProgram: await checkProgramHealth(TRADING_PROGRAM_ID),
    vaultConfig: await checkVaultConfig(),
    tradingConfig: await checkTradingConfig(),
    collateralBalances: await checkCollateralBalances(),
    activeOrders: await checkActiveOrders(),
  };
  
  return {
    status: Object.values(checks).every(Boolean) ? 'healthy' : 'unhealthy',
    checks,
    timestamp: Date.now(),
  };
}
```

---

## 🔧 **TROUBLESHOOTING**

### **Common Issues**

#### **1. Program Deployment Fails**
```bash
# Check account balance
solana balance ~/.config/solana/deployer.json --url $RPC_URL

# Check program size
ls -la target/deploy/
# If too large, optimize build:
cargo build-bpf --release

# Check for duplicate program IDs
grep -r "declare_id" programs/
```

#### **2. Initialization Fails**
```bash
# Check admin keypair
solana-keygen verify ~/.config/solana/admin.json <admin-pubkey>

# Check PDA derivation
# Ensure seeds match exactly between client and program

# Check account rent exemption
solana rent <account-size> --url $RPC_URL
```

#### **3. CPI Calls Fail**
```bash
# Check program authorization
# Verify trading program is in vault's authorized_traders list

# Check account ownership
# Ensure all accounts belong to correct programs

# Check account data
# Verify account data matches expected structure
```

---

## 🛡️ **SECURITY CHECKLIST**

### **Pre-Deployment Security**
- [ ] **Code Audit**: Complete security audit by qualified auditors
- [ ] **Test Coverage**: >95% test coverage including edge cases
- [ ] **Dependency Audit**: All dependencies audited and up-to-date
- [ ] **Key Management**: Secure key generation and storage
- [ ] **Access Controls**: Multi-sig for admin functions
- [ ] **Parameter Validation**: All inputs validated and bounded
- [ ] **Error Handling**: Comprehensive error handling and logging

### **Deployment Security**
- [ ] **Environment Isolation**: Separate dev/test/prod environments
- [ ] **Secure Deployment**: Deployment from secure, isolated environment
- [ ] **Key Rotation**: Regular rotation of sensitive keys
- [ ] **Monitoring Setup**: Real-time monitoring and alerting
- [ ] **Incident Response**: Documented incident response procedures
- [ ] **Backup Procedures**: Regular backups of critical data
- [ ] **Recovery Testing**: Tested disaster recovery procedures

### **Operational Security**
- [ ] **Access Logging**: All admin actions logged and monitored
- [ ] **Regular Audits**: Periodic security audits and reviews
- [ ] **Update Procedures**: Secure program update procedures
- [ ] **Emergency Procedures**: Tested emergency pause/recovery
- [ ] **Staff Training**: Security training for all operators
- [ ] **Compliance**: Regulatory compliance where applicable
- [ ] **Insurance**: Appropriate insurance coverage

---

## ✅ **DEPLOYMENT CHECKLIST**

### **Phase 1: Preparation**
- [ ] Environment setup complete
- [ ] All dependencies installed
- [ ] Keypairs generated and funded
- [ ] Program IDs updated
- [ ] Configuration validated

### **Phase 2: Testing**
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Load tests passing
- [ ] Security tests passing
- [ ] Manual testing complete

### **Phase 3: Deployment**
- [ ] Programs compiled successfully
- [ ] Programs deployed to target network
- [ ] IDLs uploaded
- [ ] System initialized
- [ ] Authorization configured

### **Phase 4: Validation**
- [ ] Basic functionality tested
- [ ] Monitoring setup
- [ ] Alerting configured
- [ ] Documentation updated
- [ ] Team trained

### **Phase 5: Go-Live**
- [ ] Production deployment complete
- [ ] Monitoring active
- [ ] Support team ready
- [ ] Incident response ready
- [ ] Success metrics defined

---

## 🎉 **CONCLUSION**

This deployment guide provides comprehensive instructions for deploying the Premarket Trading System to Solana. Follow each phase carefully, validate thoroughly, and maintain robust monitoring for a successful production deployment.

**Remember**: Blockchain deployments are irreversible. Always test thoroughly on devnet/testnet before mainnet deployment.

**Good luck with your deployment! 🚀**

---

## 📚 **ADDITIONAL RESOURCES**

### **Documentation**
- [Solana Program Development](https://docs.solana.com/developing/programming-model/overview)
- [Anchor Framework](https://anchor-lang.com/)
- [Cross-Program Invocation](https://docs.solana.com/developing/programming-model/calling-between-programs)

### **Tools**
- [Solana Explorer](https://explorer.solana.com/)
- [Anchor Verified Builds](https://anchor-lang.com/docs/verifiable-builds)
- [Solana Program Library](https://spl.solana.com/)

### **Support**
- **Technical Issues**: Create GitHub issue with detailed logs
- **Security Concerns**: Contact security team immediately
- **General Questions**: Check documentation and community forums 