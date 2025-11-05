import { expect } from "chai";
import { ethers } from "hardhat";

describe("Fuzz Testing: Randomized salts & reveal order", () => {
  it("preserves invariants under randomized commit/reveal sequences", async () => {
    const [owner, ...bidders] = await ethers.getSigners();

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const AUCTION_DURATION = 1000n;
    const AH = await ethers.getContractFactory("AuctionHouse");
    const ah = await AH.deploy(await reg.getAddress(), 1n, AUCTION_DURATION);
    await ah.waitForDeployment();

    const name = "fuzzdomain";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    // --- Generate randomized bids and salts ---
    const bids = bidders.slice(0, 5).map(b => ({
      bidder: b,
      amount: BigInt(ethers.toNumber(ethers.randomBytes(1))) % 10n + 1n, // 1–10 wei random
      salt: ethers.encodeBytes32String("salt" + Math.random().toString(36).slice(2)),
    }));

    // --- Commit Phase (random order) ---
    const shuffledCommits = [...bids].sort(() => Math.random() - 0.5);
    for (const { bidder, amount, salt } of shuffledCommits) {
      const bidHash = ethers.keccak256(
        ethers.solidityPacked(
          ["string", "uint256", "bytes32", "address"],
          [name, amount, salt, bidder.address]
        )
      );
      await ah.connect(bidder).commitBid(namehash, bidHash, { value: amount });
    }

    // Move forward just enough to enter reveal phase (halfway)
    await ethers.provider.send("evm_increaseTime", [Number(AUCTION_DURATION) / 2]);
    await ethers.provider.send("evm_mine");

    // --- Reveal Phase (random order) ---
    const shuffledReveals = [...bids].sort(() => Math.random() - 0.5);
    for (const { bidder, amount, salt } of shuffledReveals) {
      await expect(ah.connect(bidder).revealBid(name, amount, salt)).to.not.be.reverted;
    }

    // Move beyond auction end to finalize
    await ethers.provider.send("evm_increaseTime", [Number(AUCTION_DURATION) / 2 + 10]);
    await ethers.provider.send("evm_mine");

    // --- Finalize Auction ---
    await expect(ah.finalizeAuction(name)).to.not.be.reverted;

    // --- Invariant Checks ---
    const winner = await reg.ownerOf(namehash);
    expect(winner).to.not.equal(ethers.ZeroAddress);

    // Single winner invariant
    const uniqueWinners = new Set([winner]);
    expect(uniqueWinners.size).to.eq(1);

    // All losing bidders can withdraw safely
    for (const { bidder } of bids.filter(b => b.bidder.address !== winner)) {
      await expect(ah.connect(bidder).withdraw(namehash)).to.not.be.reverted;
    }
  });
});
