"use client";

import { useSwitchChain } from "wagmi";

export default function NetworkSwitcher() {
  const { chains, switchChain } = useSwitchChain();  

  return (
    <select
      onChange={(e) => switchChain({ chainId: Number(e.target.value) })}
      className="
        px-3 py-2 border rounded-md
        bg-[var(--background)] text-[var(--foreground)]
        hover:bg-[var(--foreground)] hover:text-[var(--background)]
        transition cursor-pointer
      "
    >
      {chains.map((chain) => (
        <option key={chain.id} value={chain.id}>
          {chain.name}
        </option>
      ))}
    </select>
  );
}
