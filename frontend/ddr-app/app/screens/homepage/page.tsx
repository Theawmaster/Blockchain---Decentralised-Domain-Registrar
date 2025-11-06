"use client";

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

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [domains, setDomains] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refunds, setRefunds] = useState<any[]>([]);
  const chainId = useChainId();

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
          <div className="rounded-xl border shadow-md bg-[var(--background)] text-[var(--foreground)] p-10 space-y-10">
            <h1 className="text-2xl font-extrabold text-center">
              My Domain Dashboard
            </h1>

            {/* Wallet Info */}
            <div
              className="border rounded-lg p-5 flex items-center justify-between
              transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]
              hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
          <div className="grid grid-cols-2 gap-6">
            {/* Owned Domains */}
            <div
              className="border rounded-lg p-6 transition-all duration-200
              hover:shadow-md hover:-translate-y-[1px] hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <BadgeCheck className="w-10 h-10 opacity-80" />
                <h3 className="font-semibold text-2xl">Owned Domains</h3>
              </div>

              {domains.length === 0 ? (
                <p className="text-center pt-6 opacity-70">
                  No domains owned yet.
                </p>
              ) : (
                <div
                  className="h-[15rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 space-y-4"
                  style={{ paddingRight: "10px" }}
                >
                  {domains.map((d) => (
                    <div
                      key={d.name}
                      className="border rounded-lg p-4 text-base"
                    >
                      <div>
                        {d.name} |{" "}
                        {d.resolve ===
                        "0x0000000000000000000000000000000000000000" ? (
                          <span className="text-red-500">Not resolved ❌</span>
                        ) : (
                          <span className="text-green-600">Registered ✅</span>
                        )}{" "}
                        |{" "}
                        {d.expiryDate ? (
                          <>Expiry: {d.expiryDate}</>
                        ) : (
                          <span className="text-gray-500">No expiry data</span>
                        )}
                      </div>
                      <div className="break-all text-sm">
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
              className="border rounded-lg p-6 transition-all duration-200
              hover:shadow-md hover:-translate-y-[1px] hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <Undo2 className="w-10 h-10 opacity-80" />
                <h3 className="font-semibold text-2xl">Pending Refunds</h3>
              </div>

              {refunds.length === 0 ? (
                <p className="text-center pt-6 opacity-70">
                  No refundable deposits.
                </p>
              ) : (
                <div
                  className="h-[15rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 space-y-4"
                  style={{ paddingRight: "10px" }}
                >
                  {refunds.map((r) => (
                    <div
                      key={r.domain}
                      className="border rounded-lg p-4 text-base"
                    >
                      <div>
                        {r.domain} | Refundable Deposit:{" "}
                        <span className="text-red-500">
                          {formatEther(r.deposit)}
                        </span>{" "}
                        ETH
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Auction Participation */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-4 text-2xl text-center">
              Ongoing Auctions
            </h3>

            <div className="grid grid-cols-2 font-semibold text-center border-b pb-2 mb-2">
              <div>Domain Name</div>
              <div>Status</div>
            </div>

            <div
              className="h-[15rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 space-y-2"
              style={{ paddingRight: "10px" }}
            >
              {loadingAuctions ? (
                <p className="text-center py-4 opacity-70">
                  Loading auctions...
                </p>
              ) : auctionData.length === 0 ? (
                <p className="text-center py-4 opacity-70">
                  No ongoing auctions.
                </p>
              ) : (
                auctionData.map((a) => (
                  <div
                    key={a.namehash}
                    className="grid grid-cols-2 border rounded-lg p-4 text-base items-center text-center"
                  >
                    <span>{a.domain}</span>
                    <span className="opacity-80">{getPhase(a)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
