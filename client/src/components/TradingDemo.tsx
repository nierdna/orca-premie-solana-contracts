"use client";

import { useTrading } from "@/hooks/useTrading";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
// import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from "react";

export function TradingDemo() {
  const { createMarket, isConnected } = useTrading();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCreateMarket = async () => {
    setIsLoading(true);
    try {
      const result = await createMarket({
        symbol: "DEMO",
        name: "Demo Token Market",
        settleTimeLimit: 86400,
      });
      setResult({
        tokenMarket: result.tokenMarket.toString(),
        symbol: result.symbol.toString(),
        name: result.name.toString(),
        signature: result.signature.toString(),
        fee: result.fee?.toString() || "0",
      });
      console.log("Market created:", result);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Orca Trading Demo</h1>

      <div className="mb-6">
        <WalletMultiButton />
        {/* <button className="bg-purple-500 text-white px-4 py-2 rounded">
          Connect Wallet (Placeholder)
        </button> */}
      </div>

      {/* Mock connected state for demo */}
      <div className="space-y-4">
        <button
          onClick={handleCreateMarket}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? "Creating..." : "Create Token Market"}
        </button>

        {result && (
          <div className="bg-green-100 p-4 rounded">
            <p className="text-green-800">Market Created!</p>
            <p className="text-green-700">Address: {result.tokenMarket}</p>
            <p className="text-green-700">Symbol: {result.symbol}</p>
            <p className="text-green-700">Name: {result.name}</p>
            <p className="text-green-700">Signature: {result.signature}</p>
            <p className="text-green-700">Fee: {result.fee}</p>
          </div>
        )}
      </div>
    </div>
  );
}
