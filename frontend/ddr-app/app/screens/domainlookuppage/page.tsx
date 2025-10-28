"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { Layout } from "@/app/layout";
import {Copy, Send, Wallet, ExternalLink, X} from "lucide-react";
import SendTransaction from "@/components/SendTransaction";
// Replace with your actual contract details
const CONTRACT_ADDRESS = "0xYourContractAddressHere";
const CONTRACT_ABI = [
  {
    inputs: [{ name: "name", type: "string" }],
    name: "resolveDomain",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

export default function domainlookuppage() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [owner, setOwner] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
  // Call the contract only when the user clicks "Search"
  const { data, refetch, isFetching } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "resolveDomain",
    args: [domain],
    query: { enabled: false }, // only run manually
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    setDomain(query.trim());
    const result = await refetch();
    if (result?.data) setOwner(result.data as string);
    else setOwner(null);
  };

  return (
    <div className="text-center">
    <Layout/>
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8 pt-9">
        <h1 className="pt-9 pb-9 text-3xl font-bold">Search Registered Domain</h1>

        <div className="flex gap-3 justify-center w-full ">
          <input
            type="text"
            placeholder="Enter domain (e.g., ivan.ntu)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border border-gray-400 rounded-lg px-4 py-2 w-80 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={handleSearch}
            disabled={isFetching}
            className="bg-sky-600 text-white px-5 py-2 rounded-lg hover:bg-sky-700 transition disabled:opacity-50"
          >
            {isFetching ? "Searching..." : "Search"}
          </button>
        </div>

        {owner && (
          <div className="bg-gray-100 p-4 rounded-lg mt-4">
            <p className="font-semibold">Owner Address:</p>
            <p className="font-mono text-sm break-all">{owner}</p>
            <div className="flex flex-col gap-4 sm:flex-row">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                >
                    <Send className="w-4 h-4"/> Send Money
                </button>

            </div>
          </div>
        )}

        {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100"
                        >
                            <X className="w-5 h-5"/>
                        </button>
                        <SendTransaction/>
                    </div>
                </div>
            )}

        {owner === null && domain && !isFetching && (
          <p className="text-red-500 mt-4">Domain not found or unregistered.</p>
        )}
      </div>
    </div>
  );
}
