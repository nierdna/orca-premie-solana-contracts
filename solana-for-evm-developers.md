# 🚀 Solana Programs cho EVM Developers

> Hướng dẫn chi tiết để hiểu Solana/Anchor programs từ góc nhìn EVM smart contracts

---

## 🔄 **1. So sánh cốt lõi: EVM vs Solana**

### **Kiến trúc cơ bản**

| Aspect | EVM (Ethereum) | Solana |
|--------|----------------|---------|
| **Storage** | State trong contract | State trong Account riêng biệt |
| **Execution** | `contract.method()` | `program.instruction(accounts)` |
| **Address** | Contract có địa chỉ cố định | Program stateless, data ở Account |
| **State** | Storage slots trong contract | Serialized data trong Account |
| **Rent** | Không có | Phải trả rent để lưu trữ data |

### **Workflow so sánh**

**EVM:**
```solidity
contract UserProfile {
    mapping(address => User) users;  // State ở đây
    
    function createProfile(string name) {
        users[msg.sender] = User(name);  // Lưu vào contract
    }
}
```

**Solana:**
```rust
#[program] 
pub mod user_profile {
    // Chỉ có logic, không có state
    pub fn initialize_profile(ctx: Context<InitializeProfile>, name: String) {
        // State lưu ở Account được pass vào
        ctx.accounts.profile.name = name;
    }
}
```

---

## 📖 **2. Giải thích từng thành phần**

### **A. Program Declaration**
```rust
#[program]
pub mod user_profile {
    use super::*;
    // Các instruction functions ở đây
}
```
- **EVM equivalent**: `contract UserProfile { ... }`
- **Khác biệt**: Program chỉ chứa logic, không có state variables

### **B. Instructions (≈ Public Functions)**
```rust
pub fn initialize_profile(
    ctx: Context<InitializeProfile>,  // ← Accounts cần thiết
    name: String,                     // ← Parameters
) -> Result<()> {                     // ← Always return Result
    // Logic xử lý
    Ok(())
}
```

**So với EVM:**
- EVM: `function createProfile(string memory name) public`
- Solana: Phải khai báo `Context` với tất cả accounts

### **C. Account Validation Structs**
```rust
#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init,                                    // Tạo mới account
        payer = user,                           // Ai trả phí tạo
        space = 8 + UserProfile::INIT_SPACE,    // Size của account
        seeds = [b"profile", user.key().as_ref()], // PDA seeds
        bump                                    // Tự động tìm bump
    )]
    pub profile: Account<'info, UserProfile>,
    
    #[account(mut)]                            // Cần modify (trả phí)
    pub user: Signer<'info>,                   // Phải sign transaction
    
    pub system_program: Program<'info, System>, // Để tạo account
}
```

**Giải thích từng constraint:**
- `init`: Tạo account mới (≈ deploy new contract instance)
- `payer = user`: User trả rent (≈ msg.sender pays gas)
- `space`: Kích thước account (EVM auto-manage)
- `seeds + bump`: Tạo PDA (deterministic address)
- `mut`: Account có thể thay đổi
- `Signer`: Phải có signature (≈ msg.sender)

### **D. State Account (≈ Contract Storage)**
```rust
#[account]
pub struct UserProfile {
    pub authority: Pubkey,      // 32 bytes - owner
    pub name: String,           // 4 + 32 bytes - dynamic string
    pub created_at: i64,        // 8 bytes - timestamp
    pub updated_at: Option<i64>, // 1 + 8 bytes - optional timestamp
    pub version: u8,            // 1 byte - version control
    pub bump: u8,               // 1 byte - PDA bump
}

impl UserProfile {
    // Tính chính xác space cần thiết
    const INIT_SPACE: usize = 8 + 32 + 4 + 32 + 8 + 1 + 8 + 1 + 1; // = 95 bytes
}
```

**Space calculation:**
- `8`: Discriminator (Anchor tự động thêm)
- `32`: Pubkey = 32 bytes
- `4 + 32`: String = length (4) + max chars (32)
- `8`: i64 = 8 bytes
- `1 + 8`: Option<i64> = discriminant (1) + value (8)
- `1`: u8 = 1 byte

---

## 🔑 **3. Concepts quan trọng**

### **A. PDA (Program Derived Address)**
```rust
seeds = [b"profile", user.key().as_ref()]
```

**Tương đương EVM:**
```solidity
mapping(address => UserProfile) profiles;
// profiles[msg.sender] = profile
```

**Ưu điểm PDA:**
- Deterministic: Cùng seeds → cùng address
- No private key: Program tự động control
- Unique per user: Mỗi user có 1 profile

### **B. Rent System**
```rust
#[account(mut, close = user)]  // Trả rent về cho user
pub profile: Account<'info, UserProfile>,
```

**Khác với EVM:**
- EVM: Gas fee một lần
- Solana: Rent liên tục HOẶC deposit một lần (rent-exempt)

### **C. Authority Pattern**
```rust
#[account(
    mut,
    constraint = profile.authority == user.key() @ UserProfileError::Unauthorized
)]
pub profile: Account<'info, UserProfile>,
```

**So với EVM:**
```solidity
modifier onlyOwner() {
    require(msg.sender == owner);
    _;
}
```

