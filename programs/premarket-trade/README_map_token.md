# 🔗 Map Token - Real Token Mapping to Market

## 📋 Overview

Instruction `map_token` cho phép admin map **real token mint** vào **existing TokenMarket**. Đây là bước quan trọng sau khi token được launch để enable settlement functionality.

## 🔧 Key Features

✅ **Admin-Only Operation**: Chỉ admin có thể map tokens  
✅ **Validation Checks**: Comprehensive validation cho token market và mint  
✅ **One-Time Mapping**: Prevent duplicate mapping  
✅ **Event Emission**: Emit TokenMapped cho monitoring  
✅ **Settlement Enablement**: Enable real token transfers  

## 🏗️ Business Logic Flow

```
1. Admin creates TokenMarket (pre-launch) ✅
2. Token development & testing
3. Token launches on mainnet with real mint
4. Admin maps real mint to TokenMarket ← THIS INSTRUCTION
5. Settlement becomes available for trades
```

## 📝 Account Structure

### **Input Requirements:**
- **TokenMarket**: Must exist và chưa được mapped
- **Real Mint**: Valid SPL token mint
- **Admin**: Must match TradeConfig.admin

### **Validation Rules:**
```rust
// TokenMarket validations
constraint = token_market.real_mint.is_none()          // Not already mapped
constraint = token_market.token_id == account.key()    // Valid market

// Real mint validations  
constraint = real_mint.owner == &anchor_spl::token::ID // Valid SPL token

// Admin validations
constraint = config.admin == admin.key()               // Valid admin
constraint = !config.paused                           // System not paused
```

## 🔒 Security Constraints

```rust
#[derive(Accounts)]
pub struct MapToken<'info> {
    /// TokenMarket must exist and be unmapped
    #[account(
        mut,
        constraint = token_market.to_account_info().owner == &crate::ID,
        constraint = token_market.real_mint.is_none() @ TradingError::TokenAlreadyMapped,
    )]
    pub token_market: Account<'info, TokenMarket>,
    
    /// Real token mint must be valid SPL token
    #[account(
        constraint = real_mint.to_account_info().owner == &anchor_spl::token::ID,
    )]
    pub real_mint: Account<'info, Mint>,
    
    /// Admin authorization via TradeConfig
    #[account(
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key(),
        constraint = !config.paused,
    )]
    pub config: Account<'info, TradeConfig>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
}
```

## 🚀 Client Usage (TypeScript)

```typescript
import { PublicKey } from "@solana/web3.js";

async function mapToken(
  program: Program,
  admin: Keypair,
  tokenMarketAddress: PublicKey,
  realMintAddress: PublicKey
) {
  // Get TradeConfig PDA
  const [configPda] = await PublicKey.findProgramAddress(
    [Buffer.from("trade_config")],
    program.programId
  );
  
  // Map token instruction
  const tx = await program.methods
    .mapToken(realMintAddress)
    .accounts({
      tokenMarket: tokenMarketAddress,
      realMint: realMintAddress,
      config: configPda,
      admin: admin.publicKey,
    })
    .signers([admin])
    .rpc();
    
  console.log("✅ Token mapped successfully:", tx);
  
  return tx;
}

// Usage example
const tokenMarketKey = new PublicKey("TokenMarketAddress...");
const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

await mapToken(program, admin, tokenMarketKey, usdcMint);
```

## 📊 Event Structure

```rust
#[event]
pub struct TokenMapped {
    pub token_id: Pubkey,           // TokenMarket account address
    pub real_mint: Pubkey,          // Real token mint address
    pub mapping_time: i64,          // When mapping occurred
}
```

## ✅ State Changes

### **Before Mapping:**
```rust
TokenMarket {
    token_id: "TokenMarketAddress...",
    symbol: "ORCA",
    name: "Orca Token",
    real_mint: None,                    // ← Not mapped yet
    mapping_time: None,                 // ← Not mapped yet
    settle_time_limit: 259200,
    created_at: 1700000000,
}
```

### **After Mapping:**
```rust
TokenMarket {
    token_id: "TokenMarketAddress...",
    symbol: "ORCA", 
    name: "Orca Token",
    real_mint: Some("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // ← Mapped!
    mapping_time: Some(1700001000),                                      // ← Timestamp!
    settle_time_limit: 259200,
    created_at: 1700000000,
}
```

## 🎯 Business Impact

### **Enables Settlement:**
- Trades có thể được settled với real tokens
- Sellers có thể deliver actual tokens to buyers
- Pre-market commitments become binding

### **Risk Management:**
- One-time operation (cannot remap)
- Admin-only control
- Comprehensive validation checks

## 🚨 Important Considerations

### **Timing:**
- Chỉ map sau khi token đã launch successfully
- Đảm bảo real mint đã stable và liquid
- Consider market conditions trước khi map

### **Validation:**
- **Real mint phải là valid SPL token**
- **TokenMarket phải chưa được mapped**  
- **Admin phải có proper authorization**
- **System phải không bị paused**

### **Irreversibility:**
- **Mapping không thể undo**
- **Choose correct mint carefully**
- **Test trên devnet trước**

## 📚 Related Documentation

- [TokenMarket Creation](./README_create_token_market.md)
- [Settlement Flow](./README_settle_trade.md)
- [Business Requirements](../SOLANA_BUSINESS_LOGIC_REQUIREMENTS.md)

## ✅ Business Requirements Compliance

✅ **Admin-only mapping operation**  
✅ **Validation cho existing TokenMarket**  
✅ **Prevention of duplicate mapping**  
✅ **Real mint validation as SPL token**  
✅ **Proper event emission cho monitoring**  
✅ **EVM compatible naming (token_id)**  
✅ **Security constraints comprehensive**  

Map token functionality hoàn toàn tuân thủ business requirements và sẵn sàng cho production! 🎉 