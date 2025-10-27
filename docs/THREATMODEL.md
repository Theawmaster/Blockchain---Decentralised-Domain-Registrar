# THREATMODEL.md : Decentralized Domain Registrar (DDR)

This document outlines the threat model, attack surface, and mitigations for the **Decentralized Domain Registrar (DDR)** smart contract suite.  
It follows the **STRIDE** framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege), adapted for blockchain and smart contract environments.

---

## System Context Overview

The DDR architecture consists of four layers:

| Layer | Components | Description |
|--------|-------------|-------------|
| **Frontend (DApp)** | React + Next.js, ethers.js / wagmi | User connects MetaMask, interacts with auctions and registry |
| **Blockchain Layer** | `Registry.sol`, `AuctionHouse.sol`, `NameToken.sol` | Core decentralized logic for ownership, auctions, and name resolution |
| **Infrastructure** | Hardhat / Sepolia testnet, MetaMask Wallet | RPC node and wallet layer connecting UI and smart contracts |
| **Off-chain Integration** | GitHub Actions, CI + Slither | Continuous Integration and security scanning pipeline |

---

## STRIDE Threat Model

| Category | Potential Threat | Impact | Mitigation / Control |
|-----------|------------------|--------|----------------------|
| **S – Spoofing** | Attacker fakes ownership of wallet or domain | High | Enforced **`msg.sender` verification** in Registry and AuctionHouse; all privileged actions restricted via **Ownable**. |
| | Fake UI or phishing DApp impersonating DDR frontend | Medium | MetaMask connection prompts with chain/network validation; **ENS domain + HTTPS** recommended for deployment. |
| **T – Tampering** | Auction state manipulation or unauthorized finalization | High | Critical functions protected by **nonReentrant**, **Pausable**, and **state validation checks**. |
| | On-chain data overwrite | High | Immutability of blockchain storage; no external write except via defined contract interfaces. |
| **R – Repudiation** | Disputes over bids or ownership records | Medium | **Event logs** (`NameRegistered`, `BidCommitted`, `BidRevealed`, `AuctionFinalized`) provide cryptographic audit trail. |
| **I – Information Disclosure** | Revealing bid values prematurely during commit phase | High | Sealed-bid **commit–reveal mechanism** ensures confidentiality until reveal period. |
| | Metadata leakage via frontend logs | Low | Local state handled via ethers.js; no sensitive storage off-chain. |
| **D – Denial of Service** | Spamming commit calls to exhaust gas or storage | Medium | Minimum deposit required; gas limit enforcement; `require(!paused)` protects paused state. |
| | Frontend RPC overload | Medium | Client rate-limiting and fallback RPC endpoints. |
| **E – Elevation of Privilege** | Non-owner pausing or finalizing auction | High | Strict **`onlyOwner`** modifiers on administrative routes; CI tests include **negative access control** checks. |
| | Reentrancy attacks on withdrawals | High | Use of **ReentrancyGuard** and **pull-based** withdrawal model. |

---

## Attack Surface Analysis

| Surface | Threat Vector | Countermeasure |
|----------|---------------|----------------|
| **Frontend** | Phishing, fake wallet pop-ups | Validate network (chainId == expected), disable unsafe window.ethereum injections |
| **Smart Contracts** | Reentrancy, timestamp manipulation, overflow | Solidity ≥0.8.0 (checked math), ReentrancyGuard, block.timestamp tolerance |
| **Network Layer** | Malicious RPC node | Redundant RPCs (Infura / Alchemy / Hardhat local) |
| **Wallet Integration** | Compromised wallet / key | MetaMask user confirmation; optional Gnosis Safe multisig for deployment |
| **Build Pipeline** | Tampered contract deployment | GitHub Actions checksum validation, verified compiler version lock in `hardhat.config.ts` |

---

## Security Design Principles

1. **Least Privilege:** Only owner/admin can pause or finalize; all user actions scoped to their address.
2. **Fail-Safe Defaults:** Contracts revert safely on invalid states; uninitialized values revert automatically.
3. **Transparency:** All significant state changes emit events for traceability.
4. **Separation of Duties:** Auction logic and registry ownership are distinct modules.
5. **Defense in Depth:** Reentrancy guards, pausability, and internal validation layered together.

---

## Verification & Testing Artifacts

| Artifact | Description | Location |
|-----------|-------------|----------|
| **Unit Tests** | 100% coverage on auction lifecycle, access control, and registry ownership | `/test/*.t.ts` |
| **Fuzz & Invariant Tests** | Randomized commits and reveals ensure invariant preservation | `/test/AuctionHouse.fuzz.t.ts` |
| **Static Analysis** | Slither report (no high/medium findings) | `/reports/slither.log` |
| **Gas & Coverage Reports** | Validates gas efficiency and coverage metrics | `/coverage/` |
| **CI Workflow** | Auto-lint, compile, test, and scan | `.github/workflows/ci.yml` |

---

## Future Hardening Recommendations

- Integrate **off-chain signature validation** for commit proofs.
- Implement **ENS-style reverse resolver** for address–domain mapping.
- Adopt **multi-signature ownership** for admin operations.
- Monitor transaction anomalies using tools like **Tenderly** or **OpenZeppelin Defender**.

---

### Summary

The DDR system exhibits a **low residual risk profile**.  
By integrating OpenZeppelin safeguards, strong commit–reveal logic, and comprehensive test coverage, the project demonstrates secure smart contract engineering aligned with NTU’s Blockchain Technology module requirements.

---
