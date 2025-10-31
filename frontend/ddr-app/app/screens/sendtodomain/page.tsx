"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance, usePublicClient, useSendTransaction } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS } from "@/lib/web3/contract";
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

      if (addr === "0x0000000000000000000000000000000000000000") {
        setMsg("⚠️ Domain is registered but not resolved to any wallet.");
      } else {
        setMsg(`✅ Resolved to wallet: ${addr}`);
      }

    } catch {
      setMsg("❌ Domain not found on registry.");
      setResolved(null);
    }
  }

  function setMax() {
    // Leave room for gas fees
    setAmount((balance * 0.999).toFixed(5));
  }

  async function send() {
    if (!resolved || resolved === "0x0000000000000000000000000000000000000000") return;

    if (Number(amount) <= 0 || Number(amount) > balance) {
      setMsg("❌ Invalid amount (cannot exceed wallet balance).");
      return;
    }

    try {
      await sendTransactionAsync({
        to: resolved,
        value: parseEther(amount),
      });

      setMsg("✅ Transaction Sent Successfully!");
    } catch (err: any) {
      setMsg(err?.shortMessage || err?.message || "Transaction failed.");
    }
  }

  return (
    <>

      <div className="max-w-lg mx-auto space-y-6 p-6 text-[var(--foreground)]">

        {/* Header & Back */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push("/screens/homepage")}
            className="px-4 py-2 rounded-lg border border-[var(--border)]
            hover:bg-[var(--foreground)]/10 transition flex items-center gap-2 cursor-pointer"
          >
            ← Back
          </button>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-bold text-center">Send ETH to Domain</h1>

        {/* Domain Input */}
        <input
          placeholder="example.ntu"
          className="border p-2 w-full rounded bg-[var(--background)]"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />

        <button
          onClick={lookup}
          className="bg-gray-600 text-white px-4 py-2 rounded w-full cursor-pointer hover:bg-gray-700 transition"
        >
          Lookup Owner
        </button>

        {msg && <p className="text-center text-sm">{msg}</p>}

        {/* Wallet + Send Box */}
        {resolved && resolved !== "0x0000000000000000000000000000000000000000" && (
          <div className="space-y-3">

            {/* Wallet Balance Display */}
            <p className="text-sm opacity-80">
              💰 Wallet Balance: {balance.toFixed(4)} ETH
            </p>

            <div className="flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border p-2 w-full rounded bg-[var(--background)]"
                placeholder="Amount (ETH)"
              />
              <button
                onClick={setMax}
                className="px-3 py-1 border rounded hover:bg-[var(--foreground)] hover:text-[var(--background)] transition cursor-pointer" 
              >
                MAX
              </button>
            </div>

            <button
              onClick={send}
              disabled={!amount || Number(amount) <= 0 || Number(amount) > balance}
              className="bg-green-600 text-white px-4 py-2 rounded w-full disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-green-700 transition"
            >
              Send ETH
            </button>

          </div>
        )}
      </div>
    </>
  );
}
