"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";

/* Modal Component */
function AppModal({ open, title, message, onClose }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)]
        rounded-xl shadow-xl p-6 w-[320px] text-center space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="opacity-80">{message}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white transition cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
}

/* Normalize Domain */
const normalize = (name: string) =>
  name.trim().toLowerCase().endsWith(".ntu")
    ? name.trim().toLowerCase()
    : `${name.trim().toLowerCase()}.ntu`;

export default function StartAuctionPage() {
  const router = useRouter();
  const params = useSearchParams();
  const domain = normalize(params.get("name") || "");

  const { address, isConnected, status } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [modal, setModal] = useState({
    open: false,
    title: "",
    message: "",
    onClose: () => {},
  });

  const showModal = (title: string, message: string, onClose?: () => void) =>
    setModal({
      open: true,
      title,
      message,
      onClose: onClose ?? (() => setModal((m) => ({ ...m, open: false }))),
    });

  async function handleStartAuction() {
    if (!address)
      return showModal("Wallet Required", "Please connect your wallet first.");

    try {
      await writeContractAsync({
        address: CONTRACTS.auctionHouse.address,
        abi: CONTRACTS.auctionHouse.abi,
        functionName: "startAuction",
        args: [domain],
      });

      showModal(
        "Auction Started ✅",
        `The auction for ${domain} has begun.`,
        () => router.push("/screens/homepage")
      );
    } catch (err: any) {
      showModal("Transaction Failed ❌", err?.shortMessage || "Please try again.");
    }
  }

    // ---------------- Redirect if Not Connected ----------------
    useEffect(() => {
    // Wait until wagmi finishes determining connection status
    if (status === "connecting") return;

    if (!isConnected || !address) {
      router.push("/screens/authpage");
    }
  }, [isConnected, status, address, router]);

    // Prevent Back Navigation
    useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  return (
    <div className="flex justify-center pt-16 px-4">
      <AppModal {...modal} />

      <div className="max-w-3xl w-full rounded-xl border shadow-md bg-[var(--background)]
        text-[var(--foreground)] p-10 space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push("/screens/active-auctions")}
            className="px-4 py-2 rounded-lg border border-[var(--border)]
            hover:bg-[var(--foreground)]/25 flex items-center gap-2 cursor-pointer transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-bold text-center">Start Auction</h1>
        <p className="text-center text-lg font-semibold">{domain}</p>

        <div className="flex justify-center pt-8">
          <button
            onClick={handleStartAuction}
            disabled={isPending}
            className="px-6 py-3 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-700
              disabled:opacity-40 transition cursor-pointer"
          >
            {isPending ? "Starting..." : "Start Auction"}
          </button>
        </div>
      </div>
    </div>
  );
}
