"use client";

import { redirect, RedirectType } from "next/navigation";
import WalletConnect from "@/components/WalletConnect";
import { useAccount, useDisconnect } from "wagmi";
import Link from "next/link";
import { useEffect } from "react";
import Image from 'next/image';

export default function Home() {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  
  if (isConnected) {
    // disconnect();
    localStorage.removeItem("wagmi.store");
    redirect("/screens/homepage", RedirectType.push);
  }

  return (
    

    


   <div className="text-center">
      <div className="bg-sky-100 items-center justify-center">
        <h1 className="text-3xl font-bold mb-4 text-black pt-6">
          Decentralized Domain Registrar
        </h1>
        <img
          src="/domainregister.png"
          alt="Description of my image"
          width={150}
          height={150}
          className="mx-auto"
        />
      </div>
      
      <p className="text-black leading-relaxed px-5 pt-6">
        A Decentralized Domain Registrar lets users register and manage domain names on the blockchain, giving full ownership, security, and freedom from central authorities.
      </p>

        {/* Connect CTA */}
        <div className="mt-2">
          <WalletConnect onAddWallet={() => redirect("/screens/homepage")} />
          <p className="text-sm text-gray-500 mt-3">
            Don’t have a wallet yet? Install{" "}
            <Link
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              MetaMask
            </Link>{" "}
            to get started.
          </p>
        </div>
      
    <div className="flex items-center justify-center">
      {/* ===== Features Section ===== */}
      <section className="bg-sky-50 rounded-xl p-8 shadow-md mt-16 w-full max-w-3xl justify-center">
        <h2 className="text-2xl font-semibold mb-6 flex items-center justify-center">
          <span className="mr-2"></span>Enabled Features
        </h2>
        <ul className="space-y-4 text-gray-700 text-left">
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            Any wallet can bid for an unregistered name like alice.ntu.
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            The highest valid reveal above the reserve wins, pays their bid, and the contract mints ownership of the name
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            The registry supports forward resolution (name → address) and (stretch) reverse resolution (address → names)
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
             Lists domains, shows auction timers, lets users commit/reveal, and resolve names. All logic is open, transparent, and gas/audit-backed.

          </li>
        </ul>
      </section>
   </div>
      
    </div>
  );
}
