"use client";

// imports here
import { redirect, RedirectType } from "next/navigation";
import { useAccount } from "wagmi";
import WalletConnect from "@/components/WalletConnect";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function AuthPage() {
  // hooks
  const { isConnected } = useAccount();
  const [hasMetaMask, setHasMetaMask] = useState(true);
  const [isCorrectBrowser, setIsCorrectBrowser] = useState(true);

  useEffect(() => {
    // Browser check
    const ua = navigator.userAgent.toLowerCase();
    setIsCorrectBrowser(ua.includes("chrome") || ua.includes("brave") || ua.includes("chromium"));

    // Wallet check
    setHasMetaMask(typeof window !== "undefined" && (window as any).ethereum);
  }, []);

  // redirect if already connected
  if (isConnected) redirect("/screens/homepage", RedirectType.push);

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 pt-20 gap-10
      bg-[var(--background)] text-[var(--foreground)] transition-colors"
    >
      <ThemeToggle />

      {/* Header */}
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-extrabold">
          Decentralized Domain Registrar
        </h1>
        <p className="mt-4 text-lg opacity-80 leading-relaxed">
          Claim human-readable blockchain names. Bid privately. Reveal fairly.
          Own autonomously.
        </p>
        <div className="mt-6 flex justify-center">
          <Image
            src="/domainregister.png"
            alt="Domain Icon"
            width={150}
            height={150}
            className="drop-shadow-lg"
          />
        </div>
      </div>

      {/* Requirements Notice */}
      <div className="max-w-md text-center text-sm opacity-70 space-y-2">
        <p>To continue, you’ll need:</p>
        <p>• A Chromium-based browser (Chrome preferably)</p>
        <p>• MetaMask wallet extension installed</p>
        <p>• A Web3 account (can create inside MetaMask)</p>
      </div>

      {/* Setup Warnings */}
      {!isCorrectBrowser && (
        <WarningBox
          message="Please open this site in Chrome or Brave for Web3 compatibility."
          link="https://www.google.com/chrome/"
          linkLabel="Download Chrome"
        />
      )}

      {!hasMetaMask && (
        <WarningBox
          message="MetaMask wallet not detected."
          link="https://metamask.io/download/"
          linkLabel="Install MetaMask"
        />
      )}

      {/* Connection Button */}
      {isCorrectBrowser && hasMetaMask && (
        <div className="active:scale-[0.97] transition">
          <WalletConnect
            onAddWallet={function (address: string): void {
              throw new Error("Function not implemented.");
            }}
          />
        </div>
      )}

      {/* App Expectations */}
      <section className="mt-10 max-w-lg w-full border rounded-xl p-6 shadow-sm bg-[var(--card-bg)]">
        <h2 className="font-semibold text-center mb-4 text-xl">
          What to Expect
        </h2>
        <Step text="Search or bid for a domain like `kevin.ntu`" />
        <Step text="Commit your bid privately (nobody sees your price yet)" />
        <Step text="Reveal your bid later where highest valid bid wins" />
        <Step text="Winner can finalize and officially own the domain on-chain" />
        <Step text="Resolve the domain to your wallet address" />
        <Step text="Transfer ether to other resolved domain" />
      </section>

      <footer className="mt-12 text-sm opacity-60 pb-8">
        100% On-Chain • Transparent • User-Owned
      </footer>
    </div>
  );
}

// Step Component
function Step({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="text-green-500">✔</span>
      <span>{text}</span>
    </div>
  );
}

// Warning Box Component
function WarningBox({ message, link, linkLabel }: any) {
  return (
    <div
      className="border border-yellow-500 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 
      px-4 py-3 rounded-lg text-sm max-w-md text-center animate-fadeIn"
    >
      {message}{" "}
      <Link href={link} target="_blank" className="underline font-medium">
        {linkLabel}
      </Link>
    </div>
  );
}
