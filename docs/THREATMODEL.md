# Threat Model – Decentralised Domain Registrar (DDR)

## 1. Overview

This threat model outlines potential security risks, threat actors, and mitigations for the **Decentralised Domain Registrar (DDR)** smart contract system. It covers the **AuctionHouse**, **Registry**, and associated smart contracts deployed on Ethereum-compatible networks.

---

## 2. Assets

| Asset                 | Description                                  | Importance |
| --------------------- | -------------------------------------------- | ---------- |
| User funds (ETH)      | ETH committed in auctions                    | Critical   |
| Domain ownership data | Mapping of domain names → owners             | Critical   |
| Smart contract code   | AuctionHouse & Registry contracts            | High       |
| Off-chain data        | Salt, reveals, and commit-reveal information | Medium     |

---

## 3. Actors / Threat Sources

| Actor             | Motivation                      | Capabilities                                               |
| ----------------- | ------------------------------- | ---------------------------------------------------------- |
| Malicious bidder  | Steal ETH, manipulate auctions  | Interact with contracts, front-run                         |
| Contract owner    | Misconfigure or act maliciously | Full contract admin privileges                             |
| External attacker | Exploit vulnerabilities         | Smart contract exploits, front-running, reentrancy attacks |
| Users             | Unintentionally misbehave       | Provide invalid input or reveal salts incorrectly          |

---

## 4. Threats

### 4.1 Financial Threats

- **Unauthorized withdrawals** → losing bidders could attempt double withdrawal
- **Front-running** → malicious bidder revealing bids early
- **Auction manipulation** → owner or bidder manipulating end times or outcomes

### 4.2 Smart Contract Threats

- **Reentrancy attacks** → in withdrawal or transfer functions
- **Incorrect initialization** → deploying contracts with wrong parameters
- **Overflow/underflow** → arithmetic vulnerabilities in Solidity (less likely with ^0.8.x)
- **Invalid domain registrations** → bypassing normalization rules

### 4.3 Operational Threats

- **Incorrect salt management** → users accidentally exposing commit-reveal secrets
- **DoS attacks** → e.g., using gas-intensive operations to block auctions
- **Contract upgrade issues** → if proxy or owner misconfigurations occur

---

## 5. Mitigations / Countermeasures

| Threat                       | Mitigation                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| Unauthorized withdrawals     | Use proper `nonReentrant` modifiers; test withdrawal logic                          |
| Front-running                | Commit-reveal scheme for bids                                                       |
| Auction manipulation         | Enforce strict rules on auction start/end times; immutable parameters when possible |
| Reentrancy                   | Use OpenZeppelin’s `ReentrancyGuard`                                                |
| Invalid domain registrations | Validate inputs using normalization and regex patterns                              |
| DoS via gas                  | Optimize contract loops; limit array sizes or per-call operations                   |
| Deployment mistakes          | Automated scripts; unit tests; hardhat deployment checks                            |
| Salt exposure                | Educate users; secure off-chain storage; consider hashed commitments                |

---

## 6. Assumptions

- Users interact via trusted Ethereum wallet (MetaMask)
- Contracts are deployed on Ethereum-compatible networks with sufficient gas
- Users will not intentionally leak their salts

---

## 7. Security Testing

- Unit tests covering **commit-reveal**, withdrawals, and domain registration
- Fuzz testing for randomized salts and reveal orders
- Auditing critical functions (`AuctionHouse.commit`, `Registry.register`)

---

## 8. Notes

- This threat model is **living documentation** and should be updated as contracts evolve.
- Any changes in contract logic or network deployment require revisiting threats and mitigations.
