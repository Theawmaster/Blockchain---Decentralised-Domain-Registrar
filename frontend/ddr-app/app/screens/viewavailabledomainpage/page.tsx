"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Domain {
  name: string;
  expiration: string;
  status: string;
}

export default function ViewAvailableDomainPage() {
  const [query, setQuery] = useState("");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [filtered, setFiltered] = useState<Domain[]>([]);
  const router = useRouter();

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

  useEffect(() => {
    const lower = query.toLowerCase();
    setFiltered(domains.filter((d) => d.name.toLowerCase().includes(lower)));
  }, [query, domains]);

  return (
    <div className="flex justify-center pt-14 px-4">
      <div className="max-w-5xl w-full rounded-xl border shadow-sm 
        bg-[var(--background)] text-[var(--foreground)] transition-colors p-8">

        <h1 className="text-3xl font-bold text-center mb-6">
          All Bidding Domain Names
        </h1>

        {/* Search Input */}
        <div className="flex justify-center mb-8">
          <input
            type="text"
            placeholder="Search by domain name..."
            className="w-full max-w-md rounded-lg px-4 py-2 border
            border-gray-400 dark:border-gray-600
            bg-[var(--background)] text-[var(--foreground)]
            focus:ring-2 focus:ring-sky-500 focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Domain</th>
                <th className="px-4 py-2 text-left font-medium">Expiration</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((domain, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition"
                    onClick={() =>
                      router.push(
                        `/screens/biddingpage?name=${encodeURIComponent(
                          domain.name
                        )}&expiration=${encodeURIComponent(
                          domain.expiration
                        )}&status=${encodeURIComponent(domain.status)}`
                      )
                    }
                  >
                    <td className="px-4 py-3 font-medium">{domain.name}</td>
                    <td className="px-4 py-3 opacity-80">{domain.expiration}</td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        domain.status === "Active"
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {domain.status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-6 opacity-70">
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
