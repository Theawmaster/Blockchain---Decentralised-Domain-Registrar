"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReadContract, usePublicClient } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked } from "viem";
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

/* -------------------- helpers -------------------- */
const normalize = (s: string) => {
  const x = s.trim().toLowerCase();
  return x.endsWith(".ntu") ? x : x ? `${x}.ntu` : x;
};

const isValidDotNtu = (s: string) => {
  const x = normalize(s);
  const label = x.replace(/\.ntu$/, "");
  if (!label) return false;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) return false;
  if (/--/.test(label)) return false;
  return x.endsWith(".ntu");
};

/* -------------------- modals -------------------- */
function DomainErrorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[var(--card-bg)] border border-[var(--border)]
        rounded-xl shadow-xl p-6 w-[360px] text-center space-y-4">
        <h2 className="text-lg font-semibold">Invalid Domain</h2>
        <p className="opacity-80">
          Please enter a valid <span className="font-semibold">.ntu</span> name.
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

function DomainTakenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[var(--card-bg)] border border-[var(--border)]
        rounded-xl shadow-xl p-6 w-[360px] text-center space-y-4">
        <h2 className="text-lg font-semibold">Domain Already Registered</h2>
        <p className="opacity-80">
          This domain is already owned. You can only start auctions for <strong>unregistered</strong> domains.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white transition"
        >
          Ok
        </button>
      </div>
    </div>
  );
}

/* -------------------- page -------------------- */
export default function ViewAvailableDomainPage() {
  const router = useRouter();
  const publicClient = usePublicClient();

  const [rawInput, setRawInput] = useState("");
  const [search, setSearch] = useState("");
  const [showError, setShowError] = useState(false);
  const [showTakenModal, setShowTakenModal] = useState(false);

  const { data: allNames, isLoading } = useReadContract({
    address: CONTRACTS.registry.address,
    abi: CONTRACTS.registry.abi,
    functionName: "getAllNames",
    query: { refetchInterval: 3000, staleTime: 0 },
  });

  const domains: string[] = Array.isArray(allNames) ? (allNames as string[]) : [];

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

  async function startAuction() {
    if (!canStart) {
      setShowError(true);
      return;
    }

    const name = normalize(rawInput);
    const namehash = keccak256(encodePacked(["string"], [name]));

    try {
      const owner = await publicClient?.readContract({
        address: CONTRACTS.registry.address,
        abi: CONTRACTS.registry.abi,
        functionName: "ownerOf",
        args: [namehash],
      });

      if (owner && owner !== "0x0000000000000000000000000000000000000000") {
        setShowTakenModal(true);
        return;
      }
    } catch {
      // ignore — treat as available
    }

    router.push(`/screens/startauction?name=${encodeURIComponent(name)}`);
  }

  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") startAuction();
  }

  return (
    <div className="flex justify-center pt-16 px-4">
      <DomainErrorModal open={showError} onClose={() => setShowError(false)} />
      <DomainTakenModal open={showTakenModal} onClose={() => setShowTakenModal(false)} />

      <div className="max-w-5xl w-full rounded-xl border shadow-md
        bg-[var(--background)] text-[var(--foreground)] p-10 space-y-10">

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/screens/homepage")}
            className="px-4 py-2 rounded-lg border border-[var(--border)]
            hover:bg-[var(--foreground)]/10 transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <ThemeToggle />
        </div>

        <h1 className="text-3xl font-extrabold text-center">Domain Auctions</h1>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Start a New Domain Auction</h2>

          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Enter new domain (e.g., ivan.ntu)"
              className="w-full max-w-md px-4 py-2 rounded-lg border border-[var(--border)]
              bg-[var(--card-bg)] focus:ring-2 focus:ring-gray-500"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              onKeyDown={onEnter}
            />
            <button
              onClick={startAuction}
              disabled={!canStart}
              className="px-5 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700
              disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Start Auction
            </button>
          </div>

          {rawInput && (
            <p className="text-xs opacity-70">
              Normalized: <span className="font-mono">{normalized}</span>
            </p>
          )}
        </div>

          <hr className="border-[var(--border)]" />

        <h2 className="text-lg font-semibold">Search Registered Domains</h2>

        <input
          type="text"
          placeholder="Search domain name..."
          className="w-full max-w-md px-4 py-2 rounded-lg border border-[var(--border)]
          bg-[var(--card-bg)] focus:ring-2 focus:ring-gray-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="overflow-hidden rounded-xl border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--card-bg)]">
                <th className="px-5 py-3 text-left font-semibold">Domain</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="px-5 py-6 opacity-60">Loading…</td></tr>
              ) : filtered.length ? (
                filtered.map((name, idx) => (
                  <tr key={idx} className="border-b border-[var(--border)]
                    hover:bg-[var(--foreground)]/10 transition">
                    <td className="px-5 py-3 font-medium">{name}</td>
                  </tr>
                ))
              ) : (
                <tr><td className="px-5 py-6 opacity-60">No domains found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs opacity-60">
          Note: Active auctions appear on the <strong>Active Auctions</strong> page.
        </p>
      </div>
    </> 
  );
}
