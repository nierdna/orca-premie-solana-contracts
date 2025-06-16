# ⚡ Match Orders - Core Trading Business Logic

## 📋 Overview

Instruction `match_orders` là **CORE BUSINESS LOGIC** của premarket trading system. Nó match buy/sell orders, create TradeRecord, và lock collateral thông qua CPI calls tới vault program.

## 🔧 Key Features

✅ **Order Signature Verification**: Ed25519 signature validation  
✅ **Relayer Authorization**: Only authorized relayers can match  
✅ **Cross-Program Integration**: CPI calls to vault for collateral  
✅ **TradeRecord Creation**: User-controlled keypair pattern  
✅ **Partial Fill Support**: Flexible fill amounts  
✅ **Comprehensive Validation**: Price, amount, compatibility checks  
✅ **Event Emission**: OrdersMatched cho monitoring  

## 🏗️ Business Flow

```
1. Off-chain: Users create và sign orders (PreOrder)
2. Off-chain: Order book aggregates buy/sell orders  
3. On-chain: Relayer calls match_orders với compatible orders ← THIS
4. On-chain: System validates orders và signatures
5. On-chain: TradeRecord created với locked collateral
6. Later: Settlement or cancellation processes
```

## 📝 Account Structure

### **Core Accounts:**
- **TradeRecord**: User-controlled keypair (trade result)
- **TokenMarket**: Market being traded
- **TradeConfig**: System configuration + relayer validation

### **Vault Program Accounts (CPI):**
- **VaultProgram**: Cross-program reference
- **VaultConfig**: Vault configuration
- **BuyerBalance**: Buyer collateral account
- **SellerBalance**: Seller collateral account  
- **VaultAuthority**: Vault signing authority

### **Token Accounts:**
- **BuyerCollateralATA**: Buyer's collateral token account
- **SellerCollateralATA**: Seller's collateral token account

## 🔒 Security Constraints

```rust
#[derive(Accounts)]
pub struct MatchOrders<'info> {
    /// TradeRecord (User-controlled keypair)
    #[account(
        mut,
        constraint = trade_record.to_account_info().owner == &crate::ID,
    )]
    pub trade_record: Account<'info, TradeRecord>,
    
    /// Relayer authorization
    #[account(
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = config.is_relayer(&relayer.key()) @ TradingError::UnauthorizedRelayer,
        constraint = !config.paused @ TradingError::TradingPaused,
    )]
    pub config: Account<'info, TradeConfig>,
    
    /// Vault program validation
    #[account(
        constraint = vault_program.key() == config.vault_program,
    )]
    pub vault_program: AccountInfo<'info>,
    
    /// Collateral token matching
    #[account(
        constraint = buyer_collateral_ata.mint == seller_collateral_ata.mint,
    )]
    pub buyer_collateral_ata: Account<'info, TokenAccount>,
    pub seller_collateral_ata: Account<'info, TokenAccount>,
}
```

## 🚀 Client Usage (TypeScript)

### **Step 1: Create TradeRecord Account**
```typescript
// Client generates keypair for TradeRecord
const tradeKeypair = Keypair.generate();

// Create account instruction
const createAccountIx = SystemProgram.createAccount({
  fromPubkey: relayer.publicKey,
  newAccountPubkey: tradeKeypair.publicKey,
  lamports: await connection.getMinimumBalanceForRentExemption(TRADE_RECORD_SIZE),
  space: TRADE_RECORD_SIZE,
  programId: program.programId,
});
```

