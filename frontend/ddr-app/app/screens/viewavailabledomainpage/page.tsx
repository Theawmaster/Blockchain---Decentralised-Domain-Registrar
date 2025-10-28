"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/app/layout";
import { useRouter } from "next/navigation";

interface Domain {
  name: string;
  expiration: string;
  status: string;
}

export default function DomainList() {
  const [query, setQuery] = useState("");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [filtered, setFiltered] = useState<Domain[]>([]);
  const router = useRouter();
  // Load domains from local JSON file
  useEffect(() => {
    async function loadDomains() {
      try {
        const res = await fetch("/domains.json");
        const data = await res.json();
        setDomains(data);
        setFiltered(data);
      } catch (err) {
        console.error("Error loading domains:", err);
      }
    }
    loadDomains();
  }, []);

  // Filter domains based on search query
  useEffect(() => {
    const lower = query.toLowerCase();
    setFiltered(domains.filter((d) => d.name.toLowerCase().includes(lower)));
  }, [query, domains]);

  return (
    <div className="text-center">
       
      <Layout/>


      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8 pt-9">
        <h1 className="text-3xl font-bold text-center text-sky-700 mb-6">
          All Bidding Domain Names
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
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Expiration</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((domain, idx) => (
                  <tr key={idx} className="border-t hover:bg-sky-50 transition-all duration-150" onClick={() =>
                    router.push(
                      `/screens/biddingpage?name=${encodeURIComponent(
                        domain.name
                      )}&expiration=${encodeURIComponent(
                        domain.expiration
                      )}&status=${encodeURIComponent(domain.status)}`
                    )
                  }>
                    <td className="text-left px-4 py-3 font-medium">{domain.name}</td>
                    <td className="text-left px-4 py-3 text-gray-600">{domain.expiration}</td>
                    <td
                      className={`text-left px-4 py-3 font-semibold ${
                        domain.status === "Active" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {domain.status}
                    </td>
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
