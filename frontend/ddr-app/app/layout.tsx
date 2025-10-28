"use client";

import {Web3Provider} from "@/lib/web3/Web3Provider";
import "./globals.css";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
            <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}

export function Layout() {
  const router = useRouter();

  const pathname = usePathname(); // current path

  const getActive = (path: string) => pathname === path;
  return (
    <div className="bg-sky-600 flex flex-wrap items-center justify-start gap-4">
            <div className="flex gap-4">
              <button 
              onClick={() => router.push("/screens/viewavailabledomainpage")}
              className={`w-90 outline outline-2 outline-transparent hover:outline-black font-bold ${getActive('/screens/viewavailabledomainpage') ? 'bg-white' : 'bg-transparent'} text-black py-10 rounded-lg hover:bg-white transition`}>
                Register Domain
              </button>
              <button 
              onClick={() => router.push("/screens/viewregistereddomainpage")}
              className={`w-90 outline outline-2 outline-transparent hover:outline-black font-bold ${getActive('/screens/viewregistereddomainpage') ? 'bg-white' : 'bg-transparent'} text-black py-10 rounded-lg hover:bg-white transition`}>
                View Registered Domain
              </button>
               <button 
              onClick={() => router.push("/screens/domainlookuppage")}
              className={`w-90 outline outline-2 outline-transparent hover:outline-black font-bold ${getActive('/screens/domainlookuppage') ? 'bg-white' : 'bg-transparent'} text-black py-10 rounded-lg hover:bg-white transition`}>
                Domain Lookup
              </button>
              </div>
              <button 
              onClick={() => router.push("/screens/viewwalletdetailpage")}
          className={`mr-6 w-90 outline outline-2 outline-transparent hover:outline-black font-bold ${getActive('/screens/viewwalletdetailpage') ? 'bg-white' : 'bg-transparent'} text-black py-10 rounded-lg hover:bg-white transition ml-auto`}>
                View Wallet Details
              </button>
            
        </div>
  );
}
