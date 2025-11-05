"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useAccount,
  useWriteContract,
  useChainId,
  useReadContract,
} from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { makeBidHash, randomSalt } from "@/app/lib/hash";
import { parseEther, keccak256, encodePacked } from "viem";
import { upsertBid } from "@/app/lib/bids";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";
import AppNav from "@/components/AppNav";

export default function BiddingPage() {
  const params = useSearchParams();
  const router = useRouter();

  const domain = String(params.get("name") || "").trim().toLowerCase();
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();

  const [bidEth, setBidEth] = useState("0.05");
  const [salt, setSalt] = useState(randomSalt());
  const [msg, setMsg] = useState("");

  const { data: reservePrice } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "reservePrice",
  });

  const namehash = useMemo(
    () => keccak256(encodePacked(["string"], [domain])) as `0x${string}`,
    [domain]
  );

  async function commit() {
    try {
      if (!address) return setMsg("Please connect wallet first.");
      if (!reservePrice) return setMsg("Still loading reserve price…");

      const bidWei = parseEther(bidEth);
      const bidHash = makeBidHash(domain, bidWei, salt, address);
      const deposit = reservePrice as bigint;

      await writeContractAsync({
        address: CONTRACTS.auctionHouse.address,
        abi: CONTRACTS.auctionHouse.abi,
        functionName: "commitBidWithName",
        args: [domain, bidHash],
        value: deposit,
      });

      upsertBid(chainId, address, {
        domain,
        bidWei: bidWei.toString(),
        salt,
        revealed: false,
        ts: Date.now(),
      });

      setMsg("✅ Bid committed. Reveal during the reveal phase.");
      setSalt(randomSalt());
    } catch (err: any) {
      setMsg(err?.shortMessage || err?.message || "Commit failed.");
    }
  }

  return (
    <div className="flex justify-center pt-16 px-4">
      <div className="max-w-3xl w-full rounded-xl border shadow-md bg-[var(--background)]
        text-[var(--foreground)] p-10 space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push("/screens/active-auctions")}
            className="px-4 py-2 rounded-lg border border-[var(--border)]
            hover:bg-[var(--foreground)]/10 flex items-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-bold text-center">
          Commit Bid for <span className="text-blue-500">{domain}</span>
        </h1>

        <div className="space-y-4">
          <label className="text-sm opacity-70">Your Bid (ETH)</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={bidEth}
            onChange={(e) => setBidEth(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-[var(--border)]
            bg-[var(--card-bg)] focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            onClick={commit}
            disabled={!address || isPending}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
            transition disabled:opacity-40"
          >
            {isPending ? "Submitting..." : "Commit Sealed Bid"}
          </button>
        </div>

        {msg && (
          <p className="text-center text-sm opacity-80">{msg}</p>
        )}
      </div>
    </div>
  );
}
