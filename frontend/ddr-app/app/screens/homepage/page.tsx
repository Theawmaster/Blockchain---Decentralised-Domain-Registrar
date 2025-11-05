"use client";

import { Wallet, Globe, Gavel, BadgeCheck, Undo2 } from "lucide-react";
import { useAccount, useReadContract, usePublicClient, useChainId } from "wagmi";
import AppNav from "@/components/AppNav";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked } from "viem";
import { useEffect, useState } from "react";
import { useNotifications } from "@/app/context/NotificationContext";
import { useRouter } from "next/navigation";
import { listBids } from "@/app/lib/bids";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [domains, setDomains] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const [refunds, setRefunds] = useState<any[]>([]);
  const chainId = useChainId();


  const { data: activeAuctions } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "getActiveAuctions",
  });

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      window.history.pushState(null, "", window.location.href);
    };
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

        const owner = (await publicClient.readContract({
        const owner = (await publicClient.readContract({
          address: CONTRACTS.registry.address,
          abi: CONTRACTS.registry.abi,
          functionName: "ownerOf",
          args: [namehash],
        })) as `0x${string}`;
        })) as `0x${string}`;

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

  useEffect(() => {
    if (!address || !publicClient) return;

    (async () => {
      const stored = listBids(chainId, address);
      const out = [];

      for (let item of stored) {
        const namehash = keccak256(encodePacked(["string"], [item.domain]));

        const [finalized, deposit] = await Promise.all([
    if (!address || !publicClient) return;

    (async () => {
      const stored = listBids(chainId, address);
      const out = [];

      for (let item of stored) {
        const namehash = keccak256(encodePacked(["string"], [item.domain]));

        const [finalized, deposit] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.auctionHouse.address,
            abi: CONTRACTS.auctionHouse.abi,
            functionName: "isFinalized",
            args: [namehash],
            address: CONTRACTS.auctionHouse.address,
            abi: CONTRACTS.auctionHouse.abi,
            functionName: "isFinalized",
            args: [namehash],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: CONTRACTS.auctionHouse.address,
            abi: CONTRACTS.auctionHouse.abi,
            functionName: "getDeposit",
            args: [namehash, address],
            address: CONTRACTS.auctionHouse.address,
            abi: CONTRACTS.auctionHouse.abi,
            functionName: "getDeposit",
            args: [namehash, address],
          }) as Promise<bigint>,
        ]);

        if (finalized && deposit > 0n) {
          out.push({ domain: item.domain, namehash, deposit });
        }
      }

      setRefunds(out);
    })();
  }, [address, chainId, publicClient]);
        ]);

        if (finalized && deposit > 0n) {
          out.push({ domain: item.domain, namehash, deposit });
        }
      }

      setRefunds(out);
    })();
  }, [address, chainId, publicClient]);

  const auctions = [
    { name: "kevin.ntu", phase: "Currently in Reveal Phase" },
    { name: "lim.ntu", phase: "Finalization Required" },
  ];

  return (
    <>
      <AppNav />
      <div className="pt-10 px-8 flex justify-center">
        <div className="max-w-5xl w-full font-mono text-lg space-y-8 text-[var(--foreground)]">

          {/* Header */}
          <div className="rounded-xl border shadow-md bg-[var(--background)] text-[var(--foreground)] p-10 space-y-10">
            <h1 className="text-2xl font-extrabold text-center">My Domain Dashboard</h1>


          {/* Header */}
          <div className="rounded-xl border shadow-md bg-[var(--background)] text-[var(--foreground)] p-10 space-y-10">
            <h1 className="text-2xl font-extrabold text-center">My Domain Dashboard</h1>

            {/* Wallet Info */}
            <div
              className="border rounded-lg p-5 flex items-center justify-between
              transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]
              hover:bg-gray-50 dark:hover:bg-gray-800/50"
              className="border rounded-lg p-5 flex items-center justify-between
              transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]
              hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center gap-4">
                <Wallet className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-60">Connected Wallet</p>
                  <p className="font-semibold break-all text-sm sm:text-base">
                    {address}
                    {address}
                  </p>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-6 text-center">
            <div
              className="border rounded-lg p-6 transition-all duration-200
              hover:shadow-md hover:-translate-y-[1px] hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <Globe className="w-10 h-10 opacity-80" />
              <h3 className="font-semibold mb-2 text-xl">Total Domains Owned</h3>
              <p className="text-2xl font-bold">{domains.length} Domains</p>
            </div>

            <div
              className="border rounded-lg p-6 transition-all duration-200
              hover:shadow-md hover:-translate-y-[1px] hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <Gavel className="w-10 h-10 opacity-80" />
              <h3 className="font-semibold mb-2 text-xl">Active Auctions Participated</h3>
              <p className="text-2xl font-bold">2 Auctions</p>
            </div>
          </div>

          {/* Owned Domains & Refunds */}
          <div className="grid grid-cols-2 gap-6">

          {/* Owned Domains & Refunds */}
          <div className="grid grid-cols-2 gap-6">
            {/* Owned Domains */}
            <div className="border rounded-lg p-6 transition-all duration-200
              hover:shadow-md hover:-translate-y-[1px] hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <BadgeCheck className="w-10 h-10 opacity-80" />
              <h3 className="font-semibold mb-4 text-2xl text-center">Owned Domains</h3>
              {domains.length === 0 ? (
                <p className="text-center pt-6 opacity-70">No domains owned yet.</p>
              ) : (
                domains.map((d) => (
                  <div key={d.name} className="border rounded-lg p-4 mb-4 text-base">
                    <div>| {d.name} | Registered ✅ |</div>
                    <div className="break-all text-sm">Address: {d.resolve}</div>

                    
                  </div>
                ))
              )}
                ))
              )}
            </div>

            {/* Pending Refunds */}
            <div className="border rounded-lg p-6 transition-all duration-200
              hover:shadow-md hover:-translate-y-[1px] hover:bg-gray-50 dark:hover:bg-gray-800/50">
               <Undo2 className="w-10 h-10 opacity-80" />
              <h3 className="font-semibold mb-4 text-2xl text-center">Pending Refunds</h3>
              {refunds.length === 0 ? (
                <p className="text-center pt-6 opacity-70">No refundable deposits.</p>
              ) : (
                refunds.map((r) => (
                  <div key={r.domain} className="border rounded-lg p-4 mb-4 text-base">
                    <div>
                      | {r.domain} | Refundable Deposit:{" "}
                      <span className="text-red-500">{r.deposit.toString()}</span> |
                    </div>
                    <div className="text-blue-600 mt-2 cursor-pointer hover:underline">
                      Withdraw →
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Auction Participation */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-4 text-2xl text-center">
              Auction Participation Status
            </h3>
            {auctions.map((a) => (
              <div
                key={a.name}
                className="border rounded-lg p-4 mb-3 text-base flex justify-between items-center"
              >
                <span>{a.name}</span>
                <span className="opacity-80">{a.phase}</span>
                
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
