"use client";

import { useEffect, useState } from "react";
import { useNotifications } from "@/app/context/NotificationContext";
import { Bell, X } from "lucide-react";
import { usePublicClient } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { useReadContract } from "wagmi";

const DELETED_KEY = "ddr-deleted-notifications"; // ✅ key for deleted messages

export default function NotificationBell() {
  const { notifications, remove, add } = useNotifications();
  const [open, setOpen] = useState(false);
  const publicClient = usePublicClient();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [auctionData, setAuctionData] = useState<any[]>([]);
  const [deletedMessages, setDeletedMessages] = useState<Set<string>>(new Set());

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

  // Handle notification updates
  useEffect(() => {
    if (auctionData.length === 0) return;

    auctionData.forEach((a) => {
      const phase = getPhase(a);
      const message = `Auction ${a.domain} is in ${phase} phase.`;

      // skip if user deleted this message
      if (deletedMessages.has(message)) return;

      // skip if already exists
      const exists = notifications.some((n) => n.message === message);
      if (!exists) add(message);
    });
  }, [now, auctionData, deletedMessages]);

  // Fetch full auction info
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

  // ✅ Keep localStorage in sync whenever deletedMessages changes
  useEffect(() => {
    if (deletedMessages.size !== 0){
      localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deletedMessages)));
    }
    
  }, [deletedMessages]);

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
  return (
    
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded hover:bg-[var(--foreground)]/10 transition"
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
                className="
                  px-4 py-3 border-b border-[var(--border)]
                  justify-between items-center gap-3
                "
              >
                <p className="flex-1 text-sm leading-snug break-words">
                  {n.message}
                </p>
                <button
                  onClick={() => {
                    const msg = n.message;
                    setDeletedMessages((prev) => new Set([...prev, msg])); // ✅ persist deletion
                    remove(index);
                  }}
                  className="
                    shrink-0 opacity-60 hover:opacity-100 transition p-1
                    hover:bg-[var(--foreground)]/10 rounded
                  "
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
