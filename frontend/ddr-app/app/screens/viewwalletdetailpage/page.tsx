"use client";

import { useAccount, useBalance } from "wagmi";
import { Copy, Wallet, Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import NetworkSwitcher from "@/components/NetworkSwitcher";
import AppNav from "@/components/AppNav";
import toast from "react-hot-toast";
import { useEffect } from "react";

export default function ViewWalletDetailPage() {
  const router = useRouter();
  const { address, isConnected, status } = useAccount();
  const { data: balance } = useBalance({ address });

  const handleCopy = () => {
    if (!address) {
      toast.error("No address to copy!");
      return;
    }
    toast.success("Address copied to clipboard!");
    navigator.clipboard.writeText(address);
  };

  // ---------------- Redirect if Not Connected ----------------
  useEffect(() => {
    if (status === "connecting") return;

    if (!isConnected || !address) {
      router.replace("/screens/authpage");
    }
  }, [isConnected, status, address, router]);


  // Disable Back Button
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);
  

  return (
    <>
      <AppNav />
      <div className="flex justify-center pt-16 px-4">
        <div
          className="max-w-5xl w-full rounded-xl border shadow-md
          bg-[var(--background)] text-[var(--foreground)] p-10 space-y-10"
        >
          <h1 className="text-3xl font-extrabold text-center">
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
              className="text-sm border rounded-md px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-400 cursor-pointer transition-flex items-center"
            >
              <Copy className="w-4 h-4 inline-block mr-1" />
              Copy
            </button>
          </div>

          {/* Balance */}
          <div
            className="border rounded-lg p-5 flex items-center justify-between
              transition-all duration-200
              hover:shadow-md hover:-translate-y-[1px]
              hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <div className="flex items-center gap-4">

            {/* Balance Icon */}
            <div
              className="flex items-center justify-center w-14 h-14 rounded-full
              bg-black-800 dark:bg-white-500 border shadow-sm"
            >
              <Coins className="w-7 h-7 text-white-600 dark:text-black-800" />
            </div>

              <p className="text-sm opacity-60">Total Balance</p>
              <p className="text-2xl font-bold mt-2">
                {balance
                  ? `${balance.formatted} ${balance.symbol}`
                  : "Loading..."}
              </p>
            </div>

          </div>

          {/* Controls Row */}
          <div className="flex justify-center items-center gap-6">
            <span className="text-sm opacity-60">Select Network:</span>
            <NetworkSwitcher />
          </div>
        </div>
      </div>
    </>
  );
}
