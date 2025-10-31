"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked, isAddress } from "viem";
import ThemeToggle from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";

export default function ViewRegisteredDomainPage() {
  const { address } = useAccount();
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
      // ✅ Verify caller is owner before sending transaction
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

      // if (mode === "transfer") {
      //   await writeContractAsync({
      //     address: CONTRACTS.registry.address,
      //     abi: CONTRACTS.registry.abi,
      //     functionName: "transferDomain",
      //     args: [selected.name, input],
      //   });

      //   setDomains(domains.filter((d) => d.name !== selected.name));
      //   setResultModal({ ok: true, message: `✅ Ownership transferred to ${input}` });
      // }

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

return (
  <div className="max-w-3xl mx-auto pt-16 px-4 space-y-8 text-[var(--foreground)]">

    {/* Top Row */}
    <div className="flex justify-between items-center">
      <button
        onClick={() => router.push("/screens/homepage")}
        className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-[var(--foreground)]/10 cursor-pointer"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold">My Owned Domains</h1>

      <ThemeToggle />
    </div>

    {!loaded && <p className="opacity-60">Loading...</p>}

    {loaded && domains.length === 0 && (
      <p className="opacity-60 text-center">You don’t own any domains yet.</p>
    )}

    {/* List of Owned Domains */}
    {domains.map((d) => {
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
              disabled={hasResolve} // ✅ disable if already resolved
              className={`px-3 py-1 rounded-md text-sm transition
                ${hasResolve
                  ? "bg-gray-500 opacity-60 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                }`}
            >
              {hasResolve ? "Already Resolved" : "Set Resolve"}
            </button>

            {/* <button
              onClick={() => openModal(d, "transfer")}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm cursor-pointer transition"
            >
              Transfer Owner
            </button> */}
          </div>
        </div>
      );
    })}

    {/* Modals (leave your existing modal code unchanged) */}
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
            <button onClick={closeModal} className="px-4 py-2 rounded border hover:bg-[var(--foreground)] hover:text-[var(--background)]">
              Cancel
            </button>
            <button onClick={submit} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">
              Confirm
            </button>
          </div>
        </div>
      </div>
    )}

    {resultModal && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl p-6 w-[90%] max-w-sm text-center space-y-4 transition-all">
          <h2 className="text-lg font-semibold">{resultModal.ok ? "Success" : "Error"}</h2>
          <p className="opacity-80 text-sm">{resultModal.message}</p>
          <button onClick={() => setResultModal(null)} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white w-full">
            Close
          </button>
        </div>
      </div>
    )}
  </div>
);

}
