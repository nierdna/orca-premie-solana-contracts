# 🧠 Solana Program Development Guide with Expert Notes

> Tài liệu tổng hợp kiến thức & kinh nghiệm thực chiến khi phát triển smart contract Solana với Anchor.

---

## 🧱 1. Cấu trúc cơ bản của Anchor Program

```rust
use anchor_lang::prelude::*;

#[program]
pub mod my_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // ✅ TIP: Luôn dùng Result thay vì Option hoặc panic
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 32)]
    pub data: Account<'info, MyAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct MyAccount {
    pub authority: Pubkey,
}
````

---

## 📌 2. PDA (Program Derived Address) – Kinh nghiệm và Lỗi phổ biến

```rust
#[account(
    seeds = [b"seed", user.key().as_ref()],
    bump
)]
pub pda_account: Account<'info, MyData>;
```

* ✅ Luôn log PDA bằng `msg!()` khi test local
* ✅ Dùng `#[account(..., bump)]` – tránh hardcode
* ⚠️ Không dùng seed dài > 32 bytes
* ⚠️ Không dùng seed động (ex: Vec<u8>)

---

## 🚀 3. Tối ưu hóa hiệu suất

* ✅ Mỗi instruction nên thực hiện một tác vụ
* ✅ Tránh `.clone()` hoặc `.to_account_info()` quá nhiều
* ✅ Dùng `#[account(mut)]` chính xác

### Compute Units:

* Dùng `checked_add`, `checked_sub`
* Không panic
* Tránh dùng `Vec`, `HashMap` trong state

---

## 🔒 4. Bảo mật (Security)

| Lỗi                      | Nguy cơ             | Giải pháp                                 |
| ------------------------ | ------------------- | ----------------------------------------- |
| Không kiểm tra authority | Ai cũng có thể gọi  | `require!(user.key() == state.authority)` |
| Ghi đè state             | Dùng sai constraint | Luôn rõ ràng `init`, `mut`, `seeds`       |
| CPI giả mạo              | Gọi sai signer      | Dùng `has_one`, kiểm tra signer           |

---

## 🧪 5. Testing và Debug

```rust
msg!("Init with user: {}", ctx.accounts.user.key());
```

* `anchor test --skip-build -- --nocapture`
* `solana logs` để xem log on-chain
* `anchor test-validator` để test local

---

## ⚙️ 6. Kiến trúc chương trình

```txt
src/
├── lib.rs
├── instructions/
│   ├── initialize.rs
│   └── stake.rs
├── state/
│   └── user_account.rs
├── errors.rs
└── constants.rs
```

* ✅ Mỗi file 1 instruction
* ✅ `mod.rs` để re-export
* ✅ `#[account]` cho mỗi loại state riêng biệt

---

## 🔄 7. Migration & Versioning

* Thêm `version: u8` vào state
* Tạo instruction `migrate_v1_to_v2`
* Dùng Anchor `upgradeable` loader
* ⚠️ Không có “auto migration” – bạn phải làm thủ công

---

## 📖 8. Dev Documentation nội bộ

```rust
/// # Instruction: initialize
/// Initializes the program state for user
/// Accounts:
/// - [signer] user
/// - [writable] state
```

* ✅ Viết README.md mô tả từng instruction
* ✅ Ghi chú rõ: input, output, logic

---

## 🔁 9. CPI nâng cao

```rust
let cpi_ctx = CpiContext::new(
    target_program.to_account_info(),
    ExternalInstruction {
        target_account: data.to_account_info(),
    }
);
external_program::cpi::execute(cpi_ctx)?;
```

* ✅ Chuẩn bị đầy đủ account
* ✅ Truyền signer nếu cần
* ⚠️ CPI tốn nhiều compute units → tránh lồng nhiều tầng

---

## 🔎 10. Anchor Constraints nâng cao

```rust
#[account(
    seeds = [b"data", user.key().as_ref()],
    bump,
    has_one = authority @ ErrorCode::Unauthorized
)]
pub data: Account<'info, MyData>;
```

* ✅ Dùng `has_one`, `constraint`, `seeds` đầy đủ
* ✅ Giúp validate từ compile-time
* ⚠️ Đừng lạm dụng `#[derive(Default)]` nếu dữ liệu có giá trị thật

---

## 🧰 11. Script & CLI Tooling

* `scripts/airdrop.ts` → airdrop SOL
* `scripts/pda.ts` → tính PDA offline
* `scripts/call.ts` → gọi instruction từ node CLI

---

## 📋 12. Checklist bảo mật nội bộ

* [ ] Tất cả account `mut` thực sự cần ghi?
* [ ] Mỗi instruction đều có `authority` rõ ràng?
* [ ] Không có logic panic hoặc unwrap?
* [ ] Tài khoản token luôn kiểm tra `.owner` đúng?

---

## 🧠 13. Ghi chú cuối cùng (thực chiến)

* `msg!()` là bạn thân khi debug
* Luôn viết unit test và test với nhiều signer khác nhau
* Tối ưu không chỉ code, mà cả **developer experience**
* Ghi rõ docs – để sau này người khác duy trì dễ dàng