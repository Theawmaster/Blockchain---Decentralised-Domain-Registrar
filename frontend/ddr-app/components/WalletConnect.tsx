"use client"
import { useState } from "react"
import {useAccount, useConnect, useDisconnect} from "wagmi";

export default function WalletConnect({ onAddWallet }: {
    onAddWallet: (address: string) => void
}) {
    const {connectAsync, connectors, status , reset, error} = useConnect();
    const { disconnect } = useDisconnect();
    const handleConnect = async () => {
        try {
            disconnect(); // Disconnect any existing connection
            const connector = connectors[0]; // Assuming the first connector is the one we want
            const data = await connectAsync({ connector });
            onAddWallet(data?.accounts?.[0]);
        } catch (error) {
            reset()
            console.error("Failed to connect wallet:", error);
            console.log(error)
        }
    }


    return (
        <div className="max-w-xl w-full mx-auto mt-20 p-5 bg-sky-50 rounded-2xl shadow-md">
        <h2 className="text-3xl font-bold text-black mb-4">Login</h2>

        <div className="text-center">
          <button onClick={handleConnect}
  style={{ backgroundColor: '#228B22', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '10px' }}
>
  Connect Using MetaMask 
</button>



            {error && <p className="text-red-600 mt-3 text-sm">{error.message}</p>}
        </div>
        </div>

    )
}
