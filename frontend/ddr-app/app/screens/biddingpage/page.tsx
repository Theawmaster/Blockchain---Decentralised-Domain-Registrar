"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Layout } from "@/app/layout";

export default function BiddingPage() {
  const params = useSearchParams();
  const name = params.get("name");
  const expiration = params.get("expiration");
  const status = params.get("status");

  const [bidPrice, setBidPrice] = useState("");
  const [message, setMessage] = useState("");
  const [winningBid, setWinningBid] = useState<number | null>(null);

  // Fetch winning bid (placeholder logic — replace with Ethereum contract call)
  useEffect(() => {
    if (status === "Expired") {
      // Simulate fetching data from Ethereum
      const fetchWinningBid = async () => {
        // Example placeholder — replace with contract call
        const fakeWinningBid = 2.35; 
        setWinningBid(fakeWinningBid);
      };
      fetchWinningBid();
    }
  }, [status]);

  const handleBid = () => {
    if (!bidPrice || isNaN(Number(bidPrice)) || Number(bidPrice) <= 0) {
      setMessage("⚠️ Please enter a valid bid amount.");
      return;
    }
    setMessage(`✅ Your bid of ${bidPrice} ETH for ${name} has been submitted!`);
    setBidPrice("");
  };

  return (
    <div className="text-center">
      <Layout />

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-10">
        <h1 className="text-3xl font-bold text-sky-700 mb-4">
          Domain Bidding Page
        </h1>
        <p className="text-gray-600 mb-8">
          Review the domain details and place your bid below.
        </p>

        {/* Domain Info Section */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-6 text-left mb-8">
          <p className="text-lg mb-2">
            <strong>Domain Name:</strong> {name || "N/A"}
          </p>
          <p className="text-lg mb-2">
            <strong>Expiration:</strong> {expiration || "N/A"}
          </p>
          <p className="text-lg mb-2">
            <strong>Status:</strong>{" "}
            <span
              className={`${
                status === "Active" ? "text-green-600" : "text-red-500"
              } font-semibold`}
            >
              {status || "N/A"}
            </span>
          </p>
        </div>

        {/* Conditional Display */}
        {status === "Active" ? (
          <div className="flex flex-col items-center gap-4">
            <input
              type="number"
              step="0.01"
              placeholder="Enter your bid price (ETH)"
              className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              value={bidPrice}
              onChange={(e) => setBidPrice(e.target.value)}
            />

            <button
              onClick={handleBid}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-8 py-3 rounded-lg transition"
            >
              Submit Bid
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-lg text-gray-700 mb-2">
              🏁 <strong>This auction has ended.</strong>
            </p>
            {winningBid !== null ? (
              <p className="text-xl font-semibold text-sky-700">
                Winning Bid: {winningBid} ETH
              </p>
            ) : (
              <p className="text-gray-500">Fetching winning bid...</p>
            )}
          </div>
        )}

        {/* Result Message */}
        {message && (
          <div className="mt-6 text-lg font-medium text-gray-700">{message}</div>
        )}
      </div>
    </div>
  );
}
