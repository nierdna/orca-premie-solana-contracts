"use client";

import { useTrading } from "@/hooks/useTrading";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

export function TradingDemo() {
  const {
    createMarket,
    mapToken,
    matchOrders,
    settleTrade,
    cancelTrade,
    isConnected,
  } = useTrading();

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "create" | "map" | "match" | "settle" | "cancel"
  >("create");

  // Form states
  const [createMarketForm, setCreateMarketForm] = useState({
    symbol: "DEMO",
    name: "Demo Token Market",
    settleTimeLimit: 86400,
  });

  const [mapTokenForm, setMapTokenForm] = useState({
    tokenMarket: "",
    realMint: "",
  });

  const [matchOrdersForm, setMatchOrdersForm] = useState({
    buyOrderUser: "HUDgGB3ijjugFFpqzk7U78UsVGYooTWT9GJocihic4EJ",
    buyOrderAmount: "10",
    buyOrderPrice: "0.5",
    buyOrderTokenMarket: "",
    buyOrderCollateralToken: "5FPTnHuxwyqSpuRdjQwaemi8YoW5KT7CeMWQ55v6mCef",
    sellOrderUser: "BEVgbET4HrTvnsCkpgkCvHuJPjHv3eZ49EUMdnXjh8X9",
    sellOrderAmount: "10",
    sellOrderPrice: "0.5",
    sellOrderTokenMarket: "",
    sellOrderCollateralToken: "5FPTnHuxwyqSpuRdjQwaemi8YoW5KT7CeMWQ55v6mCef",
  });

  const [settleTradeForm, setSettleTradeForm] = useState({
    tradeRecord: "",
    signature: "",
  });

  const [cancelTradeForm, setCancelTradeForm] = useState({
    tradeRecord: "",
  });

  const handleCreateMarket = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const result = await createMarket(createMarketForm);
      setResult({
        type: "createMarket",
        data: {
          tokenMarket: result.tokenMarket.toString(),
          symbol: result.symbol.toString(),
          name: result.name.toString(),
          signature: result.signature.toString(),
          fee: result.fee?.toString() || "0",
        },
      });
      console.log("Market created:", result);
    } catch (error) {
      console.error("Error creating market:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setResult({ type: "error", message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapToken = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const result = await mapToken(mapTokenForm);
      setResult({
        type: "mapToken",
        data: {
          signature: result.signature.toString(),
          tokenMarket: mapTokenForm.tokenMarket,
          realMint: mapTokenForm.realMint,
        },
      });
      console.log("Token mapped:", result);
    } catch (error) {
      console.error("Error mapping token:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setResult({ type: "error", message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatchOrders = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const currentTime = Math.floor(Date.now() / 1000);

      const buyOrder = {
        trader: new PublicKey(matchOrdersForm.buyOrderUser),
        collateralToken: new PublicKey(matchOrdersForm.buyOrderCollateralToken),
        tokenId: new PublicKey(matchOrdersForm.buyOrderTokenMarket),
        amount: new anchor.BN(Number(matchOrdersForm.buyOrderAmount) * 10 ** 6),
        price: new anchor.BN(Number(matchOrdersForm.buyOrderPrice) * 10 ** 6),
        isBuy: true,
        nonce: new anchor.BN(Math.floor(Math.random() * 1000000)),
        deadline: new anchor.BN(currentTime + 86400), // 1 day from now
      };

      const sellOrder = {
        trader: new PublicKey(matchOrdersForm.sellOrderUser),
        collateralToken: new PublicKey(
          matchOrdersForm.sellOrderCollateralToken
        ),
        tokenId: new PublicKey(matchOrdersForm.sellOrderTokenMarket),
        amount: new anchor.BN(
          Number(matchOrdersForm.sellOrderAmount) * 10 ** 6
        ),
        price: new anchor.BN(Number(matchOrdersForm.sellOrderPrice) * 10 ** 6),
        isBuy: false,
        nonce: new anchor.BN(Math.floor(Math.random() * 1000000)),
        deadline: new anchor.BN(currentTime + 86400), // 1 day from now
      };

      const result = await matchOrders({ buyOrder, sellOrder });
      setResult({
        type: "matchOrders",
        data: {
          signature: result.signature.toString(),
          tradeRecord: result.tradeRecord?.toString() || "N/A",
        },
      });
      console.log("Orders matched:", result);
    } catch (error) {
      console.error("Error matching orders:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setResult({ type: "error", message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettleTrade = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const params = {
        tradeRecord: settleTradeForm.tradeRecord,
        ...(settleTradeForm.signature && {
          signature: new Uint8Array(
            Buffer.from(settleTradeForm.signature, "hex")
          ),
        }),
      };

      const result = await settleTrade(params);
      setResult({
        type: "settleTrade",
        data: {
          signature: result.signature.toString(),
          tradeRecord: settleTradeForm.tradeRecord,
        },
      });
      console.log("Trade settled:", result);
    } catch (error) {
      console.error("Error settling trade:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setResult({ type: "error", message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTrade = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const result = await cancelTrade(cancelTradeForm);
      setResult({
        type: "cancelTrade",
        data: {
          signature: result.signature.toString(),
          tradeRecord: cancelTradeForm.tradeRecord,
        },
      });
      console.log("Trade cancelled:", result);
    } catch (error) {
      console.error("Error cancelling trade:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setResult({ type: "error", message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: "create", label: "Create Market", icon: "🏭" },
    { id: "map", label: "Map Token", icon: "🗺️" },
    { id: "match", label: "Match Orders", icon: "🤝" },
    { id: "settle", label: "Settle Trade", icon: "✅" },
    { id: "cancel", label: "Cancel Trade", icon: "❌" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Orca Trading Demo</h1>

      {/* Wallet Connection */}
      <div className="mb-8 text-center">
        <WalletMultiButton />
        {isConnected && (
          <p className="text-green-600 mt-2">✅ Wallet Connected</p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 mx-1 mb-2 rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? "bg-blue-500 text-white border-b-2 border-blue-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        {/* Create Market Tab */}
        {activeTab === "create" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Create Token Market
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Symbol
                </label>
                <input
                  type="text"
                  value={createMarketForm.symbol}
                  onChange={(e) =>
                    setCreateMarketForm({
                      ...createMarketForm,
                      symbol: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="e.g., DEMO"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={createMarketForm.name}
                  onChange={(e) =>
                    setCreateMarketForm({
                      ...createMarketForm,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="e.g., Demo Token Market"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Settle Time Limit (seconds)
                </label>
                <input
                  type="number"
                  value={createMarketForm.settleTimeLimit}
                  onChange={(e) =>
                    setCreateMarketForm({
                      ...createMarketForm,
                      settleTimeLimit: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="86400"
                />
              </div>
            </div>
            <button
              onClick={handleCreateMarket}
              disabled={isLoading || !isConnected}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
            >
              {isLoading ? "Creating..." : "Create Market"}
            </button>
          </div>
        )}

        {/* Map Token Tab */}
        {activeTab === "map" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Map Token to Market
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Token Market Address
                </label>
                <input
                  type="text"
                  value={mapTokenForm.tokenMarket}
                  onChange={(e) =>
                    setMapTokenForm({
                      ...mapTokenForm,
                      tokenMarket: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Token Market Public Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Real Mint Address
                </label>
                <input
                  type="text"
                  value={mapTokenForm.realMint}
                  onChange={(e) =>
                    setMapTokenForm({
                      ...mapTokenForm,
                      realMint: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Real Token Mint Public Key"
                />
              </div>
            </div>
            <button
              onClick={handleMapToken}
              disabled={
                isLoading ||
                !isConnected ||
                !mapTokenForm.tokenMarket ||
                !mapTokenForm.realMint
              }
              className="w-full bg-green-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-green-600 transition-colors"
            >
              {isLoading ? "Mapping..." : "Map Token"}
            </button>
          </div>
        )}

        {/* Match Orders Tab */}
        {activeTab === "match" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Match Orders
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Buy Order */}
              <div className="border rounded-lg p-4 bg-green-50">
                <h3 className="text-lg font-medium mb-3 text-green-700">
                  Buy Order
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Trader Address
                    </label>
                    <input
                      type="text"
                      value={matchOrdersForm.buyOrderUser}
                      onChange={(e) =>
                        setMatchOrdersForm({
                          ...matchOrdersForm,
                          buyOrderUser: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                      placeholder="Buyer Public Key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Token Market
                    </label>
                    <input
                      type="text"
                      value={matchOrdersForm.buyOrderTokenMarket}
                      onChange={(e) =>
                        setMatchOrdersForm({
                          ...matchOrdersForm,
                          buyOrderTokenMarket: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                      placeholder="Token Market Address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Collateral Token
                    </label>
                    <input
                      type="text"
                      value={matchOrdersForm.buyOrderCollateralToken}
                      onChange={(e) =>
                        setMatchOrdersForm({
                          ...matchOrdersForm,
                          buyOrderCollateralToken: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                      placeholder="Collateral Token Address (USDC)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={matchOrdersForm.buyOrderAmount}
                      onChange={(e) =>
                        setMatchOrdersForm({
                          ...matchOrdersForm,
                          buyOrderAmount: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                      placeholder="Amount to buy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Price
                    </label>
                    <input
                      type="number"
                      value={matchOrdersForm.buyOrderPrice}
                      onChange={(e) =>
                        setMatchOrdersForm({
                          ...matchOrdersForm,
                          buyOrderPrice: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                      placeholder="Price per unit"
                    />
                  </div>
                </div>
              </div>

              {/* Sell Order */}
              <div className="border rounded-lg p-4 bg-red-50">
                <h3 className="text-lg font-medium mb-3 text-red-700">
                  Sell Order
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Trader Address
                    </label>
                    <input
                      type="text"
                      value={matchOrdersForm.sellOrderUser}
                      onChange={(e) =>
                        setMatchOrdersForm({
                          ...matchOrdersForm,
                          sellOrderUser: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                      placeholder="Seller Public Key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Token Market
                    </label>
                    <input
                      type="text"
                      value={matchOrdersForm.sellOrderTokenMarket}
                      onChange={(e) =>
                        setMatchOrdersForm({
                          ...matchOrdersForm,
                          sellOrderTokenMarket: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                      placeholder="Token Market Address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Collateral Token
                    </label>
                    <input
                      type="text"
                      value={matchOrdersForm.sellOrderCollateralToken}
                      onChange={(e) =>
                        setMatchOrdersForm({
                          ...matchOrdersForm,
                          sellOrderCollateralToken: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                      placeholder="Collateral Token Address (USDC)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={matchOrdersForm.sellOrderAmount}
                      onChange={(e) =>
                        setMatchOrdersForm({
                          ...matchOrdersForm,
                          sellOrderAmount: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                      placeholder="Amount to sell"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Price
                    </label>
                    <input
                      type="number"
                      value={matchOrdersForm.sellOrderPrice}
                      onChange={(e) =>
                        setMatchOrdersForm({
                          ...matchOrdersForm,
                          sellOrderPrice: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                      placeholder="Price per unit"
                    />
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleMatchOrders}
              disabled={isLoading || !isConnected}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-purple-600 transition-colors"
            >
              {isLoading ? "Matching..." : "Match Orders"}
            </button>
          </div>
        )}

        {/* Settle Trade Tab */}
        {activeTab === "settle" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Settle Trade
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Trade Record Address
                </label>
                <input
                  type="text"
                  value={settleTradeForm.tradeRecord}
                  onChange={(e) =>
                    setSettleTradeForm({
                      ...settleTradeForm,
                      tradeRecord: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Trade Record Public Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Signature (Optional)
                </label>
                <input
                  type="text"
                  value={settleTradeForm.signature}
                  onChange={(e) =>
                    setSettleTradeForm({
                      ...settleTradeForm,
                      signature: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Hex signature (optional)"
                />
              </div>
            </div>
            <button
              onClick={handleSettleTrade}
              disabled={
                isLoading || !isConnected || !settleTradeForm.tradeRecord
              }
              className="w-full bg-emerald-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-emerald-600 transition-colors"
            >
              {isLoading ? "Settling..." : "Settle Trade"}
            </button>
          </div>
        )}

        {/* Cancel Trade Tab */}
        {activeTab === "cancel" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Cancel Trade
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Trade Record Address
                </label>
                <input
                  type="text"
                  value={cancelTradeForm.tradeRecord}
                  onChange={(e) =>
                    setCancelTradeForm({
                      ...cancelTradeForm,
                      tradeRecord: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Trade Record Public Key"
                />
              </div>
            </div>
            <button
              onClick={handleCancelTrade}
              disabled={
                isLoading || !isConnected || !cancelTradeForm.tradeRecord
              }
              className="w-full bg-red-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-red-600 transition-colors"
            >
              {isLoading ? "Cancelling..." : "Cancel Trade"}
            </button>
          </div>
        )}
      </div>

      {/* Results Display */}
      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.type === "error"
              ? "bg-red-100 border border-red-200"
              : "bg-green-100 border border-green-200"
          }`}
        >
          {result.type === "error" ? (
            <div>
              <p className="text-red-800 font-semibold">❌ Error</p>
              <p className="text-red-700">{result.message}</p>
            </div>
          ) : (
            <div>
              <p className="text-green-800 font-semibold">
                ✅ Success - {result.type}
              </p>
              <div className="mt-2 text-green-700">
                {Object.entries(result.data).map(([key, value]) => (
                  <p key={key} className="break-all">
                    <span className="font-medium">{key}:</span>{" "}
                    {value as string}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
