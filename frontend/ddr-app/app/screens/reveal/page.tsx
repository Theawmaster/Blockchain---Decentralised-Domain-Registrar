"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { listBids, markRevealed } from "@/app/lib/bids";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked, formatEther } from "viem";

type AuctionInfo = [
  string,      // domain
  bigint,      // commitEnd
  bigint,      // revealEnd
  boolean,     // finalized
  `0x${string}`, // highestBidder
  bigint       // highestBid
];

export default function RevealPage() {
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
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">Click to confirm</h1>

      {pending.map((item) => (
        <div key={item.domain} className="border p-4 rounded space-y-2">
          <p className="font-medium">{item.domain}</p>
          <p>Your Bid: {formatEther(BigInt(item.bidWei))} ETH</p>
          <button
            onClick={() => reveal(item)}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Click to Reveal Bid
          </button>
        </div>
      ))}

      {pending.length === 0 && <p className="opacity-60">No bids currently revealable.</p>}
    </div>
  );
}
