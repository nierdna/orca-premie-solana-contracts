# 🏪 Create Token Market - User-Controlled Keypair Pattern

## 📋 Overview

Instruction `create_token_market` được triển khai theo **User-Controlled Keypair Pattern** như yêu cầu trong business requirements, thay vì PDA pattern.

## 🔧 Key Features

✅ **EVM Compatible**: `token_id` field chứa account address  
✅ **Security Validations**: Full constraint validation theo spec  
✅ **Admin Authorization**: Validate qua TradeConfig PDA  
✅ **Event Emission**: Emit proper events cho monitoring  
✅ **User-Controlled**: Client tạo keypair, không phải PDA  

## 🏗️ Architecture Pattern

```
Client Side:
1. Generate TokenMarket keypair
2. Create account với SystemProgram
3. Initialize data với program instruction

Program Side:
1. Validate account ownership & constraints
2. Validate admin authorization
3. Initialize TokenMarket struct
4. Set token_id = account address
5. Emit TokenMarketCreated event
```

## 📝 Account Structure

```rust
#[account]
pub struct TokenMarket {
    pub token_id: Pubkey,           // Account address as unique token ID
    pub symbol: String,             // Token symbol (max 10 chars)
    pub name: String,               // Token name (max 50 chars)
    pub real_mint: Option<Pubkey>,  // Real token mint (after mapping)
    pub mapping_time: Option<i64>,  // When token was mapped
    pub settle_time_limit: u32,     // Grace period in seconds
    pub created_at: i64,            // Creation timestamp
}
```

## 🔒 Security Constraints

```rust
#[account(
    mut,
    constraint = token_market.owner == &crate::ID,                          // Program ownership
    constraint = token_market.data_len() == shared::TOKEN_MARKET_SIZE,      // Correct size
    constraint = symbol.len() <= shared::MAX_SYMBOL_LENGTH,                 // Symbol length
    constraint = name.len() <= shared::MAX_NAME_LENGTH,                     // Name length
    constraint = settle_time_limit >= 3600,                                 // Min 1 hour
    constraint = settle_time_limit <= 2592000,                             // Max 30 days
)]
pub token_market: Account<'info, TokenMarket>,

#[account(
    seeds = [TradeConfig::TRADE_CONFIG_SEED],
    bump = config.bump,
    constraint = config.admin == admin.key(),                               // Admin validation
    constraint = !config.paused,                                           // Not paused
)]
pub config: Account<'info, TradeConfig>,
```

## 🚀 Client Usage (TypeScript)

```typescript
import { Keypair, SystemProgram, Transaction, PublicKey } from "@solana/web3.js";

// Constants
const TOKEN_MARKET_SIZE = 163; // bytes

async function createTokenMarket(
  program: Program,
  admin: Keypair,
  symbol: string,
  name: string,
  settleTimeLimit: number
) {
  // Step 1: Generate keypair for TokenMarket
  const tokenKeypair = Keypair.generate();
  
  // Step 2: Get TradeConfig PDA
  const [configPda] = await PublicKey.findProgramAddress(
    [Buffer.from("trade_config")],
    program.programId
  );
  
  // Step 3: Create account instruction
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: admin.publicKey,
    newAccountPubkey: tokenKeypair.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(TOKEN_MARKET_SIZE),
    space: TOKEN_MARKET_SIZE,
    programId: program.programId,
  });
  
  // Step 4: Initialize instruction
  const initializeIx = await program.methods
    .createTokenMarket(symbol, name, settleTimeLimit)
    .accounts({
      tokenMarket: tokenKeypair.publicKey,
      config: configPda,
      admin: admin.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  
  // Step 5: Send atomic transaction
  const transaction = new Transaction()
    .add(createAccountIx)
    .add(initializeIx);
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [admin, tokenKeypair] // Both must sign!
  );
  
  return {
    tokenId: tokenKeypair.publicKey, // This is the token_id!
    signature
  };
}
```

## 📊 Event Structure

```rust
#[event]
pub struct TokenMarketCreated {
    pub token_id: Pubkey,           // Account address as token ID
    pub symbol: String,             // Token symbol
    pub name: String,               // Token name
    pub settle_time_limit: u32,     // Grace period in seconds
    pub created_at: i64,            // Creation timestamp
}
```

## ✅ Validation Rules

### **Input Validation:**
- Symbol: 1-10 characters, không empty
- Name: 1-50 characters, không empty  
- Settle Time: 3600-2592000 seconds (1 hour - 30 days)

### **Account Validation:**
- TokenMarket account owned by program
- Correct account size (163 bytes)
- TradeConfig exists và admin valid
- System không bị pause

### **Authorization:**
- Chỉ admin (theo TradeConfig) mới có thể tạo token market
- Admin phải sign transaction

## 🔍 Key Differences vs PDA Pattern

| Aspect | PDA Pattern | User-Controlled Pattern |
|--------|-------------|------------------------|
| **Account Creation** | Program tạo với `init` | Client tạo với `SystemProgram` |
| **Keypair Control** | Program derive | Client generate |
| **Signing** | Chỉ admin | Admin + TokenKeypair |
| **Address Prediction** | Deterministic | Random |
| **EVM Compatibility** | Khó | Dễ (address = ID) |
| **Flexibility** | Hạn chế | Cao |

## 💡 Benefits of User-Controlled Pattern

1. **EVM Compatibility**: Account address = token_id trực tiếp
2. **Production Proven**: Được dùng bởi Jupiter, Raydium, Serum
3. **Maximum Flexibility**: Client control hoàn toàn keypair
4. **Atomic Operations**: Create + Initialize trong 1 transaction
5. **No Race Conditions**: Không có sequential counter issues
6. **Direct References**: Dùng account address trực tiếp làm ID

## 🎯 Business Requirements Compliance

✅ **TokenMarket = User-controlled keypair, not PDA**  
✅ **token_id field = account address (EVM compatible naming)**  
✅ **Admin-only creation với authorization validation**  
✅ **All constraint validations theo specification**  
✅ **Proper event emission với correct structure**  
✅ **Safe math và error handling**  
✅ **Security-first approach với comprehensive validation**

## 🚨 Important Notes

1. **Client phải save tokenKeypair** để sử dụng sau này
2. **Both admin và tokenKeypair phải sign** transaction  
3. **Account size phải chính xác** (163 bytes) cho rent exemption
4. **TradeConfig phải được initialize trước** 
5. **Admin privileges được validate** qua TradeConfig PDA

## 📚 Related Documentation

- [Business Requirements](../SOLANA_BUSINESS_LOGIC_REQUIREMENTS.md)
- [TokenMarket State](../src/state/token_market.rs)
- [TradeConfig State](../src/state/trade_config.rs)
- [Trading Events](../src/events.rs) 