### **Step 2: Prepare Orders & Signatures**
```typescript
// Off-chain signed orders
const buyOrder: PreOrder = {
  trader: buyer.publicKey,
  collateral_token: USDC_MINT,
  token_id: tokenMarketAddress,
  amount: 1000_000000, // 1000 tokens
  price: 5_000000,     // $5.00 per token  
  is_buy: true,
  nonce: Date.now(),
  deadline: Date.now() / 1000 + 3600, // 1 hour
};

const sellOrder: PreOrder = {
  trader: seller.publicKey,
  collateral_token: USDC_MINT,
  token_id: tokenMarketAddress,
  amount: 1000_000000,
  price: 5_000000,
  is_buy: false,
  nonce: Date.now(),
  deadline: Date.now() / 1000 + 3600,
};

// Get signatures (implement signing logic)
const buySignature = await signOrder(buyOrder, buyer);
const sellSignature = await signOrder(sellOrder, seller);
```

### **Step 3: Match Orders**
```typescript
async function matchOrders(
  program: Program,
  relayer: Keypair,
  tradeKeypair: Keypair,
  buyOrder: PreOrder,
  sellOrder: PreOrder,
  buySignature: Uint8Array,
  sellSignature: Uint8Array,
  fillAmount?: number
) {
  // Get required PDAs
  const [configPda] = await PublicKey.findProgramAddress(
    [Buffer.from("trade_config")],
    program.programId
  );
  
  // Get vault program accounts (implement vault PDA derivation)
  const vaultConfig = await getVaultConfigPDA();
  const buyerBalance = await getUserBalancePDA(buyOrder.trader, USDC_MINT);
  const sellerBalance = await getUserBalancePDA(sellOrder.trader, USDC_MINT);
  const vaultAuthority = await getVaultAuthorityPDA(USDC_MINT);
  
  // Get token accounts
  const buyerCollateralATA = await getAssociatedTokenAddress(
    USDC_MINT, 
    buyOrder.trader
  );
  const sellerCollateralATA = await getAssociatedTokenAddress(
    USDC_MINT,
    sellOrder.trader
  );
  
  // Create + match in atomic transaction
  const tx = new Transaction()
    .add(createAccountIx)
    .add(
      await program.methods
        .matchOrders(
          buyOrder,
          sellOrder,
          Array.from(buySignature),
          Array.from(sellSignature),
          fillAmount || null
        )
        .accounts({
          tradeRecord: tradeKeypair.publicKey,
          tokenMarket: buyOrder.token_id,
          config: configPda,
          relayer: relayer.publicKey,
          vaultProgram: VAULT_PROGRAM_ID,
          vaultConfig,
          buyerBalance,
          sellerBalance,
          vaultAuthority,
          buyerCollateralAta: buyerCollateralATA,
          sellerCollateralAta: sellerCollateralATA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );
    
  const signature = await sendAndConfirmTransaction(
    connection,
    tx,
    [relayer, tradeKeypair]
  );
  
  return {
    tradeId: tradeKeypair.publicKey, // EVM compatible trade ID
    signature,
  };
}
```

## 📊 Event Structure

```rust
#[event]
pub struct OrdersMatched {
    pub trade_id: Pubkey,           // Account address as trade ID
    pub buyer: Pubkey,              // Buyer wallet
    pub seller: Pubkey,             // Seller wallet  
    pub token_id: Pubkey,           // TokenMarket address as token ID
    pub filled_amount: u64,         // Amount filled
    pub price: u64,                 // Price per token (6 decimals)
    pub buyer_collateral: u64,      // Buyer collateral locked
    pub seller_collateral: u64,     // Seller collateral locked
    pub match_time: i64,            // When trade was matched
}
```

## ✅ State Changes

### **TradeRecord Created:**
```rust
TradeRecord {
    trade_id: tradeKeypair.publicKey,       // Account address as ID
    buyer: buyOrder.trader,
    seller: sellOrder.trader,
    token_id: tokenMarket.key(),
    collateral_mint: USDC_MINT,
    filled_amount: 1000_000000,             // 1000 tokens
    price: 5_000000,                        // $5.00 per token
    buyer_collateral: 5000_000000,          // $5000 collateral (100%)
    seller_collateral: 5000_000000,         // $5000 collateral (100%)
    match_time: 1700000000,
    settled: false,                         // ← Settlement pending
    target_mint: None,                      // ← Real mint TBD
}
```

