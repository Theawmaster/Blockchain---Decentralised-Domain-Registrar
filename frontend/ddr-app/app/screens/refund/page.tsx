"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { listBids } from "@/app/lib/bids";
import { keccak256, encodePacked, formatEther } from "viem";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";

export default function RefundPage() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const router = useRouter();
  const { writeContractAsync } = useWriteContract();

  const [refunds, setRefunds] = useState<any[]>([]);

    // ---------------- Redirect if Not Connected ----------------
    useEffect(() => {
    // Wait until wagmi finishes determining connection status
    if (status === "connecting") return;

    if (!isConnected || !address) {
        router.push("/screens/authpage");
    }
    }, [isConnected, status, address, router]);

    // ---------------- Prevent Back Navigation ----------------
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    if (!address || !publicClient) return; // ✅ prevent undefined crash

    (async () => {
      const stored = listBids(chainId, address);
      const out = [];

      for (let item of stored) {
        const namehash = keccak256(encodePacked(["string"], [item.domain]));

        const [finalized, deposit] = await Promise.all([
        publicClient.readContract({
            address: CONTRACTS.auctionHouse.address,
            abi: CONTRACTS.auctionHouse.abi,
            functionName: "isFinalized",
            args: [namehash],
        }) as Promise<boolean>,
        publicClient.readContract({
            address: CONTRACTS.auctionHouse.address,
            abi: CONTRACTS.auctionHouse.abi,
            functionName: "getDeposit",
            args: [namehash, address],
        }) as Promise<bigint>,
        ]);

        if (finalized && deposit > 0n) {
          out.push({ domain: item.domain, namehash, deposit });
        }
      }

      setRefunds(out);
    })();
  }, [address, chainId, publicClient]);

  async function handleWithdraw(r: any) {
    await writeContractAsync({
      address: CONTRACTS.auctionHouse.address,
      abi: CONTRACTS.auctionHouse.abi,
      functionName: "withdraw",
      args: [r.namehash],
    });

    toast.success(`Refunded ${formatEther(r.deposit)} ETH`);
    setRefunds((x) => x.filter((i) => i.namehash !== r.namehash));
  }

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
    <AppNav/>
    <div className="flex justify-center pt-16 px-4">
      <div className="max-w-xl w-full rounded-xl border bg-[var(--background)] text-[var(--foreground)] shadow-md p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">Withdraw Refunds</h1>

        {refunds.length === 0 ? (
          <p className="text-center opacity-60">No refundable deposits.</p>
        ) : (
          refunds.map((r) => (
            <div key={r.domain} className="border px-4 py-3 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.domain}</p>
                <p className="text-sm opacity-70">{formatEther(r.deposit)} ETH</p>
              </div>
              <button
                onClick={() => handleWithdraw(r)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Withdraw
              </button>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
}
