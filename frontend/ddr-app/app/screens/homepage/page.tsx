"use client";

// imports here
import { Wallet, Globe, Gavel, BadgeCheck, Undo2 } from "lucide-react";
import {
  useAccount,
  useReadContract,
  usePublicClient,
  useChainId,
} from "wagmi";
import AppNav from "@/components/AppNav";
import { CONTRACTS } from "@/lib/web3/contract";
import { keccak256, encodePacked } from "viem";
import { useEffect, useState } from "react";
import { listBids } from "@/app/lib/bids";
import { formatEther } from "viem";
import { useRouter } from "next/navigation";

export default function HomePage() {
  // ---------------- Hooks & State ----------------
  const { address, isConnected, status } = useAccount(); // get connection status
  const router = useRouter(); // next router
  const publicClient = usePublicClient(); // viem public client
  const [domains, setDomains] = useState<any[]>([]); // owned domains
  const [loaded, setLoaded] = useState(false); // loading state
  const [refunds, setRefunds] = useState<any[]>([]); // refundable deposits
  const chainId = useChainId(); // get current chain ID

  // ---------------- Redirect if Not Connected ----------------
  useEffect(() => {
    // Wait until wagmi finishes determining connection status
    if (status === "connecting") return;

    if (!isConnected || !address) {
      router.push("/screens/authpage");
    }
  }, [isConnected, status, address, router]);

  // ---------------- Prevent Back Navigation ----------------
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
        const namehash = keccak256(
          encodePacked(["string"], [name])
        ) as `0x${string}`;

        const owner = (await publicClient.readContract({
          address: CONTRACTS.registry.address,
          abi: CONTRACTS.registry.abi,
          functionName: "ownerOf",
          args: [namehash],
        })) as `0x${string}`;

        if (owner.toLowerCase() === address.toLowerCase()) {
          const [resolve, expiry] = await Promise.all([
            publicClient.readContract({
              address: CONTRACTS.registry.address,
              abi: CONTRACTS.registry.abi,
              functionName: "resolve",
              args: [name],
            }) as Promise<`0x${string}`>,
            publicClient.readContract({
              address: CONTRACTS.auctionHouse.address,
              abi: CONTRACTS.auctionHouse.abi,
              functionName: "expiration",
              args: [namehash],
            }) as Promise<bigint>,
          ]);

          let expiryDate = null;
          if (expiry > 0n) {
            expiryDate = new Date(Number(expiry) * 1000).toLocaleDateString(
              "en-GB"
            );
          }

          owned.push({ name, namehash, resolve, expiryDate });
        }
      }

      setDomains(owned);
      setLoaded(true);
    })();
  }, [address, publicClient]);

  // ---------------- Fetch Refunds ----------------
  useEffect(() => {
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

  // ---------------- Auctions ----------------
  const [auctionData, setAuctionData] = useState<any[]>([]);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: hashes, isLoading: loadingAuctions } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "getActiveAuctions",
  });

  useEffect(() => {
    async function load() {
      if (!publicClient || !hashes || !Array.isArray(hashes)) return;

      const result = await Promise.all(
        hashes.map(async (h: `0x${string}`) => {
          const info = await publicClient.readContract({
            address: CONTRACTS.auctionHouse.address,
            abi: CONTRACTS.auctionHouse.abi,
            functionName: "getAuctionInfo",
            args: [h],
          });

          const [domain, commitEnd, revealEnd] = info as [
            string,
            bigint,
            bigint
          ];
          return {
            namehash: h,
            domain,
            commitEnd: Number(commitEnd),
            revealEnd: Number(revealEnd),
          };
        })
      );
      setAuctionData(result);
    }
    load();
  }, [hashes, publicClient]);

  function getPhase(a: any) {
    if (now < a.commitEnd) return "Commit Phase";
    if (now < a.revealEnd) return "Reveal Phase";
    return "Finalization Required";
  }

  // ---------------- UI ----------------
  return (
    <>
      <AppNav />
      <div className="pt-10 px-8 flex justify-center">
        <div className="max-w-5xl w-full font-mono text-lg space-y-8 text-[var(--foreground)]">
          {/* Header */}
          <div
            className="rounded-xl border shadow-md bg-[var(--background)] text-[var(--foreground)] p-10 space-y-10 hover:shadow-md hover:-translate-y-[1px] 
  hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <h1 className="text-2xl font-extrabold text-center ">
              My Domain Dashboard
            </h1>

            {/* Wallet Info */}
            <div
              className="border rounded-lg p-5 flex items-center justify-between
              transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <Wallet className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-sm opacity-60">Connected Wallet</p>
                  {address ? (
                    <p className="font-semibold break-all text-sm sm:text-base">
                      {address}
                    </p>
                  ) : (
                    <p className="font-semibold break-all text-sm sm:text-base">
                      —
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className="border rounded-xl p-8 text-center w-full 
  transition-all duration-200 hover:shadow-md hover:-translate-y-[1px] 
  hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <Globe className="w-12 h-12 opacity-80" />
              <h3 className="font-bold text-2xl">Total Domains Owned</h3>
              <p className="text-3xl font-extrabold text-[var(--foreground)]">
                {domains.length} Domains
              </p>
            </div>
          </div>

          {/* Owned Domains & Refunds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Owned Domains */}
            <div
              className="border rounded-xl p-6 shadow-sm
            bg-[var(--background)] text-[var(--foreground)]
            transition-all duration-200 hover:shadow-md hover:-translate-y-[1px] 
  hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center gap-3 mb-5">
                <BadgeCheck className="w-10 h-10" />
                <h3 className="font-semibold text-xl">Owned Domains</h3>
              </div>

              {domains.length === 0 ? (
                <p className="text-center py-6 opacity-65 italic">
                  No domains owned yet.
                </p>
              ) : (
                <div
                  className="space-y-4 h-[16rem] overflow-y-auto scrollbar-thin 
                              scrollbar-thumb-gray-400/60 scrollbar-track-transparent
                              dark:scrollbar-thumb-gray-600/50"
                >
                  {[...domains].reverse().map((d) => (
                    <div
                      key={d.name}
                      className="rounded-lg border p-4 bg-white/60 dark:bg-white/5 
                              backdrop-blur-sm 
                              "
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-medium">{d.name}</p>

                        {d.resolve ===
                        "0x0000000000000000000000000000000000000000" ? (
                          <span className="text-xs px-2 py-1 rounded-md bg-red-100 text-red-600">
                            Not Resolved
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-md bg-green-100 text-green-700">
                            Registered
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm opacity-70">
                        Expiry: {d.expiryDate ? d.expiryDate : "—"}
                      </div>

                      <div className="mt-1 text-sm break-all opacity-65">
                        Address:{" "}
                        {d.resolve ===
                        "0x0000000000000000000000000000000000000000"
                          ? "—"
                          : d.resolve}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Refunds */}
            <div
              className="border rounded-xl p-6 shadow-sm
            bg-[var(--background)] text-[var(--foreground)]
            transition-all duration-200 hover:shadow-md hover:-translate-y-[2px] 
            hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center gap-3 mb-5">
                <Undo2 className="w-7 h-7 opacity-80" />
                <h3 className="font-semibold text-xl">Pending Refunds</h3>
              </div>

              {refunds.length === 0 ? (
                <p className="text-center py-6 opacity-65 italic">
                  No refundable deposits.
                </p>
              ) : (
                <div
                  className="space-y-4 h-[16rem] overflow-y-auto scrollbar-thin 
                              scrollbar-thumb-gray-400/60 scrollbar-track-transparent
                              dark:scrollbar-thumb-gray-600/50"
                >
                  {[...refunds].reverse().map((r) => (
                    <div key={r.domain} className="rounded-lg border p-4">
                      <div className="flex justify-between items-center">
                        <p className="font-medium">{r.domain}</p>

                        <span
                          className="text-xs px-2 py-1 rounded-md 
                                      bg-orange-200 text-orange-200 dark:bg-orange-700/40 dark:text-orange-700"
                        >
                          Refundable
                        </span>
                      </div>

                      <div className="mt-2 text-sm opacity-70">
                        Amount: {formatEther(r.deposit)} ETH
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Auction Participation */}
          <div
            className="border rounded-xl p-6 shadow-sm
            bg-[var(--background)] text-[var(--foreground)]
            transition-all duration-200 hover:shadow-md hover:-translate-y-[2px] 
            hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <div className="flex items-center gap-3 mb-5">
              <Gavel className="w-7 h-7 opacity-80" />
              <h3 className="font-semibold text-xl">Ongoing Auctions</h3>
            </div>

            <div className="grid grid-cols-2 font-semibold text-sm border-b pb-2 mb-3 opacity-80">
              <div>Domain Name</div>
              <div className="text-right pr-2">Status</div>
            </div>

            <div
              className="space-y-3 h-[16rem] overflow-y-auto scrollbar-thin 
                scrollbar-thumb scrollbar-track-transparent
                dark:scrollbar"
            >
              {loadingAuctions ? (
                <p className="text-center py-4 opacity-65 italic">
                  Loading auctions...
                </p>
              ) : auctionData.length === 0 ? (
                <p className="text-center py-4 opacity-65 italic">
                  No ongoing auctions.
                </p>
              ) : (
                [...auctionData].reverse().map((a) => {
                  const status = getPhase(a);

                  const statusStyle =
                    status === "Commit Phase"
                      ? "bg-blue-100 text-blue-400 dark:bg-blue-900/40 dark:text-blue-800"
                      : status === "Reveal Phase"
                      ? "bg-yellow-100 text-yellow-400 dark:bg-yellow-900/40 dark:text-yellow-800"
                      : "bg-red-100 text-red-400 dark:bg-red-900/40 dark:text-red-700";

                  return (
                    <div
                      key={a.namehash}
                      className="border rounded-lg p-4 
                        transition-all duration-150"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{a.domain}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded-md ${statusStyle}`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="w-full py-6 mt-16 border-t text-center text-sm opacity-70
        bg-[var(--background)] text-[var(--foreground)]"
      >
        Developed by <span className="font-semibold">Alvin</span>,{" "}
        <span className="font-semibold">Fernando</span> and{" "}
        <span className="font-semibold">Ivan</span> from NTU &copy; 2025
      </footer>
    </>
  );
}
