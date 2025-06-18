export type EscrowVault = {
  "version": "0.1.0",
  "name": "escrow_vault",
  "instructions": [
    {
      "name": "initializeVault",
      "docs": [
        "Initialize vault system (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "admin",
          "type": "publicKey"
        },
        {
          "name": "emergencyAdmin",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "addAuthorizedTrader",
      "docs": [
        "Add authorized trading program (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "traderProgram",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "removeAuthorizedTrader",
      "docs": [
        "Remove authorized trading program (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "traderProgram",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "pause",
      "docs": [
        "Emergency pause (Emergency admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "emergencyAdmin",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "unpause",
      "docs": [
        "Emergency unpause (Emergency admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "emergencyAdmin",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "depositCollateral",
      "docs": [
        "User deposits collateral tokens (ANY TOKEN SUPPORTED)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Token mint being deposited (ANY TOKEN SUPPORTED)"
          ]
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawCollateral",
      "docs": [
        "User withdraws available balance"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "slashBalance",
      "docs": [
        "CPI ONLY: Subtract user balance (exact EVM slashBalance mapping)",
        "Used by trading program to \"lock\" collateral"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "creditBalance",
      "docs": [
        "CPI ONLY: Add user balance (exact EVM creditBalance mapping)",
        "Used by trading program to \"unlock\" collateral"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferOut",
      "docs": [
        "CPI ONLY: Transfer tokens out of vault (exact EVM transferOut mapping)",
        "Used by trading program for settlement and cancellation"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "recipient",
          "type": "publicKey"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferBalance",
      "docs": [
        "CPI ONLY: Transfer between user balances (exact EVM transferBalance mapping)",
        "Used by trading program for internal transfers"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "fromBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "toBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "fromUser",
          "type": "publicKey"
        },
        {
          "name": "toUser",
          "type": "publicKey"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "userBalance",
      "docs": [
        "UserBalance - Per user per token balance (PDA)",
        "Seeds: [\"user_balance\", user_pubkey, token_mint]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "balance",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultAuthority",
      "docs": [
        "VaultAuthority - Token custody management (PDA)",
        "Seeds: [\"vault_authority\", token_mint]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "vaultAta",
            "type": "publicKey"
          },
          {
            "name": "totalDeposits",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultConfig",
      "docs": [
        "VaultConfig - Global vault state (PDA)",
        "Seeds: [\"vault_config\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "emergencyAdmin",
            "type": "publicKey"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "authorizedTraders",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "VaultInitialized",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "emergencyAdmin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "VaultPaused",
      "fields": [
        {
          "name": "emergencyAdmin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "VaultUnpaused",
      "fields": [
        {
          "name": "emergencyAdmin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "CollateralDeposited",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "newBalance",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "CollateralWithdrawn",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "remainingBalance",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "BalanceSlashed",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "callerProgram",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "BalanceCredited",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "callerProgram",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "TokensTransferredOut",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "recipient",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "callerProgram",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "BalanceTransferred",
      "fields": [
        {
          "name": "fromUser",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "toUser",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "callerProgram",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "AuthorizedTraderAdded",
      "fields": [
        {
          "name": "traderProgram",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "AuthorizedTraderRemoved",
      "fields": [
        {
          "name": "traderProgram",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidAdmin",
      "msg": "Invalid admin"
    },
    {
      "code": 6001,
      "name": "InvalidEmergencyAdmin",
      "msg": "Invalid emergency admin"
    },
    {
      "code": 6002,
      "name": "VaultPaused",
      "msg": "Vault is paused"
    },
    {
      "code": 6003,
      "name": "VaultNotPaused",
      "msg": "Vault is not paused"
    },
    {
      "code": 6004,
      "name": "InvalidAccountOwner",
      "msg": "Invalid account owner"
    },
    {
      "code": 6005,
      "name": "InvalidTokenMint",
      "msg": "Invalid token mint"
    },
    {
      "code": 6006,
      "name": "InsufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6007,
      "name": "ZeroAmount",
      "msg": "Zero amount not allowed"
    },
    {
      "code": 6008,
      "name": "MathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6009,
      "name": "UnauthorizedTrader",
      "msg": "Unauthorized trader"
    },
    {
      "code": 6010,
      "name": "DuplicateAuthorizedTrader",
      "msg": "Duplicate authorized trader"
    },
    {
      "code": 6011,
      "name": "TooManyAuthorizedTraders",
      "msg": "Too many authorized traders"
    },
    {
      "code": 6012,
      "name": "TraderNotFound",
      "msg": "Trader not found"
    },
    {
      "code": 6013,
      "name": "UnauthorizedCPICaller",
      "msg": "Unauthorized CPI caller"
    },
    {
      "code": 6014,
      "name": "UnauthorizedTraderProgram",
      "msg": "Unauthorized trader program"
    },
    {
      "code": 6015,
      "name": "TokenMintMismatch",
      "msg": "Token mint mismatch"
    },
    {
      "code": 6016,
      "name": "InvalidVaultAuthority",
      "msg": "Invalid vault authority"
    },
    {
      "code": 6017,
      "name": "ArithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6018,
      "name": "InvalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 6019,
      "name": "TransferFailed",
      "msg": "Transfer failed"
    },
    {
      "code": 6020,
      "name": "InvalidRecipient",
      "msg": "Invalid recipient"
    },
    {
      "code": 6021,
      "name": "AccountAlreadyInitialized",
      "msg": "Account already initialized"
    },
    {
      "code": 6022,
      "name": "AccountNotInitialized",
      "msg": "Account not initialized"
    },
    {
      "code": 6023,
      "name": "TraderAlreadyAuthorized",
      "msg": "Trader already authorized"
    },
    {
      "code": 6024,
      "name": "MaximumTradersReached",
      "msg": "Maximum traders reached"
    },
    {
      "code": 6025,
      "name": "InvalidInstructionSysvar",
      "msg": "Invalid instruction sysvar account"
    },
    {
      "code": 6026,
      "name": "FailedToLoadInstruction",
      "msg": "Failed to load instruction from sysvar"
    },
    {
      "code": 6027,
      "name": "CpiCallerDetectionFailed",
      "msg": "CPI caller detection failed"
    }
  ]
};

export const IDL: EscrowVault = {
  "version": "0.1.0",
  "name": "escrow_vault",
  "instructions": [
    {
      "name": "initializeVault",
      "docs": [
        "Initialize vault system (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "admin",
          "type": "publicKey"
        },
        {
          "name": "emergencyAdmin",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "addAuthorizedTrader",
      "docs": [
        "Add authorized trading program (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "traderProgram",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "removeAuthorizedTrader",
      "docs": [
        "Remove authorized trading program (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "traderProgram",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "pause",
      "docs": [
        "Emergency pause (Emergency admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "emergencyAdmin",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "unpause",
      "docs": [
        "Emergency unpause (Emergency admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "emergencyAdmin",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "depositCollateral",
      "docs": [
        "User deposits collateral tokens (ANY TOKEN SUPPORTED)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Token mint being deposited (ANY TOKEN SUPPORTED)"
          ]
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawCollateral",
      "docs": [
        "User withdraws available balance"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "slashBalance",
      "docs": [
        "CPI ONLY: Subtract user balance (exact EVM slashBalance mapping)",
        "Used by trading program to \"lock\" collateral"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "creditBalance",
      "docs": [
        "CPI ONLY: Add user balance (exact EVM creditBalance mapping)",
        "Used by trading program to \"unlock\" collateral"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferOut",
      "docs": [
        "CPI ONLY: Transfer tokens out of vault (exact EVM transferOut mapping)",
        "Used by trading program for settlement and cancellation"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "recipient",
          "type": "publicKey"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferBalance",
      "docs": [
        "CPI ONLY: Transfer between user balances (exact EVM transferBalance mapping)",
        "Used by trading program for internal transfers"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "fromBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "toBalance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "fromUser",
          "type": "publicKey"
        },
        {
          "name": "toUser",
          "type": "publicKey"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "userBalance",
      "docs": [
        "UserBalance - Per user per token balance (PDA)",
        "Seeds: [\"user_balance\", user_pubkey, token_mint]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "balance",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultAuthority",
      "docs": [
        "VaultAuthority - Token custody management (PDA)",
        "Seeds: [\"vault_authority\", token_mint]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "vaultAta",
            "type": "publicKey"
          },
          {
            "name": "totalDeposits",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultConfig",
      "docs": [
        "VaultConfig - Global vault state (PDA)",
        "Seeds: [\"vault_config\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "emergencyAdmin",
            "type": "publicKey"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "authorizedTraders",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "VaultInitialized",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "emergencyAdmin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "VaultPaused",
      "fields": [
        {
          "name": "emergencyAdmin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "VaultUnpaused",
      "fields": [
        {
          "name": "emergencyAdmin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "CollateralDeposited",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "newBalance",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "CollateralWithdrawn",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "remainingBalance",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "BalanceSlashed",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "callerProgram",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "BalanceCredited",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "callerProgram",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "TokensTransferredOut",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "recipient",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "callerProgram",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "BalanceTransferred",
      "fields": [
        {
          "name": "fromUser",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "toUser",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "callerProgram",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "AuthorizedTraderAdded",
      "fields": [
        {
          "name": "traderProgram",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "AuthorizedTraderRemoved",
      "fields": [
        {
          "name": "traderProgram",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidAdmin",
      "msg": "Invalid admin"
    },
    {
      "code": 6001,
      "name": "InvalidEmergencyAdmin",
      "msg": "Invalid emergency admin"
    },
    {
      "code": 6002,
      "name": "VaultPaused",
      "msg": "Vault is paused"
    },
    {
      "code": 6003,
      "name": "VaultNotPaused",
      "msg": "Vault is not paused"
    },
    {
      "code": 6004,
      "name": "InvalidAccountOwner",
      "msg": "Invalid account owner"
    },
    {
      "code": 6005,
      "name": "InvalidTokenMint",
      "msg": "Invalid token mint"
    },
    {
      "code": 6006,
      "name": "InsufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6007,
      "name": "ZeroAmount",
      "msg": "Zero amount not allowed"
    },
    {
      "code": 6008,
      "name": "MathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6009,
      "name": "UnauthorizedTrader",
      "msg": "Unauthorized trader"
    },
    {
      "code": 6010,
      "name": "DuplicateAuthorizedTrader",
      "msg": "Duplicate authorized trader"
    },
    {
      "code": 6011,
      "name": "TooManyAuthorizedTraders",
      "msg": "Too many authorized traders"
    },
    {
      "code": 6012,
      "name": "TraderNotFound",
      "msg": "Trader not found"
    },
    {
      "code": 6013,
      "name": "UnauthorizedCPICaller",
      "msg": "Unauthorized CPI caller"
    },
    {
      "code": 6014,
      "name": "UnauthorizedTraderProgram",
      "msg": "Unauthorized trader program"
    },
    {
      "code": 6015,
      "name": "TokenMintMismatch",
      "msg": "Token mint mismatch"
    },
    {
      "code": 6016,
      "name": "InvalidVaultAuthority",
      "msg": "Invalid vault authority"
    },
    {
      "code": 6017,
      "name": "ArithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6018,
      "name": "InvalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 6019,
      "name": "TransferFailed",
      "msg": "Transfer failed"
    },
    {
      "code": 6020,
      "name": "InvalidRecipient",
      "msg": "Invalid recipient"
    },
    {
      "code": 6021,
      "name": "AccountAlreadyInitialized",
      "msg": "Account already initialized"
    },
    {
      "code": 6022,
      "name": "AccountNotInitialized",
      "msg": "Account not initialized"
    },
    {
      "code": 6023,
      "name": "TraderAlreadyAuthorized",
      "msg": "Trader already authorized"
    },
    {
      "code": 6024,
      "name": "MaximumTradersReached",
      "msg": "Maximum traders reached"
    },
    {
      "code": 6025,
      "name": "InvalidInstructionSysvar",
      "msg": "Invalid instruction sysvar account"
    },
    {
      "code": 6026,
      "name": "FailedToLoadInstruction",
      "msg": "Failed to load instruction from sysvar"
    },
    {
      "code": 6027,
      "name": "CpiCallerDetectionFailed",
      "msg": "CPI caller detection failed"
    }
  ]
};
