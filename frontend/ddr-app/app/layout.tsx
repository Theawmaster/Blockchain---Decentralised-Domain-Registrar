"use client";

import { Web3Provider } from "@/lib/web3/Web3Provider";
import "./globals.css";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";

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
  const pathname = usePathname();
  const { address } = useAccount();

  const { disconnect } = useDisconnect();

  const getActive = (path: string) => pathname === path;

  return (
    <nav
      className="
        w-full flex items-center gap-4 px-6 py-3
        bg-[var(--background)] text-[var(--foreground)]
        border-b border-[var(--border)]
        backdrop-blur-md transition-colors
      "
    >
      {/* Left side links */}
      <div className="flex gap-3">
        <NavButton
          label="Register Domain"
          active={getActive("/screens/viewavailabledomainpage")}
          onClick={() => router.push("/screens/viewavailabledomainpage")}
        />

        <NavButton
          label="View Registered Domain"
          active={getActive("/screens/viewregistereddomainpage")}
          onClick={() => router.push("/screens/viewregistereddomainpage")}
        />

        <NavButton
          label="Domain Lookup"
          active={getActive("/screens/domainlookuppage")}
          onClick={() => router.push("/screens/domainlookuppage")}
        />
      </div>

      {/* Push right controls to the edge */}
      <div className="flex-1" />

      {/* Show logout only if wallet connected */}
      {address && (
        <button
          onClick={() => {
            disconnect();
            localStorage.removeItem("wagmi.store");   
            router.replace("/screens/authpage");      
          }}
          className="
            px-4 py-2 rounded-lg font-medium
            border border-[var(--border)]
            hover:bg-red-600 hover:text-white
            transition
          "
        >
          Logout
        </button>
      )}
    </nav>
  );
}

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg font-medium transition
        border border-[var(--border)]
        bg-[var(--card-bg)] text-[var(--foreground)]
        hover:bg-[var(--foreground)] hover:text-[var(--background)]
        ${active ? "bg-[var(--foreground)] text-[var(--background)]" : ""}
      `}
    >
      {label}
    </button>
  );
}
