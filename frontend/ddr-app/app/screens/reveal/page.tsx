"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { listBids, markRevealed } from "@/app/lib/bids";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked, formatEther } from "viem";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";
import AppNav from "@/components/AppNav";

type AuctionInfo = [
  string,
  bigint,
  bigint,
  boolean,
  `0x${string}`,
  bigint
];

export default function RevealPage() {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient()!;
  const { writeContractAsync } = useWriteContract();

  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    if (!address) return;

    (async () => {
      const stored = listBids(chainId, address).filter((x) => !x.revealed);
      const now = Math.floor(Date.now() / 1000);
      const ready: any[] = [];

      for (let item of stored) {
        const namehash = keccak256(encodePacked(["string"], [item.domain])) as `0x${string}`;

        const info = await publicClient.readContract({
          address: CONTRACTS.auctionHouse.address,
          abi: CONTRACTS.auctionHouse.abi,
          functionName: "getAuctionInfo",
          args: [namehash],
        }) as AuctionInfo;

        const commitEnd = Number(info[1]);
        const revealEnd = Number(info[2]);
        const canReveal = now > commitEnd && now < revealEnd;

        if (canReveal) ready.push(item);
      }
      setPending(ready);
    })();
  }, [address, chainId, publicClient]);

  async function reveal(item: any) {
    await writeContractAsync({
      address: CONTRACTS.auctionHouse.address,
      abi: CONTRACTS.auctionHouse.abi,
      functionName: "revealBid",
      args: [item.domain, BigInt(item.bidWei), item.salt],
    });

    markRevealed(chainId, address!, item.domain);
    setPending((p) => p.filter((x) => x.domain !== item.domain));
  }

  return (
    <>
      <AppNav/>
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
          </div>

          <h1 className="text-2xl font-bold text-center">Reveal Your Bid</h1>

          {pending.length === 0 && (
            <p className="opacity-60 text-center">No bids available to reveal.</p>
          )}

          <div className="space-y-4">
            {pending.map((item) => (
              <div key={item.domain} className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card-bg)]">
                <p className="font-semibold">{item.domain}</p>
                <p className="text-sm opacity-70">Your Bid: {formatEther(BigInt(item.bidWei))} ETH</p>

                <button
                  onClick={() => reveal(item)}
                  className="mt-3 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition cursor-pointer"
                >
                  Reveal Bid
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
