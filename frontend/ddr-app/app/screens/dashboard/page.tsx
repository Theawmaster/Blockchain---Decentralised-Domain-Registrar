"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACTS } from "@/lib/web3/contract";

interface Domain {
  name: string;
  expiration: string;
  status: string;
}

export default function DomainList() {
  const [query, setQuery] = useState("");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [filtered, setFiltered] = useState<Domain[]>([]);

  // Example smart contract ABI and address (replace with your own)
  const CONTRACT_ADDRESS = CONTRACTS.registry.address as `0x${string}`;
  const CONTRACT_ABI = CONTRACTS.registry.abi;

  useEffect(() => {
    async function fetchDomains() {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const domainList = await contract.getAllDomains();

        const formatted = domainList.map((d: any) => ({
          name: d.name,
          expiration: new Date(Number(d.expiration) * 1000).toLocaleDateString(),
          status: d.active ? "Active" : "Expired",
        }));

        setDomains(formatted);
        setFiltered(formatted);
      } catch (err) {
        console.error("Failed to load domains:", err);
      }
    }

    fetchDomains();
  }, []);

  // Filtering
  useEffect(() => {
    const lower = query.toLowerCase();
    setFiltered(domains.filter((d) => d.name.toLowerCase().includes(lower)));
  }, [query, domains]);

  return (
    <div className="text-center">
      <div className="bg-sky-100 items-center justify-center">
            <p>hee</p>
        </div>  

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-sky-700 mb-6">
          Registered Domain Names
        </h1>

        <div className="flex justify-center mb-8">
          <input
            type="text"
            placeholder="Search by domain name..."
            className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-sky-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Domain</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Bid Time Remaining</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((domain, idx) => (
                  <tr key={idx} className="border-t hover:bg-sky-50 transition-all duration-150">
                    <td className="px-4 py-3 font-medium">{domain.name}</td>
                    <td className="px-4 py-3 text-gray-600">{domain.expiration}</td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        domain.status === "Active" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {domain.status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-500">
                    No domains found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
