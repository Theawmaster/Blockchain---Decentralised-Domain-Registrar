# Decentralized Domain Registry (DDR) — Full Stack

A **self-sovereign Web3 domain system** that empowers users to **claim digital identity**, **transfer ownership trustlessly**, and **resolve names to wallets** on-chain.  
Built to be **transparent**, **tamper-resistant**, and **user-first**, DDR merges the simplicity of Web2 naming with the integrity of decentralized infrastructure.

---

## Core Capabilities

| Feature | Status | Description |
|--------|--------|-------------|
| **Domain Registration** | ✅ | Register `.ntu`-style human-readable domains secured on-chain. |
| **Resolve to Wallet** | ✅ | Map a domain → Ethereum wallet instantly. |
| **Owned Domain Dashboard** | ✅ | View and manage names owned by the connected wallet. |
| **Transfer Ownership** | ✅ | Domain transfers are secure, final, and blockchain-verified. |
| **Commit–Reveal Auctions** | ✅ | Anti-sniping, fair bidding mechanism for contested names. |
| **Theme System** | ✅ | Fully responsive UI with light/dark mode persistence. |
| **Network Switching** | ✅ | Seamless switch between Ethereum & Sepolia Testnet. |

---

## System Architecture

| Layer | Technology |
|------|------------|
| Smart Contracts | Solidity + OpenZeppelin |
| Local Dev / Deployment | Hardhat (TypeScript) |
| Blockchain Communication | viem + wagmi |
| Wallet Integration | MetaMask / WalletConnect (wagmi-hooks) |
| Frontend UI | Next.js (App Router) + TailwindCSS |
| Animations | (optional) Framer Motion |
| Icons | lucide-react |

---

## Contract Deployment & Backend Setup

```bash
# Clone repository
git clone https://github.com/<your-repository>/Decentralised-Domain-Registrar.git
cd decentralized-domain-registry

npm install

# Compile Smart Contracts
npx hardhat compile

# Run Tests
npx hardhat test

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

### Environment Variables

Create `.env` file:

```
SEPOLIA_RPC_URL=<Infura or Alchemy Endpoint>
PRIVATE_KEY=<Your Wallet Private Key>
ETHERSCAN_API_KEY=<optional for verification>
```

---

## Frontend Setup

```bash
cd frontend/ddr-app
npm install
npm run dev
```

Open the app:
```
http://localhost:3000
```

### Directory Structure

```
decentralized-domain-registry/
│
├── contracts/
│   ├── Registry.sol                 # Core domain registry
│   ├── AuctionHouse.sol             # Commit–reveal auction contract
│   ├── interfaces/
│   │   ├── IRegistry.sol
│   │   └── IAuctionHouse.sol
│   └── lib/                         # (optional) Shared sol utils
│
├── scripts/                         # Hardhat deploy / tasks
│   └── deploy.ts
│
├── test/                            # Hardhat + viem tests
│   ├── Registry.test.ts
│   ├── AuctionHouse.test.ts
│   └── helpers/
│       └── domain.ts                # hashing, encoding helpers
│
├── frontend/
│   ├── ddr-app/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   └── screens/
│   │   │       ├── homepage/
│   │   │       │   └── page.tsx
│   │   │       ├── registerdomain/
│   │   │       │   └── page.tsx
│   │   │       ├── viewregistereddomain/
│   │   │       │   └── page.tsx
│   │   │       ├── sendtodomain/
│   │   │       │   └── page.tsx
│   │   │       ├── startauction/
│   │   │       │   └── page.tsx
│   │   │       └── reveal/
│   │   │           └── page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── AppNav.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── NetworkSwitcher.tsx
│   │   │   └── AuctionCard.tsx
│   │   │
│   │   └── lib/
│   │       └── web3/
│   │           ├── contract.ts      # ABI + addresses
│   │           └── Web3Provider.tsx # wagmi config
│   │
│   └── public/
│       └── assets/ (logos/icons)
│
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md              # System + call flow diagrams
│   ├── THREATMODEL.md               # Attack surface & STRIDE mapping
│   ├── RUBRIC.md                    # Assessment criteria alignment
│   ├── DEMO.md                      # 7-minute presentation script
│   └── DEPLOYMENTS.md               # Contract addresses + block explorers
│
└── evidence/                        # Provided during report submission
    ├── gas-report.txt
    ├── slither-report.txt
    ├── coverage-summary.html
    └── audit-findings.log

```

---

## Theme & UX Philosophy

The interface is designed around **clarity and self-agency**:

- Light/Dark mode stored in `localStorage`
- Accessible color contrast and focus states
- Minimal screens → intuitive navigation

> Your identity should feel like **yours**, without needing permission.

---

## Contributors

| Role | Contributor |
|------|-------------|
| Protocol & Contract Design | Alvin |
| Frontend Engineering & UX | Ivan |
| QA, Testing & Deployment Support | Fernando |

---

## License

Distributed under the **GPL-3.0 License**.  
Any derivative must remain open-source — in the spirit of public transparency.

---


