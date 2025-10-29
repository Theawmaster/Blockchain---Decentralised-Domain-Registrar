"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import AppNav from "@/components/AppNav";

export default function HomePage() {
  const { address, isConnected } = useAccount();

  return (
    <>
      <AppNav />

      <div className="flex justify-center pt-20 px-4">
        <div className="max-w-4xl w-full text-center space-y-10
          bg-[var(--background)] text-[var(--foreground)]
          transition-colors">

          <h1 className="text-4xl font-extrabold">Decentralized Domain Registrar</h1>

          <p className="opacity-70 max-w-2xl mx-auto text-lg leading-relaxed">
            Register and own <strong>blockchain-native identities</strong> — censorship-resistant,
            tradable, and fully self-sovereign.
          </p>

          {isConnected ? (
            <div className="border rounded-xl p-5 inline-block
                bg-[var(--card-bg)] border-[var(--border)] text-[var(--foreground)]
                transition-colors"
            >
              <p className="text-sm opacity-70 mb-1">Connected Wallet:</p>
              <p className="font-mono text-base break-all">{address}</p>
            </div>
          ) : (
            <p className="text-sm opacity-70">Connect your wallet to begin.</p>
          )}


        </div>
      </div>
    </>
  );
}

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
        href={href}
        className="
            px-5 py-3 rounded-lg font-medium border
            bg-[var(--card-bg)] border-[var(--border)] text-[var(--foreground)]
            hover:bg-[var(--foreground)] hover:text-[var(--background)]
            transition-colors duration-200
        "
        >
        {label}
    </Link>
  );
}
