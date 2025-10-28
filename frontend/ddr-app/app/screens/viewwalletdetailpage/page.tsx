"use client";

import {useAccount, useBalance} from "wagmi";
import {useState} from "react";
import {Copy, Send, Wallet, ExternalLink, X} from "lucide-react";
import {redirect} from "next/navigation";
import { Layout } from "@/app/layout";

// import SendTransaction from "@/components/SendTransaction";

export default function DashboardPage() {
    const {address, isConnected} = useAccount();
    const {data: balance} = useBalance({address});


    const handleCopy = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            alert("Wallet address copied!");
        }
    };

    if (!isConnected) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="p-6 border rounded-lg shadow-md text-center w-full max-w-sm">
                    <p className="text-lg font-semibold">No wallet connected</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Please connect your wallet to view your dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-center">
              <Layout/>
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8 pt-9">
                <h1 className="text-3xl font-bold text-center text-sky-700 mb-6">
                Dashboard
                </h1>
                {/* Wallet Info */}
                <div className="border rounded-lg shadow-md p-4 sm:p-6 flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4 w-full">
                        <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600"/>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-500">Connected Wallet</p>
                            <p className="font-semibold text-sm sm:text-base break-all ">{address}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="p-2 border rounded-lg hover:bg-gray-100 flex-shrink-0"
                    >
                        <Copy className="w-4 h-4"/>
                    </button>
                </div>
                {/* Balance Info */}
                <div className="border rounded-lg shadow-md p-4 sm:p-6">
                    <p className="text-sm text-gray-500">Total Balance</p>
                    <p className="text-xl sm:text-2xl font-bold mt-2">
                        {balance ? `${balance.formatted} ${balance.symbol}` : "Loading..."}
                    </p>
                </div>
            </div>
        </div>
    );
}
