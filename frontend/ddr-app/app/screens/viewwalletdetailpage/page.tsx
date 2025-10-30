"use client";

import { useAccount, useBalance } from "wagmi";
import { Copy, Wallet, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import NetworkSwitcher from "@/components/NetworkSwitcher";

export default function ViewWalletDetailPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="p-6 border rounded-lg shadow-md text-center w-full max-w-sm
          bg-[var(--background)] text-[var(--foreground)]">
          <p className="text-lg font-semibold">No wallet connected</p>
          <p className="text-sm opacity-70 mt-2">
            Please connect your wallet to view your wallet details.
          </p>
        </div>
      </div>
    );
  }

    return (
    <div className="flex flex-col items-center pt-16 px-4">

        {/* Back & Theme */}
        <div className="w-full max-w-3xl flex justify-between items-center mb-6">
        <button
            onClick={() => router.push("/screens/homepage")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)]
            hover:bg-gray-100 dark:hover:bg-gray-300 transition-colors cursor-pointer"
        >
            <ArrowLeft className="w-4 h-4" />
            Back
        </button>

        <ThemeToggle />
        </div>

        {/* Card Container */}
        <div
        className="max-w-3xl w-full rounded-xl shadow-lg border
        bg-[var(--background)] text-[var(--foreground)]
        transition-colors p-10 space-y-8"
        >
        <h1 className="text-center text-3xl font-bold">
            Wallet Details
        </h1>

        {/* Wallet Info */}
        <div
            className="border rounded-lg p-5 flex items-center justify-between
            transition-all duration-200
            hover:shadow-md hover:-translate-y-[1px]
            hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
            <div className="flex items-center gap-4">
            <Wallet className="w-8 h-8 opacity-80" />
            <div>
                <p className="text-sm opacity-60">Connected Wallet</p>
                <p className="font-semibold break-all text-sm sm:text-base">
                {address}
                </p>
            </div>
            </div>

            <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-md text-sm border transition-all duration-200
            hover:bg-gray-100 dark:hover:bg-gray-300 hover:shadow-sm active:scale-95 cursor-pointer"
            >
            <Copy className="w-4 h-4" />
            </button>
        </div>

        {/* Balance */}
        <div
            className="border rounded-lg p-6 text-center
            transition-all duration-200
            hover:shadow-md hover:-translate-y-[1px]
            hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
            <p className="text-sm opacity-60">Total Balance</p>
            <p className="text-2xl font-bold mt-2">
            {balance ? `${balance.formatted} ${balance.symbol}` : "Loading..."}
            </p>
        </div>

        {/* Controls Row */}
        <div className="flex justify-center items-center gap-6">
            <span className="text-sm opacity-60">Select Network:</span>
            <NetworkSwitcher />
        </div>
        </div>
    </div>
    );
}
