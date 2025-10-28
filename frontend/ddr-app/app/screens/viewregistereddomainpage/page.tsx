"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/app/layout";

interface Domain {
  name: string;
  Address: string;
  ETH: string;
}

export default function DomainList() {
  const [domains, setDomains] = useState<Domain[]>([
    // Example data, replace with actual domain data
    { name: "example1.eth", Address: "0x123...", ETH: "1.5" },
    { name: "example2.eth", Address: "0x456...", ETH: "0.8" },
  ]);
  const [query, setQuery] = useState("");

  // Filter domains based on search query
  const filtered = domains.filter((domain) =>
    domain.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="text-center">
      <Layout />

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8 pt-9">
        <h1 className="text-3xl font-bold text-center text-sky-700 mb-6">
          All Registered Domains
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
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Address</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">ETH</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((domain, idx) => (
                  <tr key={idx} className="border-t hover:bg-sky-50 transition-all duration-150">
                    <td className="text-left px-4 py-3 font-medium">{domain.name}</td>
                    <td className="text-left px-4 py-3 text-gray-600">{domain.Address}</td>
                    <td className="text-left px-4 py-3 font-semibold">{domain.ETH}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-gray-500">
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
