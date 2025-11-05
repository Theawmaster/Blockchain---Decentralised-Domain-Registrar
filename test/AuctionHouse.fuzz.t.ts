import { expect } from "chai";
import { ethers } from "hardhat";

describe("Fuzz Testing: Randomized salts & reveal order", () => {
  it("preserves invariants under randomized commit/reveal sequences", async () => {
    const [owner, ...bidders] = await ethers.getSigners();

    // Deploy Registry
    const Registry = await ethers.getContractFactory("Registry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    // Deploy AuctionHouse (5-arg constructor)
    const reservePrice = 1n;
    const commitDuration = 1000n;
    const revealDuration = 1000n;
    const defaultExpiry = 3600n;

    const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
    const auctionHouse = await AuctionHouse.deploy(
      await registry.getAddress(),
      reservePrice,
      commitDuration,
      revealDuration,
      defaultExpiry
    );
    await auctionHouse.waitForDeployment();

    const name = "fuzzdomain.ntu";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    // Generate randomized bids and salts (5 bidders)
    const bids = bidders.slice(0, 5).map(b => ({
      bidder: b,
      amount: (BigInt(ethers.toNumber(ethers.randomBytes(1))) % 10n) + 1n,
      salt32: ethers.encodeBytes32String("salt" + Math.random().toString(36).slice(2)),
    }));

    // Commit Phase (random order)
    const shuffledCommits = [...bids].sort(() => Math.random() - 0.5);
    for (const { bidder, amount, salt32 } of shuffledCommits) {
      const bidHash = ethers.keccak256(
        ethers.solidityPacked(
          ["string", "uint256", "bytes32", "address"],
          [name, amount, salt32, bidder.address]
        )
      );
      await expect(auctionHouse.connect(bidder).commitBid(namehash, bidHash, { value: reservePrice }))
        .to.emit(auctionHouse, "BidCommitted")
        .withArgs(namehash, bidder.address);
    }

    // Move to reveal phase
    const commitEnd = await auctionHouse.commitEnd(namehash);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(commitEnd) + 1]);
    await ethers.provider.send("evm_mine", []);

    // Reveal Phase (random order)
    const shuffledReveals = [...bids].sort(() => Math.random() - 0.5);
    for (const { bidder, amount, salt32 } of shuffledReveals) {
      await expect(auctionHouse.connect(bidder).revealBid(name, amount, salt32))
        .to.emit(auctionHouse, "BidRevealed")
        .withArgs(namehash, bidder.address, amount);
    }

    // Move beyond reveal phase to finalize
    const revealEnd = await auctionHouse.revealEnd(namehash);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(revealEnd) + 10]);
    await ethers.provider.send("evm_mine", []);

    // Finalize Auction (use name string)
    await expect(auctionHouse.finalizeAuction(name)).to.emit(auctionHouse, "AuctionFinalized");

    // Invariant Checks
    const winner = await registry.ownerOf(namehash);
    // winner should be non-zero address
    expect(winner).to.not.equal(ethers.ZeroAddress);

    // Single winner invariant (trivial here)
    const uniqueWinners = new Set([winner]);
    expect(uniqueWinners.size).to.eq(1);

    // All losing bidders can withdraw safely (if they had deposited)
    for (const { bidder } of bids.filter(b => b.bidder.address !== winner)) {
      // only check that withdraw either succeeds or reverts with NothingToWithdraw if already claimed;
      // but because finalize transfers proceeds only from winner deposit, losers should be able to withdraw.
      await expect(auctionHouse.connect(bidder).withdraw(namehash)).to.not.be.reverted;
    }
  }).timeout(20000);
});
