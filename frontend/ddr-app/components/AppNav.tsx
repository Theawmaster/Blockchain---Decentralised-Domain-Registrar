"use client";

import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";

export default function AppNav() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  const masked = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <nav
      className="
        w-full flex items-center gap-6 px-6 py-3
        border-b border-[var(--border)]
        bg-[var(--background)] text-[var(--foreground)]
        backdrop-blur-lg sticky top-0 z-50 transition-colors
      "
    >
      {/* Brand */}
      <Link href="/screens/homepage" className="font-bold text-lg">
        D-Domain
      </Link>

      {/* Nav Links */}
      <div className="flex gap-4 text-sm">
        <NavLink href="/screens/viewavailabledomainpage" label="Register" />
        <NavLink href="/screens/viewregistereddomainpage" label="Owned Domain" />
        <NavLink href="/screens/active-auctions" label="Auction List" />
        <NavLink href="/screens/viewwalletdetailpage" label="My Wallet" />
      </div>

      {/* Push right */}
      <div className="flex-1" />

      {/* Notification */}
      {/* <div className="flex-1" />
      <NotificationBell /> */}

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Wallet Badge */}
      {isConnected && (
        <button
          onClick={() => setOpen(!open)}
          className="
            px-3 py-1.5 rounded-lg border border-[var(--border)]
            bg-[var(--card-bg)] hover:bg-[var(--foreground)] hover:text-[var(--background)]
            transition
            font-mono text-xs
          "
        >
          🪙 {masked} ⌄
        </button>
      )}

      {/* Wallet Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="
              absolute right-6 top-14
              bg-[var(--card-bg)] border border-[var(--border)]
              rounded-lg shadow-xl p-3 text-sm flex flex-col gap-2
              w-48 z-50
            "
          >
            <button
              className="hover:bg-[var(--foreground)] hover:text-[var(--background)] rounded px-3 py-2 text-left transition"
              onClick={() => navigator.clipboard.writeText(address!)}
            >
              📋 Copy Address
            </button>

            <button
              className="hover:bg-[var(--foreground)] hover:text-[var(--background)] rounded px-3 py-2 text-left transition"
              onClick={() => router.push("/screens/viewwalletdetailpage")}
            >
              👛 Wallet Details
            </button>

            <hr className="border-[var(--border)]" />

            <button
              className="hover:bg-red-600 hover:text-white rounded px-3 py-2 text-left transition"
              onClick={() => {
                setOpen(false);
                disconnect();
                router.push("/screens/authpage");
              }}
            >
              🚪 Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="
        px-3 py-1.5 rounded-md border border-transparent
        hover:border-[var(--border)]
        hover:bg-[var(--foreground)] hover:text-[var(--background)]
        transition
      "
    >
      {label}
    </Link>
  );
}
