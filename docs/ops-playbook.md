# Emergency Operations Playbook (Pause / Unpause)

## Overview

The Decentralised Domain Registrar (DDR) smart contracts implement OpenZeppelin’s **`Pausable`** mechanism.  
This provides an **emergency stop** to temporarily halt state-changing actions (bidding, revealing, registering domains) if a vulnerability or abnormal system behaviour is detected.

---

## Authority

Only the **contract owner** (deployer) can call `pause()` and `unpause()`.  
All pause-related functions are protected by OpenZeppelin’s `onlyOwner` modifier.

---

## Affected Contracts

| Contract                    | Pausable Functions                                      | Effect of Pause                              |
| --------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| **AuctionHouse.sol**        | `commitBid`, `revealBid`, `withdraw`, `finalizeAuction` | Stops new auctions, bidding, and withdrawals |
| **Registry.sol**            | `register`, `setAddress`, `resolve`                     | Stops new domain registrations and updates   |
| **NameToken.sol** (if used) | `mint`, `transfer`                                      | Halts token issuance and transfers           |

---

## 🔒 Pause / 🔓 Unpause Protocol

**Trigger Conditions for Pause**

- Abnormal contract activity (unexpected reverts, gas spikes, suspicious transactions)
- Discovery of a bug or exploit in bidding, withdrawal, or registration logic

**Trigger Conditions for Unpause**

- Issue that caused the pause has been resolved
- Contract security verified and system behaviour is normal

**Manual Pause / Unpause Steps**

```bash
# Open Hardhat console on target network
npx hardhat console --network sepolia

# --- PAUSE ALL CONTRACTS ---
> const auction = await ethers.getContractAt("AuctionHouse", "<auction_address>")
> await auction.pause()

> const registry = await ethers.getContractAt("Registry", "<registry_address>")
> await registry.pause()

> const token = await ethers.getContractAt("NameToken", "<token_address>")  # if applicable
> await token.pause()

# --- UNPAUSE ALL CONTRACTS ---
> await auction.unpause()
> await registry.unpause()
> await token.unpause()  # if applicable
```
