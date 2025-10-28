"use client";

import { redirect, RedirectType } from "next/navigation";
import WalletConnect from "@/components/WalletConnect";
import { useAccount } from "wagmi";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

export default function AuthPage() {
  const { isConnected } = useAccount();

  if (isConnected) redirect("/screens/homepage", RedirectType.push);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-20
      bg-[var(--background)] text-[var(--foreground)] transition-colors">

      <ThemeToggle />

      {/* Hero */}
      <div className="text-center max-w-2xl animate-fadeIn">
        <h1 className="text-4xl font-extrabold">
          Decentralized Domain Registrar
        </h1>

        <p className="mt-4 text-lg opacity-80 leading-relaxed">
          Claim unique blockchain-native identities.  
          Bid fairly. Own autonomously. Transfer trustlessly.
        </p>

        <div className="mt-8 flex justify-center">
          <Image
            src="/domainregister.png"
            alt="Domain Icon"
            width={180}
            height={180}
            className="drop-shadow-lg dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]"
          />
        </div>
      </div>

      {/* Connect */}
      <div className="active:scale-[0.97] transition">
        <WalletConnect onAddWallet={function (address: string): void {
          throw new Error("Function not implemented.");
        } } />
      </div>

      <p className="text-sm opacity-70 mt-3">
        New to Web3?{" "}
        <Link
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sky-600 dark:text-sky-300 hover:underline"
        >
          Install MetaMask ↗
        </Link>
      </p>

      {/* Features */}
      <section className="mt-16 w-full max-w-3xl bg-white/60 dark:bg-black/440 
        border border-gray-100 dark:border-gray-700 rounded-2xl shadow-lg p-8 backdrop-blur">

        <h2 className="text-2xl font-semibold text-center mb-6">
          What You Can Do
        </h2>

        <ul className="space-y-4 text-[var(--foreground)]">
          <FeatureItem text="Bid on unregistered domain names (e.g., ivan.ntu)" />
          <FeatureItem text="Reveal bids fairly: Highest valid reveal wins" />
          <FeatureItem text="Resolve domain through wallet address mappings" />
          <FeatureItem text="View bids, manage owned domains, send crypto via lookup" />
        </ul>
      </section>

      <footer className="mt-20 text-sm opacity-50">
        Fully On-Chain • Neutral • Open Protocol
      </footer>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-green-500 text-lg">✓</span>
      <span>{text}</span>
    </li>
  );
}
