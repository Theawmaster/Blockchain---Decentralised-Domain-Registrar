"use client";

import { Copy, Wallet, ArrowLeft } from "lucide-react";
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

  useEffect(() => {
      if (!address || !publicClient) return; // ✅ prevent undefined crash
  
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
          }) as Promise<boolean>,
          publicClient.readContract({
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


  const auctions = [
    { name: "kevin.ntu", phase: "Currently in Reveal Phase" },
    { name: "lim.ntu", phase: "Finalization Required" },
  ];

  return (
    <>
      <AppNav />
      <div className="pt-10 px-8 flex justify-center">
        <div className="max-w-5xl w-full font-mono text-lg space-y-8 text-[var(--foreground)]">
          <div className="max-w-5xl w-full rounded-xl border shadow-md
          bg-[var(--background)] text-[var(--foreground)] p-10 space-y-10">
            <h1 className="text-2xl font-extrabold text-center">
                My Domain Dashboard
            </h1>
            {/* Wallet Info */}
            <div
                className="border rounded-lg p-5 flex items-center justify-between
                transition-all duration-200
                hover:shadow-md hover:-translate-y-[1px]
                hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center gap-4">
                <Wallet className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-60">Connected Wallet</p>
                  <p className="font-semibold break-all text-sm sm:text-base">
                  {address}
                  </p>
                </div>
              </div>           
            </div>
          </div>
          <hr className="my-10 border-t border-gray-300 dark:border-gray-700" />
          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 text-center text-lg">
            <div className="border rounded-xl p-6">
              ╭────────────────────────────╮<br />
              │  Total Domains Owned        │<br />
              │  <strong className="text-2xl">{domains.length} Domains</strong> │<br />
              ╰────────────────────────────╯
            </div>
            <div className="border rounded-xl p-6">
              ╭────────────────────────────╮<br />
              │  Active Auctions Participated │<br />
              │  <strong className="text-2xl">2 Auctions</strong> │<br />
              ╰────────────────────────────╯
            </div>
          </div>
          <hr className="my-10 border-t border-gray-300 dark:border-gray-700" />
          {/* Dashboard: Owned Domains & Pending Refunds */}
          <div className="grid grid-cols-2 gap-6 text-center text-lg">
            {/* Owned Domains */}
            <div className="border rounded-xl p-6">
              <section>
                <h3 className="font-semibold mt-2 mb-4 text-2xl">Owned Domains</h3>
                {domains.map((d) => (
                  <div
                    key={d.name}
                    className="border rounded-xl p-6 mb-4 text-lg"
                  >
                    | {d.name} | Registered ✅ | Expires: {d.expires} |<br />
                    <div className="text-lg break-all">
                      | Address: {d.resolve} |
                    </div>

                    <div className="flex gap-4 mt-3 justify-center">
                      <span
                        className="text-blue-600 cursor-pointer hover:underline"
                        onClick={() => router.push(`/screens/viewregistereddomainpage`)}
                      >
                      | → Transfer Owner |
                      </span>

                      <span
                        className="text-blue-600 cursor-pointer hover:underline"
                        onClick={() => router.push(`/screens/viewregistereddomainpage`)}
                      >
                      | → Set Resolve Address |
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            </div>

            {/* Pending Refunds */}
            <div className="border rounded-xl p-6">
              <section>
                <h3 className="font-semibold mt-2 mb-4 text-2xl">Pending Refunds</h3>
                {refunds.length === 0 ? (
                  <p className="text-center pt-9">No refundable deposits.</p>
              ) : (
                refunds.map((r) => (
                  <div
                    key={r.name}
                    className="border rounded-xl p-6 mb-4 text-lg"
                  >
                    | {r.name} | Refundable Deposit: <span className="text-red-500">{r.deposit}</span> |<br />
                    | → Withdraw → |
                  </div>
                ))
              )}
              </section>
            </div>
          </div>
          
          {/* Auction Participation Status */}

          <div className="border rounded-xl p-6">
            <section>
              <h3 className="font-semibold mt-2 mb-4 text-2xl text-center">Auction Participation Status</h3>
              {auctions.map((a) => (
                <div
                  key={a.name}
                  className="border rounded-xl p-5 mb-3 text-lg flex justify-between items-center"
                >
                  <span>| {a.name} |</span>
                  <span>| {a.phase} |</span>
                  <button>
                    | {a.phase.includes("Reveal") ? "Reveal Now →" : "Finalize →"} |
                  </button>
                </div>
              ))}
            </section>
          </div>

        </div>
      </div>
    </>
  );
}
