"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotifications } from "@/app/context/NotificationContext";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked, formatEther } from "viem";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";

/* ---------------- Small UI Components ---------------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold opacity-70">{title}</h3>
      <div className="rounded-lg border border-[var(--border)] p-4">{children}</div>
    </div>
  );
}

function Modal({ open, title, message, onClose }: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-xl shadow-xl w-[380px] p-6 space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="opacity-80 whitespace-pre-line">{message}</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white cursor-pointer">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function FinalizeAuctionPage() {
  const router = useRouter();
  const params = useSearchParams();
  const domain = (params.get("name") || "").toLowerCase().trim();
  const currentTime = Date.now();
  const namehash = useMemo(
    () => domain ? keccak256(encodePacked(["string"], [domain])) as `0x${string}` : undefined,
    [domain]
  );

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { notifications, remove, add } = useNotifications();
  const [gasEth, setGasEth] = useState("-");
  const [modal, setModal] = useState({ open: false, title: "", message: "", onClose: () => {} });

  /* ---- Read Auction Info ---- */
  const { data: info } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "getAuctionInfo",
    args: namehash ? [namehash] : undefined,
  });

  const { data: finalized } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "isFinalized",
    args: namehash ? [namehash] : undefined,
  });

  const commitEnd = info ? Number((info as any)[1]) : 0;
  const revealEnd = info ? Number((info as any)[2]) : 0;
  const highestBidder = info ? (info as any)[4] as `0x${string}` : undefined;
  const highestBid = info ? (info as any)[5] as bigint : 0n;

  const now = Math.floor(Date.now() / 1000);
  const phase = !commitEnd
    ? "Not Started"
    : now < commitEnd
    ? "Commit Phase"
    : now < revealEnd
    ? "Reveal Phase"
    : "Finalize Phase";

  const canFinalize = phase === "Finalize Phase" && !finalized;

  /* ---- Gas Estimate ---- */
  useEffect(() => {
    if (!publicClient || !domain) return;
    (async () => {
      try {
        const gas = await publicClient.estimateContractGas({
          address: CONTRACTS.auctionHouse.address,
          abi: CONTRACTS.auctionHouse.abi,
          functionName: "finalizeAuction",
          args: [domain],
          account: address,
        });
        const gasPrice = await publicClient.getGasPrice();
        setGasEth(formatEther(gas * gasPrice));
      } catch {
        setGasEth("-");
      }
    })();
  }, [publicClient, domain, address, finalized]);

  /* ---- Finalize ---- */
  async function finalizeAuction() {
    if (!canFinalize)
      return setModal({ open: true, title: "Not Allowed", message: "Reveal window must be over.", onClose: () => setModal({ ...modal, open: false }) });

    try {
      await writeContractAsync({
        address: CONTRACTS.auctionHouse.address,
        abi: CONTRACTS.auctionHouse.abi,
        functionName: "finalizeAuction",
        args: [domain],
      });

      const noWinner = highestBidder === "0x0000000000000000000000000000000000000000";


        // Show different modal based on result
        setModal({
            open: true,
            title: noWinner ? "No Valid Bids ⚠️" : "Auction Finalized ✅",
            message: noWinner
            ? `No bids were successfully revealed for "${domain}".\n\nThe domain remains unregistered and can be re-auctioned again.`
            : `The winner for "${domain}" has been registered.\nThey now own the .ntu domain.`,
            onClose: () => router.push("/screens/homepage"),
        });
      
    } catch (err: any) {
      setModal({
        open: true,
        title: "Transaction Failed ❌",
        message: err?.shortMessage || "Please try again.",
        onClose: () => setModal({ ...modal, open: false }),
      });
    }
  }

  /* Prevent user going back */

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
      <Modal open={modal.open} title={modal.title} message={modal.message} onClose={modal.onClose} />

      <div className="max-w-3xl w-full rounded-xl border shadow-md bg-[var(--background)] text-[var(--foreground)] p-8 space-y-8">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/screens/active-auctions")} className="px-4 py-2 rounded-lg border hover:bg-[var(--foreground)]/10 flex items-center gap-2 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-bold text-center">Finalize Auction</h1>
        <p className="text-center font-semibold text-lg">{domain}</p>

        <Section title="Auction Status">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="opacity-70">Phase</div><div>{phase}</div></div>
            <div><div className="opacity-70">Highest Bid</div><div>{formatEther(highestBid)} ETH</div></div>
            <div><div className="opacity-70">Highest Bidder</div><div className="break-all">{highestBidder || "—"}</div></div>
          </div>
        </Section>

        <div className="flex justify-center">
          <button
            onClick={finalizeAuction}
            disabled={!canFinalize || isPending}
            className="px-6 py-3 rounded-lg font-semibold text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition"
          >
            {isPending ? "Finalizing..." : finalized ? "Already Finalized" : "Finalize Auction"}
          </button>
        </div>

        <p className="text-center text-xs opacity-60">
          Finalizing registers ownership for the highest valid bidder.
        </p>
      </div>
    </div>
  );
}