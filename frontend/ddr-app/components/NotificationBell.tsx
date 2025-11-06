"use client";

import { useEffect, useState, useRef } from "react";
import { useNotifications } from "@/app/context/NotificationContext";
import { Bell, X } from "lucide-react";
import { useChainId, useAccount, usePublicClient, useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { listBids } from "@/app/lib/bids";
import { keccak256, encodePacked, formatEther } from "viem";

const DELETED_KEY = "ddr-deleted-notifications"; // ✅ key for deleted messages

export default function NotificationBell() {
  const { notifications, remove, add } = useNotifications();
  const [open, setOpen] = useState(false);
  const publicClient = usePublicClient();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [auctionData, setAuctionData] = useState<any[]>([]);
  const [deletedMessages, setDeletedMessages] = useState<Set<string>>(new Set());
  const [refunds, setRefunds] = useState<any[]>([]);
  const shownAlerts = useRef(new Set());
  const chainId = useChainId();
  const { address } = useAccount();

  const currentTime = Date.now();

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

  // ✅ Restore deleted messages from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DELETED_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setDeletedMessages(new Set(parsed));
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
  });

  /* -------------------- Auction Data -------------------- */
  useEffect(() => {
    async function load() {
      if (!publicClient || !hashes || !Array.isArray(hashes)) return;

      const result = await Promise.all(
        hashes.map(async (h: `0x${string}`) => {
          const info = await publicClient.readContract({
            address: CONTRACTS.auctionHouse.address,
            abi: CONTRACTS.auctionHouse.abi,
            functionName: "getAuctionInfo",
            args: [h],
          });

          const [
            domain,
            commitEnd,
            revealEnd,
            finalized,
            highestBidder,
            highestBid,
          ] = info as [string, bigint, bigint, boolean, string, bigint];

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

        if (finalized && deposit > 0n) {
          out.push({ domain: item.domain, namehash, deposit });
        }
      }

      setRefunds(out);
    })();
  }, [address, chainId, publicClient]);

  /* -------------------- Notifications (Auctions + Refunds) -------------------- */
  useEffect(() => {
    // --- Auction notifications ---
    if (auctionData.length > 0) {
      auctionData.forEach((a) => {
        const phase = getPhase(a);
        let message = `Auction ${a.domain} is in ${phase} phase.`;

        if (now < a.commitEnd && a.commitEnd - now <= 30 && phase === "Commit") {
          message = `⏳ Commit phase for ${a.domain} ending soon!`;
        } else if (a.revealEnd - now <= 30 && phase === "Reveal") {
          message = `🕒 Reveal phase for ${a.domain} ending soon!`;
        } else if (now > a.revealEnd && phase === "Finalize" && !a.finalized) {
          message = `✅ Finalization required for ${a.domain}`;
        }

        const deletedArray = Array.from(deletedMessages);
        const deleted = deletedArray.some((msg) => msg.startsWith(message));
        if (deleted) return;

        const exists = notifications.some((n) => n.message.startsWith(message));
        if (exists) return;

        if (
          message.includes("⏳") ||
          message.includes("🕒") ||
          message.includes("✅")
        ) {
          const type = message.includes("✅") ? "warning" : "info";
          const fullMessage = `${message} ${formatDateTime(
            currentTime
          ).toLocaleString()}`;
          add(fullMessage, type);
        }
      });
    }

    // --- Refund notifications ---
    if (refunds.length > 0) {
      const deletedArray = Array.from(deletedMessages);
      refunds.forEach((r) => {
        const message = `💰 Refund available for ${r.domain}: ${formatEther(
          r.deposit
        )} ETH`;

        const deleted = deletedArray.some((msg) => msg.startsWith(message));
        if (deleted) return;

        const exists = notifications.some((n) => n.message.startsWith(message));
        if (exists) return;

        const fullMessage = `${message} ${formatDateTime(
          currentTime
        ).toLocaleString()}`;
        add(fullMessage, "success");
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
      {/* Bell Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded hover:bg-[var(--foreground)]/25 transition cursor-pointer"
      >
        <Bell className="w-6 h-6" />
        {notifications.length > 0 && (
          <span
            className="
              absolute -top-1 -right-1 
              bg-red-500 text-white text-xs
              px-1.5 py-0.5 rounded-full
            "
          >
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute right-0 mt-2 w-72 z-50
            bg-[var(--card-bg)] border border-[var(--border)]
            rounded-lg shadow-lg overflow-hidden
          "
        >
          {notifications.length === 0 ? (
            <p className="p-4 text-sm opacity-60 text-center">
              No Notifications 🔕
            </p>
          ) : (
            notifications.map((n, index) => (
              <div
                key={index}
                className="px-4 py-3 border-b border-[var(--border)] flex flex-col items-end gap-1"
              >
                <p className="text-sm leading-snug break-words text-left w-full">
                  {n.message.replace(
                    /\s\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}$/,
                    ""
                  )}
                </p>
                <div className="flex items-center justify-between w-full">
                  <p className="text-xs">
                    {n.message.match(
                      /\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}$/
                    )?.[0] || "—"}
                  </p>
                  <button
                    onClick={() => {
                      const msg = n.message;
                      setDeletedMessages((prev) => new Set([...prev, msg]));
                      remove(index);
                    }}
                    className="
                      opacity-60 hover:opacity-100 transition p-1
                      hover:bg-[var(--foreground)]/10 rounded
                    "
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
