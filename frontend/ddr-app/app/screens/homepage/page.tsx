"use client";

import { useAccount, useReadContract, usePublicClient } from "wagmi";
import AppNav from "@/components/AppNav";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked } from "viem";
import { useEffect, useState } from "react";
import { useNotifications } from "@/app/context/NotificationContext";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { add } = useNotifications();

  const { data: activeAuctions } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "getActiveAuctions",
  });

  const [notified, setNotified] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeAuctions || !Array.isArray(activeAuctions)) return;

    activeAuctions.forEach(async (name: string) => {
      const namehash = keccak256(encodePacked(["string"], [name]));
      const info = await readAuction(publicClient, namehash);
      if (!info) return;

      const { commitEnd, revealEnd, finalized, highestBidder } = info;
      const now = Math.floor(Date.now() / 1000);
      const key = namehash;

      // Commit phase nearly ending
      if (now < commitEnd && commitEnd - now <= 30 && !notified[key + "-commit"]) {
        add(`⏳ Commit phase for ${name} ending soon!`, "info");
        setNotified((p) => ({ ...p, [key + "-commit"]: true }));
      }

      // Reveal phase nearly ending
      if (now > commitEnd && now < revealEnd && revealEnd - now <= 30 && !notified[key + "-reveal"]) {
        add(`🕒 Reveal phase for ${name} ending soon!`, "info");
        setNotified((p) => ({ ...p, [key + "-reveal"]: true }));
      }

      // Needs finalize
      if (now > revealEnd && !finalized && !notified[key + "-finalize"]) {
        add(`✅ Finalization required for ${name}`, "warning");
        setNotified((p) => ({ ...p, [key + "-finalize"]: true }));
      }

      // Successfully finalized
      if (finalized && highestBidder !== "0x0000000000000000000000000000000000000000" && !notified[key + "-success"]) {
        add(`🎉 ${name} has been registered!`, "success");
        setNotified((p) => ({ ...p, [key + "-success"]: true }));
      }

      // Expired with no valid bids
      if (now > revealEnd && highestBidder === "0x0000000000000000000000000000000000000000" && !notified[key + "-expired"]) {
        add(`⚠️ ${name} expired with no valid bids`, "warning");
        setNotified((p) => ({ ...p, [key + "-expired"]: true }));
      }
    });
  }, [activeAuctions, notified, publicClient]);

  return (
    <>
      <AppNav />

      <div className="flex justify-center pt-20 px-4">
        <div className="max-w-4xl w-full text-center space-y-10">
          <h1 className="text-4xl font-extrabold">Decentralized Domain Registrar</h1>

          <p className="opacity-70 max-w-2xl mx-auto text-lg leading-relaxed">
            Register and own <strong>blockchain-native identities</strong>.
          </p>

          {isConnected ? (
            <div className="border rounded-xl p-5 inline-block bg-[var(--card-bg)] border-[var(--border)]">
              <p className="text-sm opacity-70 mb-1">Connected Wallet:</p>
              <p className="font-mono text-base break-all">{address}</p>
            </div>
          ) : (
            <p className="text-sm opacity-70">Connect your wallet to begin.</p>
          )}
        </div>
      </div>
    </>
  );
}

async function readAuction(publicClient: any, namehash: `0x${string}`) {
  try {
    const info = await publicClient.readContract({
      address: CONTRACTS.auctionHouse.address,
      abi: CONTRACTS.auctionHouse.abi,
      functionName: "getAuctionInfo",
      args: [namehash],
    });

    const [domain, commitEnd, revealEnd, finalized, highestBid, highestBidder] = info;
    return { domain, commitEnd, revealEnd, finalized, highestBid, highestBidder };
  } catch {
    return null;
  }
}
