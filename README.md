# Decentralized Domain Registry (DDR)

A **blockchain-based decentralized domain registrar** built using [Hardhat](https://hardhat.org/) and Solidity.  
This project enables users to **register, manage, and transfer domain names on-chain** securely, removing the need for centralized registrars.  
Each domain is tokenized as a verifiable record of ownership stored immutably on the Ethereum blockchain.

---

## Features (Planned / Implemented)

- **Domain Registration** — Users can claim unique `.ntu`-style domain names through smart contract validation.  
- **Ownership Transfer** — Domains can be securely transferred between wallets using token-based ownership.  
- **Domain Resolution** — Maps registered names to wallet addresses or metadata for dApps and web3 integrations.  
- **Commit–Reveal Auctions (in progress)** — Implements a fair, sealed-bid auction system for domain allocation.  
- **Immutable Registry** — All records are stored permanently on-chain, ensuring transparency and auditability.

---

## Tech Stack

| Layer | Technology |
|--------|-------------|
| **Smart Contracts** | Solidity (v0.8.24), OpenZeppelin Libraries |
| **Framework** | Hardhat (TypeScript) |
| **Testing** | Mocha + Chai |
| **Frontend (optional)** | React / Next.js + Ethers.js / wagmi |
| **Deployment** | Sepolia Testnet via Foundry / Hardhat scripts |

---

## Installation & Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/decentralized-domain-registry.git
cd decentralized-domain-registry

# Install dependencies
npm install

# Compile smart contracts
npx hardhat compile

# Run test suite
npx hardhat test
```

>  *Ensure you have Node.js ≥18 and Hardhat installed globally before running.*

---

## Secrets Configuration

Create a `.env` file in the project root directory containing your credentials:

```
SEPOLIA_RPC_URL=<Infura or Alchemy endpoint>
PRIVATE_KEY=<your wallet private key>
ETHERSCAN_API_KEY=<your Etherscan API key>
```

> **Security Note:** Never commit your `.env` or private keys to version control systems such as GitHub.

---

## License

This project is licensed under the **GNU General Public License (GPL-3.0)**.  
You are free to use, modify, and distribute the code under the same terms.

---

## Contributors

| Role | Name | Responsibility |
|------|------|----------------|
|  Smart Contracts & Hardhat Setup | **Alvin** | Solidity development, contract architecture |
|  Frontend & Integration | **Ivan** | React/Next.js integration and wallet connectivity |
|  Testing & Documentation | **Fernando** | Unit tests, reports, and rubric documentation |

---

>  *The Decentralized Domain Registry demonstrates how blockchain technology can modernize digital identity management through transparent, tamper-proof, and verifiable domain ownership.*
