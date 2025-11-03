"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AppNav from "@/components/AppNav";

/* -------------------- helpers -------------------- */
const normalize = (s: string) => {
  const x = s.trim().toLowerCase();
  return x.endsWith(".ntu") ? x : x ? `${x}.ntu` : x;
};

const isValidDotNtu = (s: string) => {
  const x = normalize(s);
  // label must exist before ".ntu" and be [a-z0-9-] with no leading/trailing "--"
  const label = x.replace(/\.ntu$/, "");
  if (!label) return false;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) return false;
  if (/--/.test(label)) return false;
  return x.endsWith(".ntu");
};

/* -------------------- modal -------------------- */
function DomainErrorModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)]
        rounded-xl shadow-xl p-6 w-[360px] text-center space-y-4">
        <h2 className="text-lg font-semibold">Invalid Domain</h2>
        <p className="opacity-80">
          Please enter a valid <span className="font-semibold">.ntu</span> name
          (letters, numbers, hyphens; no double hyphens).
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

/* -------------------- page -------------------- */
export default function ViewAvailableDomainPage() {
  const router = useRouter();

  const [rawInput, setRawInput] = useState("");
  const [search, setSearch] = useState("");
  const [showError, setShowError] = useState(false);

  // live refresh so new registrations appear without a hard reload
  const { data: allNames, isLoading } = useReadContract({
    address: CONTRACTS.registry.address,
    abi: CONTRACTS.registry.abi,
    functionName: "getAllNames",
    // keep it fresh; tweak interval to your taste
    query: { refetchInterval: 3000, staleTime: 0 },
  });

  const domains: string[] = Array.isArray(allNames) ? (allNames as string[]) : [];

  // tiny debounce for search
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    if (!debounced) return domains;
    return domains.filter((n) => n.toLowerCase().includes(debounced));
  }, [domains, debounced]);

  const canStart = isValidDotNtu(rawInput);
  const normalized = normalize(rawInput);

  function startAuction() {
    if (!canStart) {
      setShowError(true);
      return;
    }
    router.push(`/screens/startauction?name=${encodeURIComponent(normalized)}`);
  }

  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") startAuction();
  }

  return (
   <>
    <AppNav/>
      <div className="flex justify-center pt-16 px-4">
        <DomainErrorModal open={showError} onClose={() => setShowError(false)} />

        <div className="max-w-5xl w-full rounded-xl border shadow-md
          bg-[var(--background)] text-[var(--foreground)] p-10 space-y-10">

          {/* header */}       
          <h1 className="text-3xl font-extrabold text-center">Domain Auctions</h1>

          {/* start new auction */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Start a New Domain Auction</h2>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="Enter new domain (e.g., ivan.ntu)"
                className="w-full max-w-md px-4 py-2 rounded-lg border border-[var(--border)]
                bg-[var(--card-bg)] text-[var(--foreground)] focus:ring-2 focus:ring-gray-500"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                onKeyDown={onEnter}
              />
              <button
                onClick={startAuction}
                disabled={!canStart}
                className="px-5 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700
                disabled:opacity-40 disabled:cursor-not-allowed transition"
                title={canStart ? `Start auction for ${normalized}` : "Enter a valid .ntu name"}
              >
                Start Auction
              </button>
            </div>
            {rawInput && (
              <p className="text-xs opacity-70">
                Will start auction for: <span className="font-mono">{normalized || "—"}</span>
              </p>
            )}
          </div>

          <hr className="border-[var(--border)]" />

          {/* search */}
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-semibold">Search Registered Domains</h2>
              <span className="text-xs opacity-60">
                {isLoading ? "Loading…" : `${filtered.length} / ${domains.length} shown`}
              </span>
            </div>
            <input
              type="text"
              placeholder="Search domain name..."
              className="w-full max-w-md px-4 py-2 rounded-lg border border-[var(--border)]
              bg-[var(--card-bg)] text-[var(--foreground)] focus:ring-2 focus:ring-gray-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* list */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--card-bg)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-5 py-3 text-left font-semibold">Domain</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-5 py-6 opacity-60">Loading…</td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((name, idx) => (
                    <tr
                      key={`${name}-${idx}`}
                      onClick={() =>
                        router.push(`/screens/biddingpage?name=${encodeURIComponent(name)}`)
                      }
                      className="border-b border-[var(--border)] hover:bg-[var(--foreground)]/10 cursor-pointer transition"
                      title={`Open ${name}`}
                    >
                      {/* name already includes .ntu — render as-is */}
                      <td className="px-5 py-3 font-medium">{name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-6 opacity-60">
                      No domains found{search ? ` for “${search}”` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs opacity-60">
            Tip: “Registered Domains” are from the Registry. Active auctions (not yet finalized) appear on
            the <span className="font-semibold">Active Auctions</span> screen.
          </p>
        </div>
      </div>
    </> 
  );
}
