"use client";

import { useRouter } from "next/navigation";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";

export default function ActiveAuctionsPage() {
  const router = useRouter();
  const publicClient = usePublicClient();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [auctionData, setAuctionData] = useState<any[]>([]);

  // live ticking clock
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // fetch active namehashes
  const { data: hashes, isLoading } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "getActiveAuctions",
  });

  // fetch full domain/timing info for each active hash
    useEffect(() => {
    async function load() {
        if (!publicClient) return;       // ✅ prevents undefined error
        if (!hashes || !Array.isArray(hashes)) return;

        const result = await Promise.all(
        hashes.map(async (h: `0x${string}`) => {
            const info = await publicClient.readContract({
            address: CONTRACTS.auctionHouse.address,
            abi: CONTRACTS.auctionHouse.abi,
            functionName: "getAuctionInfo",
            args: [h],
            });

            const [domain, commitEnd, revealEnd] = info as [string, bigint, bigint];

            return {
            namehash: h,
            domain,
            commitEnd: Number(commitEnd),
            revealEnd: Number(revealEnd),
            };
        })
        );

        setAuctionData(result);
    }

    load();
    }, [hashes, publicClient]);


  function formatSeconds(s: number): string {
    if (s <= 0) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function getPhase(a: any) {
    if (now < a.commitEnd) return "Commit";
    if (now < a.revealEnd) return "Reveal";
    return "Finalize";
  }

    function getButtonText(phase: string) {
        switch (phase) {
        case "Commit":
            return "Commit Bid";
        case "Reveal":
            return "Reveal Bid";
        default:
            return "Finalize Auction";
        }
    }


  function timeLeft(a: any) {
    if (now < a.commitEnd) return formatSeconds(a.commitEnd - now);
    if (now < a.revealEnd) return formatSeconds(a.revealEnd - now);
    return "—";
  }

    function handleClick(a: any) {
        const phase = getPhase(a);

        if (phase === "Commit") {
            router.push(`/screens/biddingpage?name=${encodeURIComponent(a.domain)}`);
        } else if (phase === "Reveal") {
            router.push(`/screens/reveal?name=${encodeURIComponent(a.domain)}`);
        } else {
            router.push(`/screens/finalizeauction?name=${encodeURIComponent(a.domain)}`);
        }
    }


  return (
    <div className="flex justify-center pt-16 px-4">
      <div className="max-w-5xl w-full rounded-xl border shadow-md p-10 space-y-10
        bg-[var(--background)] text-[var(--foreground)]">

        {/* Header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-[var(--border)]
            hover:bg-[var(--foreground)]/10 transition flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <ThemeToggle />
        </div>

        <h1 className="text-3xl font-extrabold text-center">Active Auctions</h1>

        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--card-bg)]">
              <tr className="border-b border-[var(--border)]">
                <th className="px-5 py-3 text-left font-semibold">Domain</th>
                <th className="px-5 py-3 text-left font-semibold">Phase</th>
                <th className="px-5 py-3 text-left font-semibold">Time Left</th>
                <th className="px-5 py-3 text-right font-semibold"></th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-6 opacity-60">Loading...</td></tr>
              ) : auctionData.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 opacity-60">No live auctions.</td></tr>
              ) : (
                auctionData.map((a, i) => {
                  const phase = getPhase(a);
                  return (
                    <tr key={i} className="border-b border-[var(--border)]">
                      <td className="px-5 py-3 font-medium">{a.domain}</td>
                      <td className="px-5 py-3">{phase}</td>
                      <td className="px-5 py-3">{timeLeft(a)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleClick(a)}
                          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800
                          text-white transition cursor-pointer"
                        >
                          {getButtonText(phase)}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>

      </div>
    </div>
  );
}
