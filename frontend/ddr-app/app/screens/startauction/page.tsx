"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked, parseEther } from "viem";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";

/**
 * Normalize user input to <name>.ntu
 * Avoids doubling suffix and trims whitespace.
 */
function normalize(name: string) {
  let n = name.trim().toLowerCase();
  if (n.endsWith(".ntu")) return n;
  return n + ".ntu";
}

export default function StartAuctionPage() {
  const router = useRouter();
  const params = useSearchParams();

  const rawInput = params.get("name") || "";
  const domainParam = normalize(rawInput);
  const validDomain = domainParam.endsWith(".ntu");

  const namehash = keccak256(encodePacked(["string"], [domainParam]));
  const [deposit, setDeposit] = useState("");

  const { writeContractAsync, isPending } = useWriteContract();

  async function handleStartAuction() {
    if (!validDomain) {
      alert("❗ Only .ntu domains can be auctioned.");
      return;
    }

    const depositValue = Number(deposit);
    if (!deposit || depositValue <= 0) {
      alert("Please enter a valid positive deposit (ETH).");
      return;
    }

    try {

        const ZERO_SALT = "0x0000000000000000000000000000000000000000000000000000000000000000";

        const blindCommit = keccak256(
        encodePacked(["string", "uint256", "bytes32", "address"], [
            domainParam,
            BigInt(0),
            ZERO_SALT,
            CONTRACTS.auctionHouse.address,
        ])
        );

        await writeContractAsync({
        address: CONTRACTS.auctionHouse.address,
        abi: CONTRACTS.auctionHouse.abi,
        functionName: "commitBid",
        args: [namehash, blindCommit],
        value: parseEther(deposit),
        });
      
        alert(`✅ Auction started for ${domainParam}!`);
        router.push("/screens/active-auctions");

    } catch (err: any) {
      console.error(err);
      alert(err?.shortMessage || "❌ Transaction failed. Check console for details.");
    }
  }

  return (
    <div className="flex justify-center pt-16 px-4">
      <div className="max-w-3xl w-full rounded-xl border shadow-md
        bg-[var(--background)] text-[var(--foreground)]
        transition-colors p-10 space-y-8">

        {/* Header Controls */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-[var(--border)]
            hover:bg-[var(--foreground)]/10 transition flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-bold text-center">Start Auction</h1>
        <p className="text-center text-lg font-semibold">{domainParam}</p>

        {!validDomain && (
          <p className="text-red-500 text-center text-sm font-medium mt-1">
            ❗ Only .ntu domains are allowed.
          </p>
        )}

        <div className="space-y-3 text-center">
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="Enter starting deposit (ETH)"
            className="w-full max-w-xs mx-auto px-4 py-2 rounded-lg border
              border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)]
              focus:ring-2 focus:ring-sky-500 outline-none transition"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />

          <button
            onClick={handleStartAuction}
            disabled={isPending || !validDomain}
            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold
              disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isPending ? "Starting..." : "Start Auction"}
          </button>
        </div>

      </div>
    </div>
  );
}
