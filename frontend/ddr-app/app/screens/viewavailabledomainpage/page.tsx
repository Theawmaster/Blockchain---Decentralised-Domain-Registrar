"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReadContract, usePublicClient } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked } from "viem";
import AppNav from "@/components/AppNav";

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

const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);
const isDomain = (s: string) => s.endsWith(".ntu");

/* -------------------- modals -------------------- */
function DomainErrorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-xl shadow-xl p-6 w-[360px] text-center space-y-4">
        <h2 className="text-lg font-semibold">Invalid Domain</h2>
        <p className="opacity-80">
          Please enter a valid <span className="font-semibold">.ntu</span> name (letters, numbers, hyphens; no double hyphens).
        </p>
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white transition cursor-pointer">
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
      <div className="bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-xl shadow-xl p-6 w-[360px] text-center space-y-4">
        <h2 className="text-lg font-semibold">Domain Already Registered</h2>
        <p className="opacity-80">
          This domain is already owned. You can only start auctions for <strong>unregistered</strong> domains.
        </p>
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white transition">
          Ok
        </button>
      </div>
    </div>
  );
}

/* -------------------- main page -------------------- */
export default function ViewAvailableDomainPage() {
  const router = useRouter();
  const publicClient = usePublicClient();

  // start auction UI
  const [rawInput, setRawInput] = useState("");
  const canStart = isValidDotNtu(rawInput);
  const normalized = normalize(rawInput);

  // search UI
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // modals
  const [showError, setShowError] = useState(false);
  const [showTakenModal, setShowTakenModal] = useState(false);

  // registry data
  const { data: allNames, isLoading } = useReadContract({
    address: CONTRACTS.registry.address,
    abi: CONTRACTS.registry.abi,
    functionName: "getAllNames",
    query: { refetchInterval: 3000, staleTime: 0 },
  });
  const domains: string[] = Array.isArray(allNames) ? (allNames as string[]) : [];

  // resolve cache (domain -> "Resolved"/"Not Resolved")
  const [resolveStatus, setResolveStatus] = useState<Record<string, string>>({});

  // names owned by a given address
  const [namesByOwner, setNamesByOwner] = useState<string[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);

  // reverse resolution matches for an address
  const [reverseMatches, setReverseMatches] = useState<string[]>([]);

  // domain info card
  const [domainInfo, setDomainInfo] = useState<{
    name: string;
    owner: `0x${string}` | undefined;
    resolve: `0x${string}` | undefined;
    expiry: string | null;
  } | null>(null);

  /* -------- Prevent browser back -------- */
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  /* -------- Debounce search -------- */
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [search]);

  /* -------- When searching by address: fetch owned names -------- */
  useEffect(() => {
    (async () => {
      if (!publicClient) return;
      if (!isAddress(debounced)) {
        setNamesByOwner([]);
        setReverseMatches([]);
        return;
      }
      try {
        setLoadingNames(true);
        const result = (await publicClient.readContract({
          address: CONTRACTS.registry.address,
          abi: CONTRACTS.registry.abi,
          functionName: "namesOfOwner",
          args: [debounced],
        })) as string[];
        setNamesByOwner(result || []);
      } catch {
        setNamesByOwner([]);
      } finally {
        setLoadingNames(false);
      }
    })();
  }, [debounced, publicClient]);

  /* -------- Reverse resolution: domains resolving to address -------- */
  useEffect(() => {
    (async () => {
      if (!publicClient) return;
      if (!isAddress(debounced) || domains.length === 0) {
        setReverseMatches([]);
        return;
      }
      // ensure we only check domains we know are resolved
      const candidate = domains.filter((d) => resolveStatus[d] === "Resolved");
      const out: string[] = [];
      for (const d of candidate) {
        try {
          const addr = (await publicClient.readContract({
            address: CONTRACTS.registry.address,
            abi: CONTRACTS.registry.abi,
            functionName: "resolve",
            args: [d],
          })) as `0x${string}`;
          if (addr?.toLowerCase() === debounced.toLowerCase()) out.push(d);
        } catch {
          /* ignore */
        }
      }
      setReverseMatches(out);
    })();
  }, [debounced, domains, resolveStatus, publicClient]);

  /* -------- Domain card: owner/resolve/expiry -------- */
  useEffect(() => {
    (async () => {
      if (!publicClient) return;
      if (!isDomain(debounced)) {
        setDomainInfo(null);
        return;
      }
      try {
        const name = debounced;
        const namehash = keccak256(encodePacked(["string"], [name])) as `0x${string}`;
        const [owner, resolved, expiry] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.registry.address,
            abi: CONTRACTS.registry.abi,
            functionName: "ownerOf",
            args: [namehash],
          }) as Promise<`0x${string}`>,
          publicClient.readContract({
            address: CONTRACTS.registry.address,
            abi: CONTRACTS.registry.abi,
            functionName: "resolve",
            args: [name],
          }) as Promise<`0x${string}`>,
          publicClient.readContract({
            address: CONTRACTS.auctionHouse.address,
            abi: CONTRACTS.auctionHouse.abi,
            functionName: "expiration",
            args: [namehash],
          }) as Promise<bigint>,
        ]);
        setDomainInfo({
          name,
          owner,
          resolve: resolved,
          expiry: Number(expiry) > 0 ? new Date(Number(expiry) * 1000).toLocaleDateString() : null,
        });
      } catch {
        setDomainInfo(null);
      }
    })();
  }, [debounced, publicClient]);

  /* -------- Resolve status cache for list/table -------- */
  async function fetchResolveStatus(domain: string) {
    try {
      const resolved = (await publicClient?.readContract({
        address: CONTRACTS.registry.address,
        abi: CONTRACTS.registry.abi,
        functionName: "resolve",
        args: [domain],
      })) as `0x${string}`;
      const status =
        resolved && resolved !== "0x0000000000000000000000000000000000000000" ? "Resolved" : "Not Resolved";
      setResolveStatus((prev) => ({ ...prev, [domain]: status }));
    } catch {
      setResolveStatus((prev) => ({ ...prev, [domain]: "Not Resolved" }));
    }
  }

  useEffect(() => {
    // keep the list hydrated as user scrolls/filters
    const pool = debounced ? domains.filter((n) => n.toLowerCase().includes(debounced)) : domains;
    pool.forEach((d) => {
      if (!resolveStatus[d]) void fetchResolveStatus(d);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains, debounced, publicClient]);

  /* -------- Filter logic for fallback table -------- */
  const filtered = useMemo(() => {
    if (isAddress(debounced)) {
      // show only resolved names owned by that address in the table view
      return namesByOwner.filter((n) => resolveStatus[n] === "Resolved");
    }
    if (!debounced) return domains;
    return domains.filter((n) => n.toLowerCase().includes(debounced));
  }, [domains, debounced, namesByOwner, resolveStatus]);

  /* -------- Start auction -------- */
  async function startAuction() {
    if (!canStart) {
      setShowError(true);
      return;
    }
    const name = normalize(rawInput);
    try {
      const existing = (await publicClient?.readContract({
        address: CONTRACTS.registry.address,
        abi: CONTRACTS.registry.abi,
        functionName: "getAllNames",
      })) as string[] | undefined;

      if (existing?.some((n) => n.toLowerCase() === name.toLowerCase())) {
        setShowTakenModal(true);
        return;
      }
    } catch {
      // if the read fails, we optimistically allow starting and let the contract enforce checks
    }
    router.push(`/screens/startauction?name=${encodeURIComponent(name)}`);
  }

  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") startAuction();
  }

  /* -------------------- UI -------------------- */
  return (
    <>
      <AppNav />
      <div className="flex justify-center pt-16 px-4">
        <DomainErrorModal open={showError} onClose={() => setShowError(false)} />
        <DomainTakenModal open={showTakenModal} onClose={() => setShowTakenModal(false)} />

        <div className="max-w-5xl w-full rounded-xl border shadow-md bg-[var(--background)] text-[var(--foreground)] p-10 space-y-10">
          <h1 className="text-3xl font-extrabold text-center">Domain Auctions</h1>

          {/* Start new auction */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Start a New Domain Auction</h2>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="Enter new domain (e.g., ivan.ntu)"
                className="w-full max-w-md px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] focus:ring-2 focus:ring-gray-500"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                onKeyDown={onEnter}
              />
              <button
                onClick={startAuction}
                disabled={!canStart}
                className="px-5 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
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

          {/* Smart search */}
          <h2 className="text-lg font-semibold">Search (domain or wallet)</h2>
          <input
            type="text"
            placeholder="e.g., ivan.ntu  or  0x1234…abcd"
            className="w-full max-w-md px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] focus:ring-2 focus:ring-gray-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Domain card */}
          {isDomain(debounced) && domainInfo && (
            <div className="border border-gray-400/40 bg-[var(--card-bg)] rounded-xl p-6 shadow-lg space-y-2 transition">
              <h3 className="text-xl font-semibold">{domainInfo.name}</h3>
              <p><span className="opacity-60">Owner:</span> {domainInfo.owner}</p>
              <p><span className="opacity-60">Resolves To:</span> {domainInfo.resolve}</p>
              <p><span className="opacity-60">Expiry:</span> {domainInfo.expiry ?? "None"}</p>
            </div>
          )}

          {/* Address card */}
          {isAddress(debounced) && (
            <div className="border border-[var(--border)] bg-[var(--card-bg)] rounded-xl p-6 shadow-md space-y-4">
              <h3 className="text-xl font-semibold break-all">{debounced}</h3>

              <div>
                <p className="font-semibold mb-1">Domains Owned</p>
                <div className="space-y-1 opacity-90">
                  {namesByOwner.length ? namesByOwner.map(n => <p key={n}>{n}</p>) : "None"}
                </div>
              </div>

              <div>
                <p className="font-semibold mb-1">Reverse Resolved</p>
                <div className="space-y-1 opacity-90">
                  {reverseMatches.length ? reverseMatches.map(n => <p key={n}>{n}</p>) : "None"}
                </div>
              </div>
            </div>
          )}

          {/* Fallback table view */}
          <div className="overflow-hidden rounded-xl border">
            <div className="h-[225px] overflow-y-scroll pr-2 scrollbar-thin scrollbar-thumb-[var(--foreground)] scrollbar-track-[var(--background)]">
              <table className="min-w-full text-sm text-center">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--card-bg)] sticky top-0">
                    <th className="px-5 py-3 text-center font-semibold">Bidded Domain Name</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading || loadingNames ? (
                    <tr>
                      <td colSpan={2} className="px-5 py-6 opacity-60 text-center">Loading…</td>
                    </tr>
                  ) : filtered.length ? (
                    filtered.map((name) => (
                      <tr key={name} className="border-b border-[var(--border)] hover:bg-[var(--foreground)]/10 transition">
                        <td className="px-5 py-3 font-medium">{name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-5 py-6 opacity-60 text-center">No domains found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs opacity-60">
            Note: Active auctions appear on the <strong>Active Auctions</strong> page.
          </p>
        </div>
      </div>
    </>
  );
}