### **Vault Balances (via CPI):**
```rust
// Buyer vault balance: 10000 USDC → 5000 USDC (5000 locked)
// Seller vault balance: 10000 USDC → 5000 USDC (5000 locked)
```

## 🎯 Validation Logic

### **Order Compatibility:**
```rust
// Same token market
require!(buy_order.token_id == sell_order.token_id);

// Same collateral token  
require!(buy_order.collateral_token == sell_order.collateral_token);

// Price compatibility (buy >= sell)
require!(buy_order.price >= sell_order.price);

// Order types correct
require!(buy_order.is_buy && !sell_order.is_buy);

// Different traders
require!(buy_order.trader != sell_order.trader);
```

### **Signature Verification:**
```rust
// Both orders must have valid signatures
verify_order_signature(&buy_order, &buy_signature, &buy_order.trader)?;
verify_order_signature(&sell_order, &sell_signature, &sell_order.trader)?;
```

### **Fill Amount Validation:**
```rust
// Must be positive
require!(actual_fill_amount > 0);

// Above minimum fill  
require!(actual_fill_amount >= config.minimum_fill_amount);

// Within order limits
require!(actual_fill_amount <= buy_order.amount.min(sell_order.amount));
```

### **Collateral Calculation:**
```rust
let trade_value = amount * price / PRICE_SCALE;
let buyer_collateral = trade_value * buyer_collateral_ratio / 10000;
let seller_collateral = trade_value * seller_collateral_ratio / 10000;
```

## 🔗 Cross-Program Integration

### **CPI Call Structure:**
```rust
// Lock buyer collateral
let cpi_accounts = vault_program::cpi::accounts::SlashBalance {
    config: vault_config,
    user_balance: buyer_balance,
    authority: vault_authority,
};
let cpi_ctx = CpiContext::new(vault_program, cpi_accounts);
vault_program::cpi::slash_balance(cpi_ctx, buyer_collateral)?;
```

### **Vault Program Interaction:**
- **SlashBalance**: Subtract balance (lock collateral)
- **Exact EVM Logic**: `balances[user][token] -= amount`
- **Security**: Validate vault program ID match

## 🚨 Important Considerations

### **Order Management:**
- **Signatures are single-use** - prevent replay attacks
- **Deadlines must be reasonable** - avoid expired orders
- **Nonces should be unique** - prevent order reuse

### **Collateral Management:**
- **Sufficient vault balances** required before matching
- **Collateral immediately locked** - cannot be withdrawn
- **Economic parameters** configurable via admin

### **Relayer Responsibility:**
- **Validate orders off-chain** before matching
- **Ensure order compatibility** and user intent
- **Handle partial fills** and order book updates

### **Error Handling:**
- **Invalid signatures** → reject orders
- **Insufficient collateral** → fail transaction  
- **Mismatched tokens** → incompatible orders
- **Expired deadlines** → order no longer valid

## 📚 Related Documentation

- [Settlement Flow](./README_settle_trade.md)
- [Trade Cancellation](./README_cancel_trade.md)
- [Vault Integration](../vault-program/README.md)
- [Business Requirements](../SOLANA_BUSINESS_LOGIC_REQUIREMENTS.md)

## ✅ Business Requirements Compliance

✅ **Order signature verification** với ed25519  
✅ **Relayer authorization** validation  
✅ **TradeRecord creation** user-controlled keypair pattern  
✅ **CPI calls to vault** cho collateral management  
✅ **Partial fill support** với flexible amounts  
✅ **Comprehensive validation** cho order compatibility  
✅ **Event emission** với EVM-compatible naming  
✅ **Cross-program security** với proper constraints  

Match orders functionality implements the **CORE TRADING LOGIC** và hoàn toàn tuân thủ business requirements! 🎉

**Next**: `settle_trade.rs` và `cancel_trade.rs` để complete trading lifecycle. 