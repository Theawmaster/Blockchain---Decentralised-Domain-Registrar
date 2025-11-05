"use client";

import { useState, useEffect } from "react";
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

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => setMounted(true), []);

  // Wait until mounted to render client-dependent UI
  if (!mounted) return null;

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

      <div className="flex gap-4 text-sm">
        <NavLink href="/screens/viewavailabledomainpage" label="Register Domain" />
        <NavLink href="/screens/viewregistereddomainpage" label="Owned Domain" />
        <NavLink href="/screens/active-auctions" label="Auction List" />
        <NavLink href="/screens/viewwalletdetailpage" label="My Wallet" />
      </div>

      <div className="flex-1" />

      <NotificationBell />
      <ThemeToggle />

      {isConnected && (
        <button
          onClick={() => setOpen(!open)}
          className="
            px-3 py-1.5 rounded-lg border border-[var(--border)]
            bg-[var(--card-bg)] hover:bg-[var(--foreground)] hover:text-[var(--background)]
            transition
            font-mono text-xs cursor-pointer
          "
        >
          🪙 {masked} ⌄
        </button>
      )}

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
  onClick={() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(address!);
      alert("Address copied!");
    } else {
      console.warn("Clipboard API not available");
      alert("Clipboard not supported in this environment.");
    }
  }}
  className="hover:bg-[var(--foreground)] hover:text-[var(--background)] rounded px-3 py-2 text-left transition cursor-pointer"
>
  📋 Copy Address
</button>

            <button
              onClick={() => router.push("/screens/viewwalletdetailpage")}
              className="hover:bg-[var(--foreground)] hover:text-[var(--background)] rounded px-3 py-2 text-left transition cursor-pointer"
            >
              👛 Wallet Details
            </button>
            <button
              onClick={() => router.push("/screens/refund")}
              className="hover:bg-[var(--foreground)] hover:text-[var(--background)] rounded px-3 py-2 text-left transition cursor-pointer"
            >
              ♺ Refund
            </button>
            <button
              onClick={() => router.push("/screens/sendtodomain")}
              className="hover:bg-[var(--foreground)] hover:text-[var(--background)] rounded px-3 py-2 text-left transition cursor-pointer"
            >
              ✉️ Transfer Funds
            </button>
            <hr className="border-[var(--border)]" />
            <button
              onClick={() => {
                setOpen(false);
                setShowLogoutModal(true);
              }}
              className="hover:bg-red-600 hover:text-white rounded px-3 py-2 text-left transition cursor-pointer"
            >
              🚪 Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl p-6 w-[90%] max-w-sm text-center space-y-4"
            >
              <h2 className="text-lg font-semibold">Confirm Logout</h2>
              <p className="text-sm opacity-70">
                Are you sure you want to logout?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 rounded-md border border-[var(--border)] hover:bg-[var(--foreground)] hover:text-[var(--background)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    disconnect();
                    router.push("/screens/authpage");
                  }}
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </motion.div>
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
