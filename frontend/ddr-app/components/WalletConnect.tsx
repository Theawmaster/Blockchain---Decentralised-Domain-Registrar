"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function WalletConnect({ onAddWallet }: { onAddWallet: (address: string) => void }) {
  const { connectAsync, connectors, reset, error, status } = useConnect();
  const { disconnect } = useDisconnect();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      disconnect(); // Clear any existing session
      const connector = connectors[0]; // Use first available connector (MetaMask)
      const data = await connectAsync({ connector });
      onAddWallet(data?.accounts?.[0]);
    } catch (err) {
      console.error("Failed to connect:", err);
      reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        max-w-xl w-full mx-auto mt-16 p-6 rounded-2xl shadow-lg 
        bg-[var(--background)] text-[var(--foreground)]
        border border-gray-300 dark:border-gray-700
        transition-colors
      "
    >
      <h2 className="text-3xl font-extrabold mb-4 text-center">
        Login
      </h2>

      <div className="text-center">
        <button
          onClick={handleConnect}
          disabled={loading}
          className="
            cursor-pointer font-medium px-6 py-3 rounded-xl shadow-md
            bg-green-600 hover:bg-green-700 
            dark:bg-green-500 dark:hover:bg-green-400
            text-white 
            transition-transform transition-colors
            hover:scale-[1.03] active:scale-[0.97]
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {loading ? "Connecting..." : "Connect Using MetaMask"}
        </button>

        {error && (
          <p className="text-red-500 mt-3 text-sm opacity-90">
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
}
