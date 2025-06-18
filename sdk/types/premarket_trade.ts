export type PremarketTrade = {
  "version": "0.1.0",
  "name": "premarket_trade",
  "instructions": [
    {
      "name": "initializeTrading",
      "docs": [
        "Initialize trading system (Admin only)"
      ],
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tradeConfig",
          "isMut": true,
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
          "name": "vaultProgram",
          "type": "publicKey"
        },
        {
          "name": "economicConfig",
          "type": {
            "defined": "EconomicConfig"
          }
        },
        {
          "name": "technicalConfig",
          "type": {
            "defined": "TechnicalConfig"
          }
        }
      ]
    },
    {
      "name": "createTokenMarket",
      "docs": [
        "Create new token market (Admin only)",
        "TokenMarket = User-controlled keypair, not PDA"
      ],
      "accounts": [
        {
          "name": "tokenMarket",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "TokenMarket account (User-controlled keypair, not PDA)",
            "Client generates keypair, Anchor handles account creation/initialization"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for admin validation"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must match config.admin)"
          ]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "settleTimeLimit",
          "type": "u32"
        }
      ]
    },
    {
      "name": "mapToken",
      "docs": [
        "Map real token to market (Admin only)"
      ],
      "accounts": [
        {
          "name": "tokenMarket",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "TokenMarket account to map (must exist and be unMapped)"
          ]
        },
        {
          "name": "realMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Real token mint to map to this market"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for admin validation"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must match config.admin)"
          ]
        }
      ],
      "args": [
        {
          "name": "realMint",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "updateEconomicConfig",
      "docs": [
        "Update economic parameters (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA to update"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must be current admin)"
          ]
        }
      ],
      "args": [
        {
          "name": "newConfig",
          "type": {
            "defined": "EconomicConfig"
          }
        }
      ]
    },
    {
      "name": "updateTechnicalConfig",
      "docs": [
        "Update technical parameters (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA to update"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must be current admin)"
          ]
        }
      ],
      "args": [
        {
          "name": "newConfig",
          "type": {
            "defined": "TechnicalConfig"
          }
        }
      ]
    },
    {
      "name": "manageRelayers",
      "docs": [
        "Add/remove relayers (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA to manage relayers"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must match config.admin)"
          ]
        }
      ],
      "args": [
        {
          "name": "relayer",
          "type": "publicKey"
        },
        {
          "name": "add",
          "type": "bool"
        }
      ]
    },
    {
      "name": "matchOrders",
      "docs": [
        "**CORE BUSINESS LOGIC**: Match buy and sell orders",
        "TradeRecord = User-controlled keypair, not PDA",
        "Includes CPI calls to vault for collateral locking"
      ],
      "accounts": [
        {
          "name": "tradeRecord",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "TradeRecord account (User-controlled keypair, not PDA)",
            "Client generates keypair, Anchor handles account creation/initialization"
          ]
        },
        {
          "name": "tokenMarket",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "TokenMarket for the trading pair"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for relayer validation"
          ]
        },
        {
          "name": "relayer",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Authorized relayer executing the match"
          ]
        },
        {
          "name": "vaultProgram",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault program for cross-program calls"
          ]
        },
        {
          "name": "vaultConfig",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault config PDA - properly typed and validated"
          ]
        },
        {
          "name": "buyerBalance",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Buyer balance PDA - validated in handler"
          ]
        },
        {
          "name": "sellerBalance",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller balance PDA - validated in handler"
          ]
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault authority PDA - properly typed and validated"
          ]
        },
        {
          "name": "buyerCollateralAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sellerCollateralAta",
          "isMut": false,
          "isSigner": false
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
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise CPI caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "buyOrder",
          "type": {
            "defined": "PreOrder"
          }
        },
        {
          "name": "sellOrder",
          "type": {
            "defined": "PreOrder"
          }
        },
        {
          "name": "fillAmount",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "settleTrade",
      "docs": [
        "**SETTLEMENT**: Seller delivers tokens to buyer",
        "Includes CPI calls to vault for token transfers"
      ],
      "accounts": [
        {
          "name": "tradeRecord",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "TradeRecord account to settle (User-controlled keypair)"
          ]
        },
        {
          "name": "tokenMarket",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "TokenMarket for the trading pair (must be mapped to real token)"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for validation"
          ]
        },
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Seller signer (must match trade_record.seller)"
          ]
        },
        {
          "name": "vaultProgram",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault program for cross-program calls"
          ]
        },
        {
          "name": "vaultConfig",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault config PDA"
          ]
        },
        {
          "name": "sellerBalance",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller balance PDA for collateral release"
          ]
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Vault authority PDA"
          ]
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Vault ATA for collateral token"
          ]
        },
        {
          "name": "sellerCollateralAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller ATA for collateral release"
          ]
        },
        {
          "name": "sellerTokenAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller ATA for real token (source)"
          ]
        },
        {
          "name": "buyerTokenAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Buyer ATA for real token (destination)"
          ]
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
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise CPI caller detection"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "cancelTrade",
      "docs": [
        "**CANCELLATION**: Cancel trade after grace period",
        "Includes CPI calls to vault for penalty distribution"
      ],
      "accounts": [
        {
          "name": "tradeRecord",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "TradeRecord account to cancel (User-controlled keypair)"
          ]
        },
        {
          "name": "tokenMarket",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "TokenMarket for the trading pair (for grace period validation)"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for economic parameters"
          ]
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Buyer signer (must match trade_record.buyer)"
          ]
        },
        {
          "name": "vaultProgram",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault program for cross-program calls"
          ]
        },
        {
          "name": "vaultConfig",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault config PDA"
          ]
        },
        {
          "name": "buyerBalance",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Buyer balance PDA for collateral release"
          ]
        },
        {
          "name": "sellerBalance",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller balance PDA for collateral release"
          ]
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Vault authority PDA"
          ]
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Vault ATA for collateral token"
          ]
        },
        {
          "name": "buyerCollateralAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Buyer ATA for collateral return"
          ]
        },
        {
          "name": "sellerCollateralAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller ATA for remaining collateral return"
          ]
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
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise CPI caller detection"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "cancelOrder",
      "docs": [
        "Cancel a pending order and unlock collateral"
      ],
      "accounts": [
        {
          "name": "orderStatus",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "OrderStatus PDA to track cancellation"
          ]
        },
        {
          "name": "tokenMarket",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "TokenMarket for the order (validation)"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for economic parameters"
          ]
        },
        {
          "name": "trader",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Trader signer (must match order.trader)"
          ]
        },
        {
          "name": "vaultProgram",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault program for cross-program calls"
          ]
        },
        {
          "name": "vaultConfig",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault config PDA"
          ]
        },
        {
          "name": "traderBalance",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trader balance PDA for collateral unlock"
          ]
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault authority PDA"
          ]
        },
        {
          "name": "traderCollateralAta",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trader ATA for validation (not used for transfer)"
          ]
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
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise CPI caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "order",
          "type": {
            "defined": "PreOrder"
          }
        }
      ]
    },
    {
      "name": "pause",
      "docs": [
        "Emergency pause (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA to update pause state"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must be current admin)"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "unpause",
      "docs": [
        "Emergency unpause (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA to update pause state"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must be current admin)"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "orderStatus",
      "docs": [
        "OrderStatus - Track individual order state (PDA)",
        "Used for order management and partial fills"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderId",
            "type": "publicKey"
          },
          {
            "name": "tokenMarket",
            "type": "publicKey"
          },
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "orderType",
            "type": {
              "defined": "OrderType"
            }
          },
          {
            "name": "originalQuantity",
            "type": "u64"
          },
          {
            "name": "filledQuantity",
            "type": "u64"
          },
          {
            "name": "collateralLocked",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": "OrderStatusType"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tokenMarket",
      "docs": [
        "TokenMarket - Per-token market data (User-controlled keypair, not PDA)",
        "Exact business requirements mapping"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenId",
            "type": "publicKey"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "realMint",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "mappingTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "settleTimeLimit",
            "type": "u32"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "tradeConfig",
      "docs": [
        "TradeConfig - Global trading configuration (PDA)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "vaultProgram",
            "type": "publicKey"
          },
          {
            "name": "relayers",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "economicConfig",
            "type": {
              "defined": "EconomicConfig"
            }
          },
          {
            "name": "technicalConfig",
            "type": {
              "defined": "TechnicalConfig"
            }
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tradeRecord",
      "docs": [
        "TradeRecord - Individual trade record (User-controlled keypair, not PDA)",
        "Exact business requirements mapping"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tradeId",
            "type": "publicKey"
          },
          {
            "name": "buyer",
            "type": "publicKey"
          },
          {
            "name": "seller",
            "type": "publicKey"
          },
          {
            "name": "tokenId",
            "type": "publicKey"
          },
          {
            "name": "collateralMint",
            "type": "publicKey"
          },
          {
            "name": "filledAmount",
            "type": "u64"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "buyerCollateral",
            "type": "u64"
          },
          {
            "name": "sellerCollateral",
            "type": "u64"
          },
          {
            "name": "matchTime",
            "type": "i64"
          },
          {
            "name": "settled",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "PreOrder",
      "docs": [
        "PreOrder - Off-chain signed order (Updated for Keypair Pattern)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "trader",
            "type": "publicKey"
          },
          {
            "name": "collateralToken",
            "type": "publicKey"
          },
          {
            "name": "tokenId",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "isBuy",
            "type": "bool"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "EconomicConfig",
      "docs": [
        "Economic Config"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minimumFillAmount",
            "type": "u64"
          },
          {
            "name": "maximumOrderAmount",
            "type": "u64"
          },
          {
            "name": "buyerCollateralRatio",
            "type": "u16"
          },
          {
            "name": "sellerCollateralRatio",
            "type": "u16"
          },
          {
            "name": "sellerRewardBps",
            "type": "u16"
          },
          {
            "name": "latePenaltyBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "TechnicalConfig",
      "docs": [
        "Technical Config"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minSettleTime",
            "type": "u32"
          },
          {
            "name": "maxSettleTime",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "TradingError",
      "docs": [
        "Trading program error definitions (exact as specified in business requirements)"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "InvalidSignature"
          },
          {
            "name": "IncompatibleOrders"
          },
          {
            "name": "TradeAlreadySettled"
          },
          {
            "name": "GracePeriodActive"
          },
          {
            "name": "GracePeriodExpired"
          },
          {
            "name": "InvalidAccountOwner"
          },
          {
            "name": "VaultCPIFailed"
          },
          {
            "name": "MathOverflow"
          },
          {
            "name": "PriceTooLow"
          },
          {
            "name": "PriceTooHigh"
          },
          {
            "name": "OrderExpired"
          },
          {
            "name": "OrderAlreadyUsed"
          },
          {
            "name": "InsufficientCollateral"
          },
          {
            "name": "TradeNotFound"
          },
          {
            "name": "OnlyBuyerCanCancel"
          },
          {
            "name": "OnlySellerCanSettle"
          },
          {
            "name": "TokenTransferFailed"
          },
          {
            "name": "InvalidFillAmount"
          },
          {
            "name": "ExceedOrderAmount"
          },
          {
            "name": "BelowMinimumFill"
          },
          {
            "name": "TokenNotExists"
          },
          {
            "name": "TokenAlreadyMapped"
          },
          {
            "name": "InvalidTokenAddress"
          },
          {
            "name": "DuplicateSymbol"
          },
          {
            "name": "InvalidCollateralRatio"
          },
          {
            "name": "InvalidRewardParameters"
          },
          {
            "name": "ZeroAmount"
          },
          {
            "name": "SelfTrade"
          },
          {
            "name": "TradingPaused"
          },
          {
            "name": "UnauthorizedRelayer"
          },
          {
            "name": "InvalidSettleTime"
          },
          {
            "name": "SymbolTooLong"
          },
          {
            "name": "NameTooLong"
          },
          {
            "name": "TooManyAuthorizedTraders"
          },
          {
            "name": "TooManySupportedTokens"
          },
          {
            "name": "TooManyRelayers"
          },
          {
            "name": "InvalidAdmin"
          },
          {
            "name": "InvalidVaultProgram"
          },
          {
            "name": "InvalidOrderHash"
          },
          {
            "name": "GracePeriodNotExpired"
          },
          {
            "name": "TokenMintMismatch"
          },
          {
            "name": "InvalidTargetMint"
          },
          {
            "name": "SettlementDeadlinePassed"
          },
          {
            "name": "TradingNotActive"
          },
          {
            "name": "InvalidOrderType"
          },
          {
            "name": "InvalidQuantity"
          },
          {
            "name": "InsufficientBalance"
          },
          {
            "name": "InvalidTokenMint"
          },
          {
            "name": "InvalidMarket"
          },
          {
            "name": "OrderNotFound"
          },
          {
            "name": "OrderAlreadyFilled"
          },
          {
            "name": "OrderAlreadyCancelled"
          },
          {
            "name": "InvalidOrderOwner"
          },
          {
            "name": "TradingNotStarted"
          },
          {
            "name": "TradingEnded"
          },
          {
            "name": "InsufficientRemainingSupply"
          },
          {
            "name": "InvalidPrice"
          },
          {
            "name": "InvalidTimeRange"
          },
          {
            "name": "VaultProgramMismatch"
          },
          {
            "name": "CPICallFailed"
          },
          {
            "name": "TokenNotMapped"
          },
          {
            "name": "InvalidInstructionSysvar"
          }
        ]
      }
    },
    {
      "name": "OrderType",
      "docs": [
        "Order type enum"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Buy"
          },
          {
            "name": "Sell"
          }
        ]
      }
    },
    {
      "name": "OrderStatusType",
      "docs": [
        "Order status enum"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "PartiallyFilled"
          },
          {
            "name": "Filled"
          },
          {
            "name": "Cancelled"
          },
          {
            "name": "Expired"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "TradingInitialized",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "vaultProgram",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "feeRecipient",
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
      "name": "TokenMarketCreated",
      "fields": [
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "symbol",
          "type": "string",
          "index": false
        },
        {
          "name": "name",
          "type": "string",
          "index": false
        },
        {
          "name": "settleTimeLimit",
          "type": "u32",
          "index": false
        },
        {
          "name": "createdAt",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TokenMapped",
      "fields": [
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "realMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "mappingTime",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "RelayerAdded",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "relayer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "totalRelayers",
          "type": "u8",
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
      "name": "RelayerRemoved",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "relayer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "totalRelayers",
          "type": "u8",
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
      "name": "OrdersMatched",
      "fields": [
        {
          "name": "tradeId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "buyer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "seller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "filledAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "price",
          "type": "u64",
          "index": false
        },
        {
          "name": "buyerCollateral",
          "type": "u64",
          "index": false
        },
        {
          "name": "sellerCollateral",
          "type": "u64",
          "index": false
        },
        {
          "name": "matchTime",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "OrderPlaced",
      "fields": [
        {
          "name": "orderId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMarket",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "orderType",
          "type": "u8",
          "index": false
        },
        {
          "name": "quantity",
          "type": "u64",
          "index": false
        },
        {
          "name": "collateralAmount",
          "type": "u64",
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
      "name": "OrderCancelled",
      "fields": [
        {
          "name": "orderHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "trader",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "collateralReleased",
          "type": "u64",
          "index": false
        },
        {
          "name": "cancellationTime",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TradeSettled",
      "fields": [
        {
          "name": "tradeId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "buyer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "seller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "targetMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "filledAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "sellerReward",
          "type": "u64",
          "index": false
        },
        {
          "name": "settlementTime",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TradeCancelled",
      "fields": [
        {
          "name": "tradeId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "buyer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "seller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "penaltyAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "cancellationTime",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TradingConfigUpdated",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newFeeRate",
          "type": "u64",
          "index": false
        },
        {
          "name": "newPenaltyRate",
          "type": "u64",
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
      "name": "TradingPaused",
      "fields": [
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
      "name": "TradingUnpaused",
      "fields": [
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
      "name": "EconomicConfigUpdated",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldConfig",
          "type": {
            "defined": "EconomicConfig"
          },
          "index": false
        },
        {
          "name": "newConfig",
          "type": {
            "defined": "EconomicConfig"
          },
          "index": false
        },
        {
          "name": "updatedAt",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TechnicalConfigUpdated",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldConfig",
          "type": {
            "defined": "TechnicalConfig"
          },
          "index": false
        },
        {
          "name": "newConfig",
          "type": {
            "defined": "TechnicalConfig"
          },
          "index": false
        },
        {
          "name": "updatedAt",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "MathOverflow",
      "msg": "Math overflow"
    }
  ]
};

export const IDL: PremarketTrade = {
  "version": "0.1.0",
  "name": "premarket_trade",
  "instructions": [
    {
      "name": "initializeTrading",
      "docs": [
        "Initialize trading system (Admin only)"
      ],
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tradeConfig",
          "isMut": true,
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
          "name": "vaultProgram",
          "type": "publicKey"
        },
        {
          "name": "economicConfig",
          "type": {
            "defined": "EconomicConfig"
          }
        },
        {
          "name": "technicalConfig",
          "type": {
            "defined": "TechnicalConfig"
          }
        }
      ]
    },
    {
      "name": "createTokenMarket",
      "docs": [
        "Create new token market (Admin only)",
        "TokenMarket = User-controlled keypair, not PDA"
      ],
      "accounts": [
        {
          "name": "tokenMarket",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "TokenMarket account (User-controlled keypair, not PDA)",
            "Client generates keypair, Anchor handles account creation/initialization"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for admin validation"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must match config.admin)"
          ]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "settleTimeLimit",
          "type": "u32"
        }
      ]
    },
    {
      "name": "mapToken",
      "docs": [
        "Map real token to market (Admin only)"
      ],
      "accounts": [
        {
          "name": "tokenMarket",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "TokenMarket account to map (must exist and be unMapped)"
          ]
        },
        {
          "name": "realMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Real token mint to map to this market"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for admin validation"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must match config.admin)"
          ]
        }
      ],
      "args": [
        {
          "name": "realMint",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "updateEconomicConfig",
      "docs": [
        "Update economic parameters (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA to update"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must be current admin)"
          ]
        }
      ],
      "args": [
        {
          "name": "newConfig",
          "type": {
            "defined": "EconomicConfig"
          }
        }
      ]
    },
    {
      "name": "updateTechnicalConfig",
      "docs": [
        "Update technical parameters (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA to update"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must be current admin)"
          ]
        }
      ],
      "args": [
        {
          "name": "newConfig",
          "type": {
            "defined": "TechnicalConfig"
          }
        }
      ]
    },
    {
      "name": "manageRelayers",
      "docs": [
        "Add/remove relayers (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA to manage relayers"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must match config.admin)"
          ]
        }
      ],
      "args": [
        {
          "name": "relayer",
          "type": "publicKey"
        },
        {
          "name": "add",
          "type": "bool"
        }
      ]
    },
    {
      "name": "matchOrders",
      "docs": [
        "**CORE BUSINESS LOGIC**: Match buy and sell orders",
        "TradeRecord = User-controlled keypair, not PDA",
        "Includes CPI calls to vault for collateral locking"
      ],
      "accounts": [
        {
          "name": "tradeRecord",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "TradeRecord account (User-controlled keypair, not PDA)",
            "Client generates keypair, Anchor handles account creation/initialization"
          ]
        },
        {
          "name": "tokenMarket",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "TokenMarket for the trading pair"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for relayer validation"
          ]
        },
        {
          "name": "relayer",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Authorized relayer executing the match"
          ]
        },
        {
          "name": "vaultProgram",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault program for cross-program calls"
          ]
        },
        {
          "name": "vaultConfig",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault config PDA - properly typed and validated"
          ]
        },
        {
          "name": "buyerBalance",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Buyer balance PDA - validated in handler"
          ]
        },
        {
          "name": "sellerBalance",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller balance PDA - validated in handler"
          ]
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault authority PDA - properly typed and validated"
          ]
        },
        {
          "name": "buyerCollateralAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sellerCollateralAta",
          "isMut": false,
          "isSigner": false
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
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise CPI caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "buyOrder",
          "type": {
            "defined": "PreOrder"
          }
        },
        {
          "name": "sellOrder",
          "type": {
            "defined": "PreOrder"
          }
        },
        {
          "name": "fillAmount",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "settleTrade",
      "docs": [
        "**SETTLEMENT**: Seller delivers tokens to buyer",
        "Includes CPI calls to vault for token transfers"
      ],
      "accounts": [
        {
          "name": "tradeRecord",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "TradeRecord account to settle (User-controlled keypair)"
          ]
        },
        {
          "name": "tokenMarket",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "TokenMarket for the trading pair (must be mapped to real token)"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for validation"
          ]
        },
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Seller signer (must match trade_record.seller)"
          ]
        },
        {
          "name": "vaultProgram",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault program for cross-program calls"
          ]
        },
        {
          "name": "vaultConfig",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault config PDA"
          ]
        },
        {
          "name": "sellerBalance",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller balance PDA for collateral release"
          ]
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Vault authority PDA"
          ]
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Vault ATA for collateral token"
          ]
        },
        {
          "name": "sellerCollateralAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller ATA for collateral release"
          ]
        },
        {
          "name": "sellerTokenAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller ATA for real token (source)"
          ]
        },
        {
          "name": "buyerTokenAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Buyer ATA for real token (destination)"
          ]
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
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise CPI caller detection"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "cancelTrade",
      "docs": [
        "**CANCELLATION**: Cancel trade after grace period",
        "Includes CPI calls to vault for penalty distribution"
      ],
      "accounts": [
        {
          "name": "tradeRecord",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "TradeRecord account to cancel (User-controlled keypair)"
          ]
        },
        {
          "name": "tokenMarket",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "TokenMarket for the trading pair (for grace period validation)"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for economic parameters"
          ]
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Buyer signer (must match trade_record.buyer)"
          ]
        },
        {
          "name": "vaultProgram",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault program for cross-program calls"
          ]
        },
        {
          "name": "vaultConfig",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault config PDA"
          ]
        },
        {
          "name": "buyerBalance",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Buyer balance PDA for collateral release"
          ]
        },
        {
          "name": "sellerBalance",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller balance PDA for collateral release"
          ]
        },
        {
          "name": "vaultAuthority",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Vault authority PDA"
          ]
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Vault ATA for collateral token"
          ]
        },
        {
          "name": "buyerCollateralAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Buyer ATA for collateral return"
          ]
        },
        {
          "name": "sellerCollateralAta",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Seller ATA for remaining collateral return"
          ]
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
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise CPI caller detection"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "cancelOrder",
      "docs": [
        "Cancel a pending order and unlock collateral"
      ],
      "accounts": [
        {
          "name": "orderStatus",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "OrderStatus PDA to track cancellation"
          ]
        },
        {
          "name": "tokenMarket",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "TokenMarket for the order (validation)"
          ]
        },
        {
          "name": "config",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA for economic parameters"
          ]
        },
        {
          "name": "trader",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Trader signer (must match order.trader)"
          ]
        },
        {
          "name": "vaultProgram",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault program for cross-program calls"
          ]
        },
        {
          "name": "vaultConfig",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault config PDA"
          ]
        },
        {
          "name": "traderBalance",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trader balance PDA for collateral unlock"
          ]
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Vault authority PDA"
          ]
        },
        {
          "name": "traderCollateralAta",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Trader ATA for validation (not used for transfer)"
          ]
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
        },
        {
          "name": "instructionSysvar",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "🛡️ INSTRUCTION SYSVAR - For precise CPI caller detection"
          ]
        }
      ],
      "args": [
        {
          "name": "order",
          "type": {
            "defined": "PreOrder"
          }
        }
      ]
    },
    {
      "name": "pause",
      "docs": [
        "Emergency pause (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA to update pause state"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must be current admin)"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "unpause",
      "docs": [
        "Emergency unpause (Admin only)"
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Trade configuration PDA to update pause state"
          ]
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Admin signer (must be current admin)"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "orderStatus",
      "docs": [
        "OrderStatus - Track individual order state (PDA)",
        "Used for order management and partial fills"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderId",
            "type": "publicKey"
          },
          {
            "name": "tokenMarket",
            "type": "publicKey"
          },
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "orderType",
            "type": {
              "defined": "OrderType"
            }
          },
          {
            "name": "originalQuantity",
            "type": "u64"
          },
          {
            "name": "filledQuantity",
            "type": "u64"
          },
          {
            "name": "collateralLocked",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": "OrderStatusType"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tokenMarket",
      "docs": [
        "TokenMarket - Per-token market data (User-controlled keypair, not PDA)",
        "Exact business requirements mapping"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenId",
            "type": "publicKey"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "realMint",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "mappingTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "settleTimeLimit",
            "type": "u32"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "tradeConfig",
      "docs": [
        "TradeConfig - Global trading configuration (PDA)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "vaultProgram",
            "type": "publicKey"
          },
          {
            "name": "relayers",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "economicConfig",
            "type": {
              "defined": "EconomicConfig"
            }
          },
          {
            "name": "technicalConfig",
            "type": {
              "defined": "TechnicalConfig"
            }
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tradeRecord",
      "docs": [
        "TradeRecord - Individual trade record (User-controlled keypair, not PDA)",
        "Exact business requirements mapping"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tradeId",
            "type": "publicKey"
          },
          {
            "name": "buyer",
            "type": "publicKey"
          },
          {
            "name": "seller",
            "type": "publicKey"
          },
          {
            "name": "tokenId",
            "type": "publicKey"
          },
          {
            "name": "collateralMint",
            "type": "publicKey"
          },
          {
            "name": "filledAmount",
            "type": "u64"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "buyerCollateral",
            "type": "u64"
          },
          {
            "name": "sellerCollateral",
            "type": "u64"
          },
          {
            "name": "matchTime",
            "type": "i64"
          },
          {
            "name": "settled",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "PreOrder",
      "docs": [
        "PreOrder - Off-chain signed order (Updated for Keypair Pattern)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "trader",
            "type": "publicKey"
          },
          {
            "name": "collateralToken",
            "type": "publicKey"
          },
          {
            "name": "tokenId",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "isBuy",
            "type": "bool"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "EconomicConfig",
      "docs": [
        "Economic Config"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minimumFillAmount",
            "type": "u64"
          },
          {
            "name": "maximumOrderAmount",
            "type": "u64"
          },
          {
            "name": "buyerCollateralRatio",
            "type": "u16"
          },
          {
            "name": "sellerCollateralRatio",
            "type": "u16"
          },
          {
            "name": "sellerRewardBps",
            "type": "u16"
          },
          {
            "name": "latePenaltyBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "TechnicalConfig",
      "docs": [
        "Technical Config"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minSettleTime",
            "type": "u32"
          },
          {
            "name": "maxSettleTime",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "TradingError",
      "docs": [
        "Trading program error definitions (exact as specified in business requirements)"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "InvalidSignature"
          },
          {
            "name": "IncompatibleOrders"
          },
          {
            "name": "TradeAlreadySettled"
          },
          {
            "name": "GracePeriodActive"
          },
          {
            "name": "GracePeriodExpired"
          },
          {
            "name": "InvalidAccountOwner"
          },
          {
            "name": "VaultCPIFailed"
          },
          {
            "name": "MathOverflow"
          },
          {
            "name": "PriceTooLow"
          },
          {
            "name": "PriceTooHigh"
          },
          {
            "name": "OrderExpired"
          },
          {
            "name": "OrderAlreadyUsed"
          },
          {
            "name": "InsufficientCollateral"
          },
          {
            "name": "TradeNotFound"
          },
          {
            "name": "OnlyBuyerCanCancel"
          },
          {
            "name": "OnlySellerCanSettle"
          },
          {
            "name": "TokenTransferFailed"
          },
          {
            "name": "InvalidFillAmount"
          },
          {
            "name": "ExceedOrderAmount"
          },
          {
            "name": "BelowMinimumFill"
          },
          {
            "name": "TokenNotExists"
          },
          {
            "name": "TokenAlreadyMapped"
          },
          {
            "name": "InvalidTokenAddress"
          },
          {
            "name": "DuplicateSymbol"
          },
          {
            "name": "InvalidCollateralRatio"
          },
          {
            "name": "InvalidRewardParameters"
          },
          {
            "name": "ZeroAmount"
          },
          {
            "name": "SelfTrade"
          },
          {
            "name": "TradingPaused"
          },
          {
            "name": "UnauthorizedRelayer"
          },
          {
            "name": "InvalidSettleTime"
          },
          {
            "name": "SymbolTooLong"
          },
          {
            "name": "NameTooLong"
          },
          {
            "name": "TooManyAuthorizedTraders"
          },
          {
            "name": "TooManySupportedTokens"
          },
          {
            "name": "TooManyRelayers"
          },
          {
            "name": "InvalidAdmin"
          },
          {
            "name": "InvalidVaultProgram"
          },
          {
            "name": "InvalidOrderHash"
          },
          {
            "name": "GracePeriodNotExpired"
          },
          {
            "name": "TokenMintMismatch"
          },
          {
            "name": "InvalidTargetMint"
          },
          {
            "name": "SettlementDeadlinePassed"
          },
          {
            "name": "TradingNotActive"
          },
          {
            "name": "InvalidOrderType"
          },
          {
            "name": "InvalidQuantity"
          },
          {
            "name": "InsufficientBalance"
          },
          {
            "name": "InvalidTokenMint"
          },
          {
            "name": "InvalidMarket"
          },
          {
            "name": "OrderNotFound"
          },
          {
            "name": "OrderAlreadyFilled"
          },
          {
            "name": "OrderAlreadyCancelled"
          },
          {
            "name": "InvalidOrderOwner"
          },
          {
            "name": "TradingNotStarted"
          },
          {
            "name": "TradingEnded"
          },
          {
            "name": "InsufficientRemainingSupply"
          },
          {
            "name": "InvalidPrice"
          },
          {
            "name": "InvalidTimeRange"
          },
          {
            "name": "VaultProgramMismatch"
          },
          {
            "name": "CPICallFailed"
          },
          {
            "name": "TokenNotMapped"
          },
          {
            "name": "InvalidInstructionSysvar"
          }
        ]
      }
    },
    {
      "name": "OrderType",
      "docs": [
        "Order type enum"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Buy"
          },
          {
            "name": "Sell"
          }
        ]
      }
    },
    {
      "name": "OrderStatusType",
      "docs": [
        "Order status enum"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "PartiallyFilled"
          },
          {
            "name": "Filled"
          },
          {
            "name": "Cancelled"
          },
          {
            "name": "Expired"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "TradingInitialized",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "vaultProgram",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "feeRecipient",
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
      "name": "TokenMarketCreated",
      "fields": [
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "symbol",
          "type": "string",
          "index": false
        },
        {
          "name": "name",
          "type": "string",
          "index": false
        },
        {
          "name": "settleTimeLimit",
          "type": "u32",
          "index": false
        },
        {
          "name": "createdAt",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TokenMapped",
      "fields": [
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "realMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "mappingTime",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "RelayerAdded",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "relayer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "totalRelayers",
          "type": "u8",
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
      "name": "RelayerRemoved",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "relayer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "totalRelayers",
          "type": "u8",
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
      "name": "OrdersMatched",
      "fields": [
        {
          "name": "tradeId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "buyer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "seller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "filledAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "price",
          "type": "u64",
          "index": false
        },
        {
          "name": "buyerCollateral",
          "type": "u64",
          "index": false
        },
        {
          "name": "sellerCollateral",
          "type": "u64",
          "index": false
        },
        {
          "name": "matchTime",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "OrderPlaced",
      "fields": [
        {
          "name": "orderId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenMarket",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "orderType",
          "type": "u8",
          "index": false
        },
        {
          "name": "quantity",
          "type": "u64",
          "index": false
        },
        {
          "name": "collateralAmount",
          "type": "u64",
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
      "name": "OrderCancelled",
      "fields": [
        {
          "name": "orderHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "trader",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "collateralReleased",
          "type": "u64",
          "index": false
        },
        {
          "name": "cancellationTime",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TradeSettled",
      "fields": [
        {
          "name": "tradeId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "buyer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "seller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "targetMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "filledAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "sellerReward",
          "type": "u64",
          "index": false
        },
        {
          "name": "settlementTime",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TradeCancelled",
      "fields": [
        {
          "name": "tradeId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "tokenId",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "buyer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "seller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "penaltyAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "cancellationTime",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TradingConfigUpdated",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newFeeRate",
          "type": "u64",
          "index": false
        },
        {
          "name": "newPenaltyRate",
          "type": "u64",
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
      "name": "TradingPaused",
      "fields": [
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
      "name": "TradingUnpaused",
      "fields": [
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
      "name": "EconomicConfigUpdated",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldConfig",
          "type": {
            "defined": "EconomicConfig"
          },
          "index": false
        },
        {
          "name": "newConfig",
          "type": {
            "defined": "EconomicConfig"
          },
          "index": false
        },
        {
          "name": "updatedAt",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TechnicalConfigUpdated",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldConfig",
          "type": {
            "defined": "TechnicalConfig"
          },
          "index": false
        },
        {
          "name": "newConfig",
          "type": {
            "defined": "TechnicalConfig"
          },
          "index": false
        },
        {
          "name": "updatedAt",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "MathOverflow",
      "msg": "Math overflow"
    }
  ]
};