---

## 🛠 **4. Patterns thường dùng**

### **A. CRUD Operations**

#### **Create (Initialize)**
```rust
#[account(init, payer = user, space = SPACE, seeds = SEEDS, bump)]
```

#### **Read (View)**
```rust
#[account(seeds = SEEDS, bump = account.bump)]
```

#### **Update**
```rust
#[account(mut, seeds = SEEDS, bump = account.bump, has_one = authority)]
```

#### **Delete (Close)**
```rust
#[account(mut, close = authority, seeds = SEEDS, bump = account.bump)]
```

### **B. Validation Patterns**
```rust
// Authority check
constraint = account.authority == user.key() @ ErrorCode::Unauthorized

// Value validation
require!(name.len() <= 32, ErrorCode::NameTooLong);

// Account relationship
has_one = authority @ ErrorCode::Unauthorized
```

---

## 🔒 **5. Security Best Practices**

### **A. Authority Validation**
```rust
// ❌ Sai - không check authority
#[account(mut)]
pub profile: Account<'info, UserProfile>,

// ✅ Đúng - check authority
#[account(
    mut, 
    constraint = profile.authority == user.key() @ ErrorCode::Unauthorized
)]
pub profile: Account<'info, UserProfile>,
```

### **B. Input Validation**
```rust
pub fn update_profile(ctx: Context<UpdateProfile>, new_name: String) -> Result<()> {
    // ✅ Validate input
    require!(new_name.len() <= 32, UserProfileError::NameTooLong);
    require!(!new_name.is_empty(), UserProfileError::NameEmpty);
    
    // Logic tiếp theo...
    Ok(())
}
```

### **C. Account Constraints**
```rust
#[account(
    init,
    payer = user,                              // ✅ Ai trả phí
    space = 8 + UserProfile::INIT_SPACE,       // ✅ Space chính xác
    seeds = [b"profile", user.key().as_ref()], // ✅ Unique seeds
    bump                                       // ✅ Canonical bump
)]
```

---

## 🧪 **6. Testing & Debugging**

### **A. Logging**
```rust
pub fn initialize_profile(ctx: Context<InitializeProfile>, name: String) -> Result<()> {
    // ✅ Log để debug
    msg!("Initializing profile for user: {}", ctx.accounts.user.key());
    msg!("Profile PDA: {}", ctx.accounts.profile.key());
    
    // Logic...
    msg!("Profile initialized successfully");
    Ok(())
}
```

### **B. Test Commands**
```bash
# Build và test
anchor build
anchor test

# Test với logs
anchor test --skip-build -- --nocapture

# View logs on-chain
solana logs
```

### **C. PDA Calculation**
```typescript
// TypeScript - tính PDA offline
const [profilePDA, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("profile"), user.publicKey.toBuffer()],
    program.programId
);
```

---

## 📚 **7. Error Handling**

### **A. Custom Errors**
```rust
#[error_code]
pub enum UserProfileError {
    #[msg("Name is too long. Maximum 32 characters allowed.")]
    NameTooLong,
    
    #[msg("Name cannot be empty.")]
    NameEmpty,
    
    #[msg("Unauthorized: You are not the authority of this profile.")]
    Unauthorized,
}
```

### **B. Usage trong Constraints**
```rust
#[account(
    constraint = profile.authority == user.key() @ UserProfileError::Unauthorized
)]
```

### **C. Usage trong Logic**
```rust
require!(name.len() <= 32, UserProfileError::NameTooLong);
```

---

## 🎯 **8. Migration từ EVM mindset**

### **Từ EVM thinking:**
1. "Contract lưu state" → "Account lưu state, Program chỉ có logic"
2. "msg.sender automatic" → "Explicit account validation"
3. "Gas fee một lần" → "Rent system"
4. "Contract address fixed" → "PDA derived from seeds"
5. "State slots" → "Serialized structs"

### **Workflow mới:**
1. **Design accounts**: State nào cần lưu?
2. **Define instructions**: Thao tác nào với accounts?
3. **Set constraints**: Validation gì cho mỗi account?
4. **Handle errors**: Error cases nào có thể xảy ra?
5. **Test thoroughly**: Test với nhiều scenarios

---

## 💡 **9. Tips thực tế**

### **A. Development**
- Luôn dùng `msg!()` để debug
- Tính space chính xác để tiết kiệm SOL
- Test với nhiều users khác nhau
- Viết comments rõ ràng cho instructions

### **B. Security**
- Không bao giờ skip authority check
- Validate tất cả inputs
- Dùng `Result<()>` thay vì panic
- Test edge cases

### **C. Performance**
- Minimize account size
- Avoid complex computations
- Use appropriate constraints
- Plan for upgrades với version field

---

## 🚀 **10. Next Steps**

Sau khi hiểu cơ bản:
1. **Practice**: Tạo thêm instructions (delete, list, etc.)
2. **CPI**: Learn Cross-Program Invocation
3. **Token integration**: Work với SPL tokens  
4. **Advanced patterns**: PDAs with multiple seeds
5. **Testing**: Comprehensive test suites

---

> 💡 **Remember**: Solana = "Database with stored procedures", không phải "Object-oriented contracts" như EVM! 