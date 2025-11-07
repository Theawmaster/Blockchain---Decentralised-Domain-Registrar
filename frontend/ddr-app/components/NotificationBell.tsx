"use client";

import { useEffect, useState, useRef } from "react";
import { useNotifications } from "@/app/context/NotificationContext";
import { Bell, X } from "lucide-react";
import { useChainId, useAccount, usePublicClient, useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { listBids } from "@/app/lib/bids";
import { keccak256, encodePacked, formatEther } from "viem";

const DELETED_KEY = "ddr-deleted-notifications";
const ALL_HASHES_KEY = "ddr-all-hashes";

export default function NotificationBell() {
  const { notifications, remove, add } = useNotifications();
  const [open, setOpen] = useState(false);
  const publicClient = usePublicClient();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [auctionData, setAuctionData] = useState<any[]>([]);
  const [deletedMessages, setDeletedMessages] = useState<Set<string>>(new Set());
  const [refunds, setRefunds] = useState<any[]>([]);
  const chainId = useChainId();
  const { address } = useAccount();
  const currentTime = Date.now();
  const allHashes = useRef<Record<string, string>>({});

  /* -------------------- Helpers -------------------- */
  function formatDateTime(timestamp: any) {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

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

  function timeLeft(a: any) {
    if (now < a.commitEnd) return formatSeconds(a.commitEnd - now);
    if (now < a.revealEnd) return formatSeconds(a.revealEnd - now);
    return "—";
  }

  /* -------------------- Initialization -------------------- */
  useEffect(() => {
    const saved = localStorage.getItem(DELETED_KEY);
    if (saved) setDeletedMessages(new Set(JSON.parse(saved)));
  }, []);

  useEffect(() => {
  const saved = localStorage.getItem(ALL_HASHES_KEY);
  if (saved) {
    allHashes.current = JSON.parse(saved);
  }
}, []);

  // Live clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch active auctions
  const { data: hashes } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "getActiveAuctions",
     query: {
    refetchInterval: 2000, // auto-refresh every 10s
  },
  });

  /* -------------------- Auction Data -------------------- */
  useEffect(() => {
  async function load() {
    if (!publicClient || !hashes || !Array.isArray(hashes)) return;

    let updated = false;

    const result = await Promise.all(
      hashes.map(async (h: `0x${string}`) => {
        const info = await publicClient.readContract({
          address: CONTRACTS.auctionHouse.address,
          abi: CONTRACTS.auctionHouse.abi,
          functionName: "getAuctionInfo",
          args: [h],
        });

        const [domain, commitEnd, revealEnd, finalized, highestBidder, highestBid] =
          info as [string, bigint, bigint, boolean, string, bigint];

        // store hash → domain mapping
        if (!(h in allHashes.current)) {
          allHashes.current[h] = domain;
          updated = true;
        }

        return {
          namehash: h,
          domain,
          commitEnd: Number(commitEnd),
          revealEnd: Number(revealEnd),
          finalized: Boolean(finalized),
          highestBidder: String(highestBidder),
          highestBid: Number(highestBid),
        };
      })
    );

    if (updated) {
      localStorage.setItem(ALL_HASHES_KEY, JSON.stringify(allHashes.current));
    }

    setAuctionData(result);
  }

  load();
}, [hashes, publicClient]);


  /* -------------------- Refund Data -------------------- */
  useEffect(() => {
    if (!address || !publicClient) return;

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

        if (finalized && deposit > 0n) out.push({ domain: item.domain, namehash, deposit });
      }

      setRefunds(out);
    })();
  }, [address, chainId, publicClient]);

  /* -------------------- Notifications -------------------- */
  useEffect(() => {
    const deletedArray = Array.from(deletedMessages);

    // --- Missing hashes handling ---
    const auctionHashes = new Set(auctionData.map((a) => a.namehash));
    const missingHashes = Object.keys(allHashes.current).filter((h) => !auctionHashes.has(h));

    if (missingHashes.length > 0 && publicClient) {
      (async () => {
        for (let h of missingHashes) {
          try {
            const highestBid = await publicClient.readContract({
              address: CONTRACTS.auctionHouse.address,
              abi: CONTRACTS.auctionHouse.abi,
              functionName: "getHighestBid",
              args: [h],
            }) as bigint;
            

            const message = highestBid > 0n
              ? `✅ ${allHashes.current[h]} has been successfully bid!`
              : `⚠️ ${allHashes.current[h]} is not registered successfully due to no bids.`;
           
            if (deletedArray.some((msg) => msg.startsWith(message))) continue;
            if (notifications.some((n) => n.message.startsWith(message))) continue;

            add(`${message} ${formatDateTime(Date.now())}`, highestBid > 0n ? "success" : "warning");
          } catch (err) {
            
          }
        }
      })();
    }

    // // --- Existing auction notifications ---
    // if (auctionData.length > 0) {
    //   auctionData.forEach((a) => {
    //     if (!a.finalized) return;

    //     const hasWinner =
    //       a.highestBidder && a.highestBidder !== "0x0000000000000000000000000000000000000000";
    //     const message = hasWinner
    //       ? `✅ ${a.domain} has been successfully bid!`
    //       : `⚠️ ${a.domain} is not registered successfully due to no bids.`;

    //     if (deletedArray.some((msg) => msg.startsWith(message))) return;
    //     if (notifications.some((n) => n.message.startsWith(message))) return;

    //     add(`${message} ${formatDateTime(Date.now())}`, hasWinner ? "success" : "warning");
    //   });
    // }

    // --- Auction phase notifications ---
    if (auctionData.length > 0) {
      auctionData.forEach((a) => {
        const phase = getPhase(a);
        let message = `Auction ${a.domain} is in ${phase} phase.`;

        if (now < a.commitEnd && a.commitEnd - now <= 30 && phase === "Commit") {
          message = `⏳ Commit phase for ${a.domain} ending soon!`;
        }
        else if(phase === "Commit"){
          message = `Commit phase for ${a.domain} has started`; 
        }
        else if (a.revealEnd - now <= 30 && phase === "Reveal") {
          message = `🕒 Reveal phase for ${a.domain} ending soon!`;
        } 
        else if(phase === "Reveal"){
          message = `Reveal phase for ${a.domain} has started`; 
        }        
        else if (now > a.revealEnd && phase === "Finalize" && !a.finalized) {
          message = `✅ Finalization required for ${a.domain}`;
        }

        if (deletedArray.some((msg) => msg.startsWith(message))) return;
        if (notifications.some((n) => n.message.startsWith(message))) return;

        if (message.includes("⏳") || message.includes("🕒") || message.includes("✅")) {
          const type = message.includes("✅") ? "warning" : "info";
          add(`${message} ${formatDateTime(currentTime)}`, type);
        }
      });
    }

    // --- Refund notifications ---
    if (refunds.length > 0) {
      refunds.forEach((r) => {
        const message = `💰 Refund available for ${r.domain}: ${formatEther(r.deposit)} ETH`;
        if (deletedArray.some((msg) => msg.startsWith(message))) return;
        if (notifications.some((n) => n.message.startsWith(message))) return;

        add(`${message} ${formatDateTime(currentTime)}`, "success");
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    now,
    JSON.stringify(
      auctionData.map((a) => ({
        ...a,
        commitEnd: Number(a.commitEnd),
        revealEnd: Number(a.revealEnd),
        highestBid: Number(a.highestBid),
        finalized: a.finalized,
        highestBidder: a.highestBidder,
      }))
    ),
    JSON.stringify(
      refunds.map((r) => ({
        ...r,
        deposit: r.deposit.toString(),
      }))
    ),
    Array.from(deletedMessages).join("|"),
    notifications.length,
  ]);

  /* -------------------- LocalStorage Sync -------------------- */
  useEffect(() => {
    if (deletedMessages.size !== 0) {
      localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deletedMessages)));
    }
  }, [deletedMessages]);

  /* -------------------- UI -------------------- */
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded hover:bg-[var(--foreground)]/25 transition cursor-pointer"
      >
        <Bell className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 z-50 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm opacity-60 text-center">No Notifications 🔕</p>
          ) : (
            notifications.map((n, index) => (
              <div key={index} className="px-4 py-3 border-b border-[var(--border)] flex flex-col items-end gap-1">
                <p className="text-sm leading-snug break-words text-left w-full">
                  {n.message.replace(/\s\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}$/, "")}
                </p>
                <div className="flex items-center justify-between w-full">
                  <p className="text-xs">{n.message.match(/\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}$/)?.[0] || "—"}</p>
                  <button
                    onClick={() => {
                      const msg = n.message;
                      setDeletedMessages((prev) => new Set([...prev, msg]));
                      remove(index);
                    }}
                    className="opacity-60 hover:opacity-100 transition p-1 hover:bg-[var(--foreground)]/10 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
