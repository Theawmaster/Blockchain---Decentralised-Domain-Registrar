# Architecture — Domain Auction Dashboard

> **Project snapshot**: Next.js frontend (React) that interacts with on‑chain smart contracts (Registry, AuctionHouse) using Wagmi + Viem. Users connect wallets (MetaMask), read contract state, and participate in auctions. Local browser storage caches bid metadata.

---

## 1. Overview

This document describes the high‑level architecture, component responsibilities, data flows, and deployment considerations for the Domain Auction Dashboard project.

Key goals:

- Simple, reactive UI for wallet users to view domains, refunds, and auctions
- Robust on‑chain reads and writes using modern tooling (Wagmi + Viem)
- Clear separation between UI concerns and blockchain interactions
- Easy local development with Hardhat (or a testnet) and straightforward deployment steps

---

## 2. Technology stack

- **Frontend**: Next.js (App Router, client components), React, TypeScript, Tailwind CSS
- **Wallet & RPC libraries**: Wagmi (React hooks) + Viem (encoding & format utilities)
- **Icons / UI**: lucide‑react, Tailwind for styling
- **Smart Contracts**: Solidity (Registry, AuctionHouse), Hardhat for local dev and tests
- **Storage**: On‑chain state for canonical data; client‑side cache (e.g., `listBids()` persisted to localStorage) for bid metadata and UX persistence
- **Dev tools**: Node, npm/yarn/pnpm, .env for configuration, Git for version control

---

## 3. High level component map

```
User (Browser / UI)
│
│ connects wallet via MetaMask
▼
Wallet Extension (MetaMask)
│
│ Wagmi hooks + Viem utilities
▼
PublicClient / RPC
├── readContract → Registry Contract
├── readContract → AuctionHouse Contract
└── sendTransaction → AuctionHouse (for bids, finalize, etc.)

LocalStorage
↳ stores client cache (listBids, bid metadata, endTime, etc.)

On-Chain Contracts
• Registry
• AuctionHouse
```

## 4. Component responsibilities

### Frontend (Next.js)

- Pages / components: UI, routing, layout (AppNav, pages, dashboard widgets)
- Client components use Wagmi hooks: `useAccount`, `useReadContract`, `usePublicClient`, `useChainId`, `useWriteContract` as needed
- Local helpers: `listBids(chainId, address)` to persist and read pending bids from localStorage and rehydrate refunds/UX
- Data formatting: `formatEther` for readable ETH amounts, `keccak256` + `encodePacked` to compute namehashes for contract calls

### Smart Contracts

- `Registry`:

  - `getAllNames()` — list registered names
  - `ownerOf(namehash)` — owner lookup
  - `resolve(name)` — address that a name resolves to

- `AuctionHouse`:

  - `getActiveAuctions()` — listing
  - `getDeposit(namehash, bidder)` — deposit lookup
  - `isFinalized(namehash)` — auction finalization
  - Write functions for bidding/revealing/finalizing handled by signed transactions

### Client cache (localStorage)

- Stores minimal metadata about bids to preserve UX between reloads (domain name, bid amount, timestamp)
- Used to reconstruct potential refunds and UI state when the user reconnects

---

## 5. Data flow (common flows)

### A. Dashboard load (read-only):

1. User opens dashboard and connects wallet via Wagmi.
2. App calls `publicClient.readContract({registry, functionName: 'getAllNames'})`.
3. For each name, compute `namehash = keccak256(encodePacked(['string'], [name]))`.
4. Call `ownerOf(namehash)` and `resolve(name)` to build domain objects.
5. Render domains and status (registered vs unresolved).

### B. Refund check (read-only cached + on‑chain):

1. Load `listBids(chainId, address)` from localStorage.
2. For each stored bid, compute `namehash` and call `isFinalized(namehash)` and `getDeposit(namehash, address)`.
3. If finalized and deposit > 0, mark refundable and display formatted amount `formatEther(deposit)`.

### C. Submit bid / Reveal / Finalize (signed tx):

1. User initiates an action that requires a transaction.
2. Wagmi `useWriteContract` or `publicClient` with signer sends transaction.
3. Wallet prompts (MetaMask) to sign and broadcast.
4. App optionally listens for confirmation and updates local cache or refetches state.

---

## 6. Deployment & environment

- **Local dev**

  - Run Hardhat node or Anvil for local chain.
  - Deploy contracts and update contract addresses in `.env` or `./lib/web3/contract`.
  - Start Next.js dev server.

- **Testnet**

  - Deploy to chosen testnet (e.g., Sepolia, Goerli if available) using Hardhat deploy scripts.
  - Set RPC endpoints and private key in CI/cd secrets.

- **Production**

  - Host Next.js on Vercel or similar.
  - Use an Alchemy/Infura/RPC provider for reads if you don’t run your own node.

Environment variables to document:

- `NEXT_PUBLIC_RPC_URL` (or provider config used by Wagmi)
- `NEXT_PUBLIC_AUCTIONHOUSE_ADDRESS`, `NEXT_PUBLIC_REGISTRY_ADDRESS`
- Private deployer key for Hardhat (local only; never commit)

---

## 7. Security and best practices

- Never store private keys in source control. Use `.env` locally and secrets in CI.
- Validate and sanitize any user input used to compute contract args (e.g., domain strings).
- Use `try/catch` around RPC calls and handle `undefined`/`null` data gracefully.
- Treat on‑chain numbers as `bigint` (or BigNumber types) in the frontend when necessary; convert to display strings only at the presentation boundary.
- Resist optimistic UI for balances/deposits until tx confirmations are available.

---

## 8. Design rationale

- **Wagmi + Viem**: modern hooks and EVM tooling make contract reads/writes concise and maintainable.
- **Next.js App Router + client components**: gives good developer UX and is compatible with Wagmi’s client hooks.
- **On‑chain canonical source**: critical state stays on the blockchain; client cache is only for UX persistence.

---

### Note

## `NameToken.sol` is deployed but currently serves only as a versioning placeholder.
