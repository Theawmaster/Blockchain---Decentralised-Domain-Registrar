# RUBRIC.md — Decentralized Domain Registrar (DDR)

This document maps each NTU Blockchain Technology assessment criterion to the corresponding DDR deliverables, demonstrating compliance and evidence.

---

## 1. Identify the Core Problem and Blockchain-Based Solution
**Rubric Weight:** 10 marks  
**Evidence:**
- `docs/ARCHITECTURE.md` — Problem context: centralized DNS, renewal lock-in, lack of transparency.  
- `contracts/Registry.sol` + `AuctionHouse.sol` — Implements open `.ntu` domain auction registry.
- `README.md` — Project overview explaining motivation for decentralization.
**Summary:**  
The system replaces centralized domain registration with transparent, on-chain commit–reveal blind auctions and ownership proofs.

---

## 2. Develop the Blockchain Solution per Design
**Rubric Weight:** 10 marks  
**Evidence:**
- Solidity smart contracts: `Registry.sol`, `AuctionHouse.sol`, `NameToken.sol`.
- Tests: `test/Registry.t.ts`, `test/Auction.t.ts`, coverage reports (`/coverage/`).
- Continuous Integration: `.github/workflows/ci.yml`, Slither static analysis logs.
- Normalization Policy: `T006` (see below).
**Summary:**  
Logical design connecting domain normalization, auction lifecycle, and ownership mapping. Verified via unit tests and static analysis.

---

## 3. Overall Standard of Codebase and User Experience
**Rubric Weight:** 10 marks  
**Evidence:**
- Frontend: `frontend/app/` (Next.js + wagmi/viem integration).
- UX: mobile-responsive commit/reveal screens, clear error handling.
- Docs: `README.md`, `DEMO.md`, and `DEPLOYMENTS.md` — for reproducibility.
**Summary:**  
The system demonstrates a polished UX, logical code structure, strong test coverage, and verifiable smart contracts.

---

## 4. Security, Testing & Documentation Quality
**Additional Criterion**
**Evidence:**
- Slither results with no High/Medium findings (`T005`).
- Gas report snapshot & coverage ≥90%.
- Threat model in `THREATMODEL.md` referencing STRIDE mitigations.
**Summary:**  
Smart contracts adhere to security best practices (reentrancy safety, bounded loops, pull payments).

---

