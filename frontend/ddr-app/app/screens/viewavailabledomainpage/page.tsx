"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function ViewAvailableDomainPage() {
  const router = useRouter();

  // State for NEW domain auction input
  const [newDomain, setNewDomain] = useState("");

  // State for searching existing domains
  const [search, setSearch] = useState("");

  // Load domain names from Registry
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
    return input.trim().toLowerCase().endsWith(".ntu")
  }

  const handleStart =() => {
    if (!validateDomain(newDomain)) {
      alert("Please enter a valid domain ending with .ntu");
      return;
    }
    router.push(`/screens/startauction?name=${encodeURIComponent(newDomain)}`);
  }

  return (
    <div className="flex justify-center pt-16 px-4">
      <div className="max-w-5xl w-full rounded-xl border shadow-md
        bg-[var(--background)] text-[var(--foreground)]
        transition-colors p-10 space-y-10">

        <h1 className="text-3xl font-extrabold text-center">
          Domain Auctions
        </h1>

        {/* Top Controls */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-[var(--border)]
            hover:bg-[var(--foreground)]/10 transition flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <ThemeToggle />
        </div>

        {/* Start New Auction */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Start a New Domain Auction</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter new domain (e.g. alvin)"
              className="w-full max-w-md px-4 py-2 rounded-lg border
                border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)]
                focus:ring-2 focus:ring-sky-500 outline-none transition"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
            <button
              onClick={() =>
                router.push(`/screens/startauction?name=${encodeURIComponent(newDomain)}`)
              }
              disabled={!newDomain.trim()}
              className="px-5 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700
                disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Start Auction
            </button>
          </div>
        </div>

        <hr className="border-[var(--border)]" />

        {/* Search Existing Domains */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Search Existing Domains</h2>
          <div className="flex justify-center mb-4">
            <input
              type="text"
              placeholder="Search domain name..."
              className="w-full max-w-md px-4 py-2 rounded-lg border
                border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)]
                focus:ring-2 focus:ring-sky-500 outline-none transition"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Domain Table */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--card-bg)] text-[var(--foreground)]">
              <tr className="border-b border-[var(--border)]">
                <th className="px-5 py-3 text-left font-semibold">Domain</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td className="text-center py-6 opacity-60">Loading from blockchain...</td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((name: string, idx: number) => (
                  <tr
                    key={idx}
                    onClick={() =>
                      router.push(`/screens/biddingpage?name=${encodeURIComponent(name)}`)
                    }
                    className="border-b border-[var(--border)] hover:bg-[var(--foreground)]/10
                    cursor-pointer transition"
                  >
                    <td className="px-5 py-3 font-medium">{name}.ntu</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="text-center py-6 opacity-60">
                    No domains found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
