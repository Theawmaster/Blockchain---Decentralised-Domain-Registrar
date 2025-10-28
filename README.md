# Decentralized Domain Registry (DDR) — Full Stack

A **blockchain-based decentralized domain registrar** that allows users to register, manage, transfer, and lookup Web3-native domain names.  
The system is designed to be **censorship-resistant, self-sovereign, and transparent**, with ownership stored immutably on-chain.

---

## Core Features

| Feature | Status | Description |
|--------|--------|-------------|
| Domain Registration | ✅ | Users can register unique `.ntu`-style domains. |
| Domain Lookup | ✅ | Resolve domain → wallet or metadata. |
| View Owned Domains | ✅ | Display domains linked to the connected wallet. |
| Wallet Dashboard | ✅ | View chain, balance, and account details. |
| Light/Dark Theme Toggle | ✅ | LocalStorage-persisted UI theme. |
| Network Switcher | ✅ | Switch between Ethereum / Sepolia networks. |
| Commit–Reveal Bidding | 🏗 In Progress | Fair sealed-bid auctions for high-value names. |

---

## Tech Stack Overview

| Layer | Technology |
|------|------------|
| Smart Contracts | Solidity + OpenZeppelin |
| Local Blockchain / Deployment | Hardhat (TypeScript) |
| Wallet Integration | wagmi + viem + MetaMask |
| Frontend UI | Next.js (App Router) + Tailwind CSS |
| Icons | lucide-react |
| Animations (optional) | Framer Motion |

---

## Backend Installation (Smart Contracts)

```bash
git clone https://github.com/<your-repository>/Decentralised-Domain-Registrar.git
cd decentralized-domain-registry
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

### Environment Variables
Create `.env`:
```
SEPOLIA_RPC_URL=<Infura or Alchemy RPC URL>
PRIVATE_KEY=<Wallet private key>
ETHERSCAN_API_KEY=<optional>
```

---

## Frontend Setup (Next.js)

```
cd frontend/ddr-app
npm install
npm run dev
```

App runs at:
```
http://localhost:3000
```

---

## Frontend Architecture

```
frontend/ddr-app/
 ├── app/
 │   ├── screens/               # UI screens (pages)
 │   │   ├── authpage/
 │   │   ├── homepage/
 │   │   ├── viewavailabledomainpage/
 │   │   ├── viewregistereddomainpage/
 │   │   ├── domainlookuppage/
 │   │   └── viewwalletdetailpage/
 │   ├── layout.tsx             # Root layout w/ providers
 │   └── globals.css            # Theme variables
 ├── components/
 │   ├── AppNav.tsx             # Top navigation bar
 │   ├── ThemeToggle.tsx        # Light/Dark mode switch
 │   └── NetworkSwitcher.tsx    # Chain switching dropdown
 ├── lib/web3/Web3Provider.tsx  # wagmi + chains config
 └── ...
```

---

## Theme System

Themes use CSS variables and persist in localStorage:

- `ThemeToggle.tsx` switches light/dark
- `globals.css` defines color tokens

No tailwind.config customization required.

---

## Network Switching

`NetworkSwitcher.tsx` lets the user switch between supported chains:

```ts
import { useSwitchChain } from "wagmi";
const { chains, switchChain } = useSwitchChain();
```

Chains are defined centrally in `Web3Provider.tsx`.

---

## Contributors

| Role | Name |
|------|------|
| Smart Contract & Protocol Design | Alvin |
| Frontend & UX Engineering | Ivan |
| Testing & Documentation | Fernando |

---

## License

This project is licensed under **GPL-3.0**.  
You are free to use, modify, and distribute under the same terms.

> *This project demonstrates how decentralized naming can enhance Web3 identity ownership, transparency, and sovereignty.*
