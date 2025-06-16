# 🔗 Manage Relayers - Authorized Order Matcher Management

## 📋 Overview

Instruction `manage_relayers` cho phép admin **add/remove authorized relayers** vào trading system. Relayers là các entities có quyền match orders và facilitate trading operations.

## 🔧 Key Features

✅ **Admin-Only Operation**: Chỉ admin có thể manage relayers  
✅ **Add/Remove Functionality**: Single instruction cho cả add và remove  
✅ **Limit Enforcement**: Maximum 10 relayers (theo business requirements)  
✅ **Duplicate Prevention**: Không thể add existing relayer  
✅ **Event Emission**: Track relayer changes cho monitoring  

## 🏗️ Business Logic

### **Relayers trong Premarket Trading:**
- **Order Matching**: Execute `match_orders` instruction
- **Off-chain Coordination**: Facilitate order book operations
- **Settlement Coordination**: Help coordinate trade settlements
- **Fee Collection**: Potential fee collection role

### **Authorization Flow:**
```
1. Admin adds relayer addresses ← THIS INSTRUCTION
2. Relayers can call match_orders instruction
3. Off-chain systems validate relayer signatures
4. Relayers facilitate order matching process
```

## 📝 Account Structure

### **Input Requirements:**
- **Admin**: Must match TradeConfig.admin
- **Relayer**: Valid Pubkey address to add/remove
- **Add**: Boolean flag (true = add, false = remove)

### **Validation Rules:**
```rust
// Admin validations
constraint = config.admin == admin.key()               // Valid admin
constraint = !config.paused                           // System not paused

// Relayer validations
require!(relayer != Pubkey::default())                // Valid address
require!(config.relayers.len() < 10)                  // Max 10 relayers
require!(!config.is_relayer(&relayer))                // Not duplicate (add)
require!(config.is_relayer(&relayer))                 // Must exist (remove)
```

## 🔒 Security Constraints

```rust
#[derive(Accounts)]
pub struct ManageRelayers<'info> {
    /// TradeConfig PDA with relayer management
    #[account(
        mut,
        seeds = [TradeConfig::TRADE_CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ TradingError::InvalidAdmin,
        constraint = !config.paused @ TradingError::TradingPaused,
    )]
    pub config: Account<'info, TradeConfig>,
    
    /// Admin signer (must match config.admin)
    #[account(mut)]
    pub admin: Signer<'info>,
}
```

## 🚀 Client Usage (TypeScript)

```typescript
import { PublicKey } from "@solana/web3.js";

async function addRelayer(
  program: Program,
  admin: Keypair,
  relayerAddress: PublicKey
) {
  // Get TradeConfig PDA
  const [configPda] = await PublicKey.findProgramAddress(
    [Buffer.from("trade_config")],
    program.programId
  );
  
  // Add relayer instruction
  const tx = await program.methods
    .manageRelayers(relayerAddress, true)  // true = add
    .accounts({
      config: configPda,
      admin: admin.publicKey,
    })
    .signers([admin])
    .rpc();
    
  console.log("✅ Relayer added:", tx);
  return tx;
}

async function removeRelayer(
  program: Program,
  admin: Keypair,
  relayerAddress: PublicKey
) {
  // Get TradeConfig PDA
  const [configPda] = await PublicKey.findProgramAddress(
    [Buffer.from("trade_config")],
    program.programId
  );
  
  // Remove relayer instruction
  const tx = await program.methods
    .manageRelayers(relayerAddress, false)  // false = remove
    .accounts({
      config: configPda,
      admin: admin.publicKey,
    })
    .signers([admin])
    .rpc();
    
  console.log("✅ Relayer removed:", tx);
  return tx;
}

// Usage examples
const relayerPubkey = new PublicKey("RelayerAddress...");

// Add relayer
await addRelayer(program, admin, relayerPubkey);

// Remove relayer
await removeRelayer(program, admin, relayerPubkey);
```

## 📊 Event Structures

### **RelayerAdded Event:**
```rust
#[event]
pub struct RelayerAdded {
    pub admin: Pubkey,              // Admin who added relayer
    pub relayer: Pubkey,            // Relayer address added
    pub total_relayers: u8,         // Total relayers after addition
    pub timestamp: i64,             // When relayer was added
}
```

### **RelayerRemoved Event:**
```rust
#[event]
pub struct RelayerRemoved {
    pub admin: Pubkey,              // Admin who removed relayer
    pub relayer: Pubkey,            // Relayer address removed
    pub total_relayers: u8,         // Total relayers after removal
    pub timestamp: i64,             // When relayer was removed
}
```

## ✅ State Changes

### **TradeConfig Before (0 relayers):**
```rust
TradeConfig {
    admin: "AdminAddress...",
    vault_program: "VaultProgramId...",
    relayers: [],                           // ← Empty list
    economic_config: { ... },
    technical_config: { ... },
    paused: false,
    bump: 254,
}
```

### **After Adding Relayer:**
```rust
TradeConfig {
    admin: "AdminAddress...",
    vault_program: "VaultProgramId...",
    relayers: ["RelayerAddress1..."],       // ← Added relayer
    economic_config: { ... },
    technical_config: { ... },
    paused: false,
    bump: 254,
}
```

### **After Adding Multiple Relayers:**
```rust
TradeConfig {
    admin: "AdminAddress...",
    vault_program: "VaultProgramId...",
    relayers: [                             // ← Multiple relayers
        "RelayerAddress1...",
        "RelayerAddress2...",
        "RelayerAddress3...",
    ],
    economic_config: { ... },
    technical_config: { ... },
    paused: false,
    bump: 254,
}
```

## 🎯 Business Impact

### **Enables Order Matching:**
- Relayers có thể call `match_orders` instruction
- Facilitate off-chain order book operations
- Enable automated trading functionality

### **Access Control:**
- Admin control over who can match orders
- Prevent unauthorized order matching
- Enable/disable specific relayers as needed

### **Operational Flexibility:**
- Add new relayers for scaling
- Remove compromised/inactive relayers
- Dynamic relayer management

## 🚨 Important Considerations

### **Relayer Selection:**
- **Choose trusted entities** cho relayer role
- **Verify technical capabilities** trước khi add
- **Monitor relayer performance** sau khi add

### **Security:**
- **Relayers có significant power** trong system
- **Admin responsibility** cho relayer authorization
- **Regular audit** of active relayers

### **Limits:**
- **Maximum 10 relayers** per business requirements
- **Unique addresses only** - no duplicates
- **Valid Pubkey addresses** required

### **Operational:**
- **Test on devnet** trước khi add production relayers
- **Have backup relayers** cho redundancy
- **Document relayer responsibilities** clearly

## 📚 Related Documentation

- [Order Matching](./README_match_orders.md)
- [Trading Configuration](./README_initialize.md)
- [Business Requirements](../SOLANA_BUSINESS_LOGIC_REQUIREMENTS.md)

## ✅ Business Requirements Compliance

✅ **Admin-only relayer management**  
✅ **Maximum 10 relayers constraint**  
✅ **Add/remove functionality trong single instruction**  
✅ **Duplicate prevention validation**  
✅ **Proper event emission cho monitoring**  
✅ **Integration với TradeConfig state**  
✅ **Security constraints comprehensive**  

Manage relayers functionality hoàn toàn tuân thủ business requirements và ready cho order matching operations! 🎉 