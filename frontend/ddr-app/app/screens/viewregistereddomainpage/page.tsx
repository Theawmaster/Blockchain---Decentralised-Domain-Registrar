"use client";

import { useEffect, useState, useMemo } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked, isAddress } from "viem";
import ThemeToggle from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";

export default function ViewRegisteredDomainPage() {
  const { address, isConnected, status } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [domains, setDomains] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  // Modal State
  const [selected, setSelected] = useState<any>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"resolve" | "transfer" | null>(null);
  const [resultModal, setResultModal] = useState<null | { ok: boolean; message: string }>(null);

  // Search
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [search]);

  // ---------------- Redirect if Not Connected ----------------
  useEffect(() => {
    // Wait until wagmi finishes determining connection status
    if (status === "connecting") return;

    if (!isConnected || !address) {
      router.push("/screens/authpage");
    }
  }, [isConnected, status, address, router]);

    /* -------- Prevent browser back -------- */
    useEffect(() => {
      window.history.pushState(null, "", window.location.href);
      const handlePop = () => window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePop);
      return () => window.removeEventListener("popstate", handlePop);
    }, []);

  useEffect(() => {
    if (!address || !publicClient) return;

    (async () => {
      const names = await publicClient.readContract({
        address: CONTRACTS.registry.address,
        abi: CONTRACTS.registry.abi,
        functionName: "getAllNames",
      });

      const owned: any[] = [];

      for (let name of names as string[]) {
        const namehash = keccak256(encodePacked(["string"], [name])) as `0x${string}`;

        const owner = await publicClient.readContract({
          address: CONTRACTS.registry.address,
          abi: CONTRACTS.registry.abi,
          functionName: "ownerOf",
          args: [namehash],
        }) as `0x${string}`;

        if (owner.toLowerCase() === address.toLowerCase()) {
          const resolve = await publicClient.readContract({
            address: CONTRACTS.registry.address,
            abi: CONTRACTS.registry.abi,
            functionName: "resolve",
            args: [name],
          });

          owned.push({ name, namehash, resolve });
        }
      }

      setDomains(owned);
      setLoaded(true);
    })();
  }, [address, publicClient]);

  async function submit() {
    if (!isAddress(input)) {
      setResultModal({ ok: false, message: "❌ Invalid wallet address." });
      return;
    }

    if (!publicClient) {
      setResultModal({ ok: false, message: "⚠️ Wallet or network not connected." });
      return;
    }

    try {
      const currentOwner = await publicClient.readContract({
        address: CONTRACTS.registry.address,
        abi: CONTRACTS.registry.abi,
        functionName: "ownerOf",
        args: [selected.namehash],
      }) as `0x${string}`;

      if (currentOwner.toLowerCase() !== address?.toLowerCase()) {
        setResultModal({ ok: false, message: "❌ You are not the owner of this domain." });
        closeModal();
        return;
      }

      if (mode === "resolve") {
        await writeContractAsync({
          address: CONTRACTS.registry.address,
          abi: CONTRACTS.registry.abi,
          functionName: "setResolve",
          args: [selected.name, input],
        });

        setDomains(domains.map((d) => d.name === selected.name ? { ...d, resolve: input } : d));
        setResultModal({ ok: true, message: `✅ Resolve updated to ${input}` });
      }
    } catch (err: any) {
      setResultModal({
        ok: false,
        message: err.shortMessage || err.message || "❌ Transaction failed.",
      });
    }

    closeModal();
  }

  function openModal(domain: any, m: "resolve" | "transfer") {
    setSelected(domain);
    setInput("");
    setMode(m);
  }

  function closeModal() {
    setSelected(null);
    setMode(null);
  }

    useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // Filtered domains based on search
  const filteredDomains = useMemo(() => {
    if (!debounced) return domains;
    return domains.filter(d => d.name.toLowerCase().includes(debounced));
  }, [domains, debounced]);

  return (
    <>
      <AppNav />
      <div className="flex justify-center pt-16 px-4">
        <div
          className="max-w-5xl w-full rounded-xl border shadow-md
          bg-[var(--background)] text-[var(--foreground)] p-10 space-y-10 "
        >
          <h1 className="text-3xl font-extrabold text-center">My Owned Domains</h1>

          {/* Search Input */}
          {loaded && domains.length > 0 && (
            <input
              type="text"
              placeholder="Search domain (e.g ivan.ntu)"
              className="w-65 h-8 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] focus:ring-2 focus:ring-gray-500 mb-4"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}

          {!loaded && <p className="opacity-60">Loading...</p>}

          {loaded && filteredDomains.length === 0 && (
            <p className="opacity-60 text-center">
              {domains.length === 0
                ? "You don’t own any domains yet."
                : "No domains match your search."}
            </p>
          )}

          {/* Scrollable Domain List */}
          {loaded && filteredDomains.length > 0 && (
            <div
              className="h-[520px] overflow-y-scroll space-y-2 pr-2 rounded-lg border-2 border-[var(--border)] shadow-inner
              scrollbar-thin scrollbar-thumb-[var(--foreground)] scrollbar-track-[var(--background)] always-scrollbar"
            >
              {filteredDomains.map((d) => {
                const hasResolve = d.resolve !== "0x0000000000000000000000000000000000000000";

                return (
                  <div key={d.name} className="border p-4 rounded-lg bg-[var(--card-bg)]">
                    <div className="text-lg font-semibold">{d.name}</div>
                    <div className="opacity-80 text-sm break-all">
                      Resolve: {hasResolve ? d.resolve : "(none set)"}
                    </div>

                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => !hasResolve && openModal(d, "resolve")}
                        disabled={hasResolve}
                        className={`px-3 py-1 rounded-md text-sm transition
                          ${hasResolve
                            ? "bg-gray-500 opacity-60 cursor-not-allowed"
                            : "bg-gray-600 hover:bg-gray-700 text-white cursor-pointer"
                          }`}
                      >
                        {hasResolve ? "Already Resolved" : "Set Resolve"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal for Input */}
          {mode && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 w-[90%] max-w-sm space-y-4 transition-all">
                <h2 className="text-lg font-bold">
                  {mode === "resolve" ? "Set Resolve Address" : "Transfer Ownership"}
                </h2>

                <input
                  className="w-full border p-2 rounded bg-[var(--background)]"
                  placeholder="0xWalletAddress"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />

                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded border hover:bg-[var(--foreground)] hover:text-[var(--background)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Result Modal */}
          {resultModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl p-6 w-[90%] max-w-sm text-center space-y-4 transition-all">
                <h2 className="text-lg font-semibold">
                  {resultModal.ok ? "Success" : "Error"}
                </h2>
                <p className="opacity-80 text-sm">{resultModal.message}</p>
                <button
                  onClick={() => setResultModal(null)}
                  className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white w-full cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
