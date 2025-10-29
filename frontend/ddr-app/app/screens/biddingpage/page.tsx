"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/web3/contract";
import { hashBid } from "@/lib/web3/auctionUtils";
import { keccak256, toBytes, parseEther } from "viem";

export default function BiddingPage() {
  const params = useSearchParams();
  const name = params.get("name") as string;
  const namehash = keccak256(toBytes(name)); // ✅ CONVERT TO BYTES32

  const router = useRouter();
  const { address } = useAccount();

  const [phase, setPhase] = useState<"commit"|"reveal"|"ended">("commit");
  const [bid, setBid] = useState("");
  const [salt, setSalt] = useState("");
  const [message, setMessage] = useState("");

  // Load auction end time
  const { data: endTime } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "auctionEnd",
    args: [namehash],
  });

  // Load finalized state
  const { data: finalized } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "isFinalized",
    args: [namehash],
  });

  // Highest Bid
  const { data: highestBid } = useReadContract({
    address: CONTRACTS.auctionHouse.address,
    abi: CONTRACTS.auctionHouse.abi,
    functionName: "getHighestBid",
    args: [namehash],
  });

  // Determine phase
  useEffect(() => {
    if (!endTime) return;
    const now = Math.floor(Date.now() / 1000);

    if (finalized) setPhase("ended");
    else if (now < Number(endTime)) setPhase("commit");
    else setPhase("reveal");
  }, [endTime, finalized]);

  // Contracts
  const { writeContractAsync } = useWriteContract();

  async function handleCommit() {
    if (!bid || !salt) return setMessage("⚠ Enter a bid and salt.");

    const commitHash = hashBid(name, bid, salt, address!);

    try {
      await writeContractAsync({
        address: CONTRACTS.auctionHouse.address,
        abi: CONTRACTS.auctionHouse.abi,
        functionName: "commitBid",
        args: [namehash, commitHash],
        value: parseEther(bid)
      });
      setMessage("✅ Bid committed! DO NOT lose your salt.");
    } catch {
      setMessage("❌ Commit failed.");
    }
  }

  async function handleReveal() {
    try {
      await writeContractAsync({
        address: CONTRACTS.auctionHouse.address,
        abi: CONTRACTS.auctionHouse.abi,
        functionName: "revealBid",
        args: [name, parseEther(bid), salt],
      });
      setMessage("✅ Reveal submitted!");
    } catch {
      setMessage("❌ Reveal failed.");
    }
  }

  async function handleFinalize() {
    try {
      await writeContractAsync({
        address: CONTRACTS.auctionHouse.address,
        abi: CONTRACTS.auctionHouse.abi,
        functionName: "finalizeAuction",
        args: [name],
      });
      setMessage("✅ Auction finalized! Winner now owns the domain.");
    } catch {
      setMessage("❌ Finalize failed.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-10">
      <h1 className="text-3xl font-bold text-center mb-6">{name}.ntu Auction</h1>

      {phase === "commit" && (
        <>
          <input value={bid} onChange={e=>setBid(e.target.value)} placeholder="Bid (ETH)" className="input"/>
          <input value={salt} onChange={e=>setSalt(e.target.value)} placeholder="Secret Salt" className="input"/>
          <button onClick={handleCommit} className="btn-primary">Commit Bid</button>
        </>
      )}

      {phase === "reveal" && (
        <>
          <input value={bid} onChange={e=>setBid(e.target.value)} placeholder="Bid (ETH)" className="input"/>
          <input value={salt} onChange={e=>setSalt(e.target.value)} placeholder="Secret Salt" className="input"/>
          <button onClick={handleReveal} className="btn-primary">Reveal Bid</button>
        </>
      )}

      {phase === "ended" && (
        <>
          <p>Highest Bid: {highestBid ? (Number(highestBid)/1e18).toFixed(4) : "Loading"} ETH</p>
          <button onClick={handleFinalize} className="btn-primary">Finalize Auction</button>
        </>
      )}

      {message && <p className="text-center mt-4 text-sky-700">{message}</p>}
    </div>
  );
}
