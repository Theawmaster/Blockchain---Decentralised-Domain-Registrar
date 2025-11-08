"use client"
import { createConfig, WagmiProvider, http } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { injected } from "wagmi/connectors"

import {
  mainnet,
  sepolia,
  holesky,
  polygon,
  polygonMumbai,
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  zora,
  zoraSepolia,
  gnosis,
  scroll,
} from "wagmi/chains"

const queryClient = new QueryClient()

export const config = createConfig({
  chains: [
    sepolia,
    mainnet,
    holesky,
    polygon,
    polygonMumbai,
    optimism,
    optimismSepolia,
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia,
    zora,
    zoraSepolia,
    gnosis,
    scroll,
  ],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
    [holesky.id]: http(),
    [polygon.id]: http(),
    [polygonMumbai.id]: http(),
    [optimism.id]: http(),
    [optimismSepolia.id]: http(),
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [zora.id]: http(),
    [zoraSepolia.id]: http(),
    [gnosis.id]: http(),
    [scroll.id]: http(),
  },
})

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
