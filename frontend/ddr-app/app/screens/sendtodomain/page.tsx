"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance, usePublicClient, useSendTransaction } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS } from "@/lib/web3/contract";
import AppNav from "@/components/AppNav";
import ThemeToggle from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";

export default function SendToDomainPage() {
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient()!;
  const { sendTransactionAsync } = useSendTransaction();

  const { data: balanceData } = useBalance({ address });
  const balance = Number(balanceData?.formatted || "0");

  const [domain, setDomain] = useState("");
  const [amount, setAmount] = useState("");
  const [resolved, setResolved] = useState<`0x${string}` | null>(null);
  const [msg, setMsg] = useState("");

  async function lookup() {
    if (!domain.endsWith(".ntu")) {
      setMsg("❌ Domain must end with .ntu");
      setResolved(null);
      return;
    }

    try {
      const addr = await publicClient.readContract({
        address: CONTRACTS.registry.address,
        abi: CONTRACTS.registry.abi,
        functionName: "resolve",
        args: [domain.toLowerCase()],
      }) as `0x${string}`;

      setResolved(addr);
      setMsg(
        addr === "0x0000000000000000000000000000000000000000"
          ? "⚠️ Domain is not registered or domain is not resolved to any wallet."
          : `✅ Resolved to wallet: ${addr}`
      );
    } catch {
      setMsg("❌ Domain not found on registry.");
      setResolved(null);
    }
  }

  function setMax() {
    setAmount((balance * 0.999).toFixed(5)); // leaves small gas margin
  }

  async function send() {
    if (!resolved || resolved === "0x0000000000000000000000000000000000000000") return;
    if (Number(amount) <= 0 || Number(amount) > balance) {
      setMsg("❌ Invalid amount.");
      return;
    }

    try {
      await sendTransactionAsync({ to: resolved, value: parseEther(amount) });
      setMsg("✅ Transaction Sent Successfully!");
    } catch (err: any) {
      setMsg(err?.shortMessage || err?.message || "Transaction failed.");
    }
  }

  // Disable back navigation
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  return (
    <>
      <AppNav />

      <div className="max-w-lg mx-auto mt-16 p-8 rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-lg space-y-6 text-[var(--foreground)]">

        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Send ETH to Domain</h1>
          <ThemeToggle />
        </div>

        {/* Domain Input */}
        <div className="space-y-2">
          <label className="text-sm opacity-75">Domain Name</label>
          <input
            placeholder="example.ntu"
            className="w-full px-4 py-2 border rounded-lg bg-[var(--card-bg)] outline-none focus:ring-2 focus:ring"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>

        <button
          onClick={lookup}
          className="w-full py-2 bg-var text-bg rounded-lg hover:bg-[var(--foreground)] hover:text-[var(--background)] border transition cursor-pointer"
        >
          Lookup Owner
        </button>

        {msg && <p className="text-center text-sm opacity-80">{msg}</p>}

        {/* Send Box */}
        {resolved && resolved !== "0x0000000000000000000000000000000000000000" && (
          <div className="space-y-4 p-4 border rounded-lg bg-[var(--foreground)]/5">

            <p className="text-sm opacity-75">
              💰 Wallet Balance: {balance.toFixed(4)} ETH
            </p>

            <div className="flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg bg-[var(--card-bg)] outline-none focus:ring-2 focus:ring"
                placeholder="Amount (ETH)"
              />
              <button
                onClick={setMax}
                className="px-3 py-2 border rounded-lg hover:bg-[var(--foreground)] hover:text-[var(--background)] transition cursor-pointer"
              >
                MAX
              </button>
            </div>

            <button
              onClick={send}
              disabled={!amount || Number(amount) <= 0 || Number(amount) > balance}
              className="w-full py-2 bg-gray-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition cursor-pointer"
            >
              Send ETH
            </button>
          </div>
        )}
      </div>
    </>
  );
}
