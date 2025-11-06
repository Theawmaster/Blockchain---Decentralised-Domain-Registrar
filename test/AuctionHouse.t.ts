import { expect } from "chai";
import { ethers } from "hardhat";

describe("AuctionHouse", function () {
  async function deployContracts() {
    const [deployer, alice, bob, charlie] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("Registry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
    const reservePrice = 1n;
    const commitDuration = 1000n;
    const revealDuration = 1000n;
    const defaultExpiry = 3600n;

    const auctionHouse = await AuctionHouse.deploy(
      await registry.getAddress(),
      reservePrice,
      commitDuration,
      revealDuration,
      defaultExpiry
    );
    await auctionHouse.waitForDeployment();

    return { deployer, alice, bob, charlie, registry, auctionHouse, reservePrice };
  }

  function createBidHash(name: string, amount: bigint, saltBytes32: string, bidderAddress: string) {
    // saltBytes32 must already be bytes32 (ethers.encodeBytes32String used when calling)
    return ethers.keccak256(
      ethers.solidityPacked(["string", "uint256", "bytes32", "address"], [
        name,
        amount,
        saltBytes32,
        bidderAddress,
      ])
    );
  }

  it("should accept first commit, set commit/revealEnd, and prevent duplicates", async () => {
    const { alice, bob, auctionHouse, reservePrice } = await deployContracts();

    const name = "alice.ntu";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    const salt = ethers.encodeBytes32String("salt1");
    const bidHash1 = createBidHash(name, 123n, salt, alice.address);

    await expect(auctionHouse.connect(alice).commitBid(namehash, bidHash1, { value: reservePrice }))
      .to.emit(auctionHouse, "BidCommitted")
      .withArgs(namehash, alice.address);

    const commitEnd = await auctionHouse.commitEnd(namehash);
    const revealEnd = await auctionHouse.revealEnd(namehash);
    expect(commitEnd).to.be.greaterThan(0n);
    expect(revealEnd).to.be.greaterThan(commitEnd);

    // Prevent duplicate commit by same bidder
    await expect(auctionHouse.connect(alice).commitBid(namehash, bidHash1, { value: reservePrice }))
      .to.be.revertedWithCustomError(auctionHouse, "AuctionAlreadyCommitted");

    // Another user can still commit
    const salt2 = ethers.encodeBytes32String("salt2");
    const bidHash2 = createBidHash(name, 456n, salt2, bob.address);
    await expect(auctionHouse.connect(bob).commitBid(namehash, bidHash2, { value: reservePrice }))
      .to.emit(auctionHouse, "BidCommitted")
      .withArgs(namehash, bob.address);
  });

  it("should reject commits after commit phase ends", async () => {
    const { alice, auctionHouse, reservePrice } = await deployContracts();
    const name = "late.ntu";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    const salt = ethers.encodeBytes32String("lateSalt");
    const bidHash = createBidHash(name, 200n, salt, alice.address);
    await auctionHouse.connect(alice).commitBid(namehash, bidHash, { value: reservePrice });

    const commitEnd = await auctionHouse.commitEnd(namehash);
    // jump to after commitEnd
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(commitEnd) + 1]);
    await ethers.provider.send("evm_mine", []);

    // Now trying to commit again should revert with AuctionClosed
    const bob = (await ethers.getSigners())[1];
    const bidHash2 = createBidHash(name, 201n, ethers.encodeBytes32String("s"), bob.address);
    await expect(auctionHouse.connect(bob).commitBid(namehash, bidHash2, { value: reservePrice }))
      .to.be.revertedWithCustomError(auctionHouse, "AuctionClosed");
  });

  it("should accept valid reveals and reject invalid ones", async () => {
    const { alice, bob, auctionHouse, reservePrice } = await deployContracts();
    const name = "revealtest.ntu";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    const saltA = "saltA";
    const saltB = "saltB";

    const saltA32 = ethers.encodeBytes32String(saltA);
    const saltB32 = ethers.encodeBytes32String(saltB);

    const bidHashA = createBidHash(name, 500n, saltA32, alice.address);
    const bidHashB = createBidHash(name, 800n, saltB32, bob.address);

    await auctionHouse.connect(alice).commitBid(namehash, bidHashA, { value: reservePrice });
    await auctionHouse.connect(bob).commitBid(namehash, bidHashB, { value: reservePrice });

    // move to reveal phase
    const commitEnd = await auctionHouse.commitEnd(namehash);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(commitEnd) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(
      auctionHouse.connect(alice).revealBid(name, 500n, saltA32)
    )
      .to.emit(auctionHouse, "BidRevealed")
      .withArgs(namehash, alice.address, 500n);

    // Wrong salt should revert
    await expect(
      auctionHouse.connect(bob).revealBid(name, 800n, ethers.encodeBytes32String("WRONG"))
    ).to.be.revertedWithCustomError(auctionHouse, "InvalidBidReveal");

    // Correct reveal works
    await expect(
      auctionHouse.connect(bob).revealBid(name, 800n, saltB32)
    )
      .to.emit(auctionHouse, "BidRevealed")
      .withArgs(namehash, bob.address, 800n);
  });

  it("should finalize auction and assign domain to highest bidder", async () => {
    const { alice, bob, registry, auctionHouse, reservePrice } = await deployContracts();
    const name = "finalize.ntu";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    const saltA32 = ethers.encodeBytes32String("saltA");
    const saltB32 = ethers.encodeBytes32String("saltB");
    const bidHashA = createBidHash(name, 200n, saltA32, alice.address);
    const bidHashB = createBidHash(name, 400n, saltB32, bob.address);

    await auctionHouse.connect(alice).commitBid(namehash, bidHashA, { value: reservePrice });
    await auctionHouse.connect(bob).commitBid(namehash, bidHashB, { value: reservePrice });

    // move to reveal
    const commitEnd = await auctionHouse.commitEnd(namehash);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(commitEnd) + 1]);
    await ethers.provider.send("evm_mine", []);

    await auctionHouse.connect(alice).revealBid(name, 200n, saltA32);
    await auctionHouse.connect(bob).revealBid(name, 400n, saltB32);

    // move past reveal end
    const revealEnd = await auctionHouse.revealEnd(namehash);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(revealEnd) + 1]);
    await ethers.provider.send("evm_mine", []);

    const prevProceeds = await auctionHouse.proceeds();
    await expect(auctionHouse.finalizeAuction(name))
      .to.emit(auctionHouse, "AuctionFinalized")
      .withArgs(namehash, bob.address, 400n);

    expect(await registry.ownerOf(namehash)).to.equal(bob.address);
    expect(await auctionHouse.isFinalized(namehash)).to.be.true;
    expect((await auctionHouse.proceeds()) - prevProceeds).to.equal(1n);

    // second finalize should revert
    await expect(auctionHouse.finalizeAuction(name)).to.be.revertedWithCustomError(
      auctionHouse,
      "AuctionAlreadyFinalized"
    );
  });

  it("should allow refunds for losing bidders", async () => {
    const { alice, bob, auctionHouse, registry, reservePrice } = await deployContracts();
    const name = "refundtest.ntu";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    const salt1 = ethers.encodeBytes32String("salt1");
    const salt2 = ethers.encodeBytes32String("salt2");
    const bid1 = 3n, bid2 = 6n;

    const commit1 = createBidHash(name, bid1, salt1, alice.address);
    const commit2 = createBidHash(name, bid2, salt2, bob.address);

    await auctionHouse.connect(alice).commitBid(namehash, commit1, { value: reservePrice });
    await auctionHouse.connect(bob).commitBid(namehash, commit2, { value: reservePrice });

    // move to reveal
    const commitEnd = await auctionHouse.commitEnd(namehash);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(commitEnd) + 1]);
    await ethers.provider.send("evm_mine", []);

    await auctionHouse.connect(alice).revealBid(name, bid1, salt1);
    await auctionHouse.connect(bob).revealBid(name, bid2, salt2);

    // move past reveal
    const revealEnd = await auctionHouse.revealEnd(namehash);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(revealEnd) + 1]);
    await ethers.provider.send("evm_mine", []);

    await auctionHouse.finalizeAuction(name);

    // Alice (loser) withdraws safely
    const before = await ethers.provider.getBalance(alice.address);
    const tx = await auctionHouse.connect(alice).withdraw(namehash);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("receipt null");
    const gasUsed = receipt.gasUsed * (tx.gasPrice ?? 0n);
    const after = await ethers.provider.getBalance(alice.address);
    const effectiveAfter = after + gasUsed;
    expect(effectiveAfter).to.be.gt(before);

    // Winner cannot withdraw
    await expect(auctionHouse.connect(bob).withdraw(namehash))
      .to.be.revertedWithCustomError(auctionHouse, "WinnerCannotWithdraw");

    // Double withdraw prevention
    await expect(auctionHouse.connect(alice).withdraw(namehash))
      .to.be.revertedWithCustomError(auctionHouse, "NothingToWithdraw");
  });
});
