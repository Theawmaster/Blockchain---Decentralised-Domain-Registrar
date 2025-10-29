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

  // ✅ reservePrice is returned as bigint by wagmi
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

      // ✅ ensure reservePrice is bigint
      const deposit = reservePrice as bigint;

      await writeContractAsync({
        address: CONTRACTS.auctionHouse.address,
        abi: CONTRACTS.auctionHouse.abi,
        functionName: "commitBidWithName",
        args: [domain, bidHash],
        value: deposit, // ✅ correct type, no parseEther needed
      });

      // ✅ Store for reveal page later
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
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">Commit Bid for: {domain}</h1>

      <label className="text-sm opacity-75">Your Bid (ETH)</label>
      <input
        type="number"
        min="0"
        step="0.001"
        value={bidEth}
        onChange={(e) => setBidEth(e.target.value)}
        className="border p-2 w-full rounded"
      />

      <button
        onClick={commit}
        disabled={!address || isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-40 w-full"
      >
        {isPending ? "Submitting..." : "Commit Sealed Bid"}
      </button>

      {msg && <p className="text-sm opacity-75">{msg}</p>}

      <button
        onClick={() => router.back()}
        className="text-sm text-center opacity-60 w-full"
      >
        Back
      </button>
    </div>
  );
}
