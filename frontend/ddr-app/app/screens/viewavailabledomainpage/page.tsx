"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function ViewAvailableDomainPage() {
  const router = useRouter();
  const [newDomain, setNewDomain] = useState("");
  const [search, setSearch] = useState("");

  // Load registered domain names
  const { data: names, isLoading } = useReadContract({
    address: CONTRACTS.registry.address,
    abi: CONTRACTS.registry.abi,
    functionName: "getAllNames",
  });

  const domains = Array.isArray(names) ? names : [];

  // Search filter
  const filtered = domains.filter((name: string) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  function validateDomain(input: string) {
    return input.trim().toLowerCase().endsWith(".ntu");
  }

  function handleStart() {
    if (!validateDomain(newDomain)) {
      alert("Please enter a valid domain ending with .ntu");
      return;
    }

    // Send exactly what user typed
    router.push(`/screens/startauction?name=${encodeURIComponent(newDomain.trim().toLowerCase())}`);
  }

  return (
    <div className="flex justify-center pt-16 px-4">
      <div className="max-w-5xl w-full rounded-xl border shadow-md
        bg-[var(--background)] text-[var(--foreground)]
        transition-colors p-10 space-y-10">

        <h1 className="text-3xl font-extrabold text-center">Domain Auctions</h1>

        {/* Back + Theme */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-[var(--border)]
            hover:bg-[var(--foreground)]/10 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <ThemeToggle />
        </div>

        {/* Start New Auction */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Start a New Domain Auction</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter new domain (e.g., ivan.ntu)"
              className="w-full max-w-md px-4 py-2 rounded-lg border border-[var(--border)]
              bg-[var(--card-bg)] text-[var(--foreground)] focus:ring-2 focus:ring-gray-500"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
            <button
              onClick={handleStart}
              disabled={!newDomain.trim()}
              className="px-5 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700
              disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Start Auction
            </button>
          </div>
        </div>

        <hr className="border-[var(--border)]" />

        {/* Search */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Search Existing Domains</h2>
          <input
            type="text"
            placeholder="Search domain name..."
            className="w-full max-w-md mx-auto px-4 py-2 rounded-lg border border-[var(--border)]
            bg-[var(--card-bg)] text-[var(--foreground)] focus:ring-2 focus:ring-gray-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Domain Listing */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-5 py-3 text-left font-semibold">Domain</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="text-center py-6 opacity-60">Loading...</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((name: string, idx: number) => (
                  <tr
                    key={idx}
                    onClick={() => router.push(`/screens/biddingpage?name=${encodeURIComponent(name)}`)}
                    className="border-b border-[var(--border)] hover:bg-[var(--foreground)]/10 cursor-pointer transition"
                  >
                    <td className="px-5 py-3 font-medium">{name}.ntu</td>
                  </tr>
                ))
              ) : (
                <tr><td className="text-center py-6 opacity-60">No domains found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
