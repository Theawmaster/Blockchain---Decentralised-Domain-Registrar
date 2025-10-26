import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("AuctionHouse - Commit Phase", () => {
  it("accepts first commit, sets auctionEnd, and prevents duplicates", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice, bob] = signers;
    if (!alice || !bob) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    const reserve = 1n, duration = 1000n;
    const ah = await AH.deploy(await reg.getAddress(), reserve, duration);
    await ah.waitForDeployment();

    const name = "alice";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));
    const salt = ethers.encodeBytes32String("randomSalt");
    const bid = 123n;

    const bidHash = ethers.keccak256(
      ethers.solidityPacked(
        ["string", "uint256", "bytes32", "address"],
        [name, bid, salt, alice.address]
      )
    );

    const tx = ah.connect(alice).commitBid(namehash, bidHash, { value: 1n });
    await expect(tx).to.emit(ah, "BidCommitted").withArgs(namehash, alice.address);

    const endTime = await ah.auctionEnd(namehash);
    expect(endTime).to.be.greaterThan(0n);

    await expect(
      ah.connect(alice).commitBid(namehash, bidHash, { value: 1n })
    ).to.be.revertedWith("already committed");

    // Simulate Bob commits after Alice
    const salt2 = ethers.encodeBytes32String("salt2");
    const bidHash2 = ethers.keccak256(
      ethers.solidityPacked(
        ["string", "uint256", "bytes32", "address"],
        [name, 456n, salt2, bob.address]
      )
    );

    await expect(ah.connect(bob).commitBid(namehash, bidHash2, { value: 1n }))
      .to.emit(ah, "BidCommitted");
  });

  it("rejects commits after auction close", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice] = signers;
    if (!alice) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy(); await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    const ah = await AH.deploy(await reg.getAddress(), 1n, 1n);
    await ah.waitForDeployment();

    const namehash = ethers.keccak256(ethers.toUtf8Bytes("timeclose"));
    const salt = ethers.encodeBytes32String("x");
    const bid = 123n;
    const bidHash = ethers.keccak256(
      ethers.solidityPacked(
        ["string", "uint256", "bytes32", "address"],
        ["timeclose", bid, salt, alice.address]
      )
    );

    await ah.connect(alice).commitBid(namehash, bidHash, { value: 1n });
    // Simulate time passing beyond auction duration
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    const bob = (await ethers.getSigners())[1];
    const bidHash2 = ethers.keccak256(ethers.toUtf8Bytes("dummy"));
    await expect(ah.connect(bob).commitBid(namehash, bidHash2, { value: 1n }))
      .to.be.revertedWith("auction closed");
  });

  it("accepts valid reveal and updates highest bid", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice] = signers;
    if (!alice) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    const reservePrice = 1n;
    const duration = 1000n;
    const auction = await AH.deploy(await reg.getAddress(), reservePrice, duration);
    await auction.waitForDeployment();

    const name = "example";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));
    const salt = ethers.encodeBytes32String("secretSalt");
    const bidAmount = 5n;

    // ✅ Use packed encoding to match Solidity's abi.encodePacked
    const bidHash = ethers.keccak256(
      ethers.solidityPacked(
        ["string", "uint256", "bytes32", "address"],
        [name, bidAmount, salt, alice.address]
      )
    );

    // Commit first
    await auction.connect(alice).commitBid(namehash, bidHash, { value: reservePrice });

    // Simulate some time (within reveal window)
    await ethers.provider.send("evm_increaseTime", [500]);
    await ethers.provider.send("evm_mine", []);

    // Reveal
    await expect(auction.connect(alice).revealBid(name, bidAmount, salt))
      .to.emit(auction, "BidRevealed")
      .withArgs(namehash, alice.address, bidAmount);

    // Verify state updated
    const storedBid = await auction.getHighestBid(namehash);
    expect(storedBid).to.equal(bidAmount);
    const storedBidder = await auction.getHighestBidder(namehash);
    expect(storedBidder).to.equal(alice.address);
  });

  it("finalizes auction, assigns winner, and locks proceeds (T010)", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice, bob] = signers;
    if (!alice || !bob) throw new Error("signers missing");

    // --- Deploy Registry ---
    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    // --- Deploy AuctionHouse ---
    const AH = await ethers.getContractFactory("AuctionHouse");
    const reserve = 1n;
    const duration = 1000n;
    const auction = await AH.deploy(await reg.getAddress(), reserve, duration);
    await auction.waitForDeployment();

    // --- Auction Setup ---
    const name = "domainx";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    const saltA = ethers.encodeBytes32String("a-salt");
    const saltB = ethers.encodeBytes32String("b-salt");

    const bidA = 3n;
    const bidB = 6n; // Bob outbids Alice

    const commitA = ethers.keccak256(
      ethers.solidityPacked(
        ["string", "uint256", "bytes32", "address"],
        [name, bidA, saltA, alice.address]
      )
    );

    const commitB = ethers.keccak256(
      ethers.solidityPacked(
        ["string", "uint256", "bytes32", "address"],
        [name, bidB, saltB, bob.address]
      )
    );

    // --- Commit Phase ---
    await auction.connect(alice).commitBid(namehash, commitA, { value: reserve });
    await auction.connect(bob).commitBid(namehash, commitB, { value: reserve });

    // --- Reveal Phase ---
    await auction.connect(alice).revealBid(name, bidA, saltA);
    await auction.connect(bob).revealBid(name, bidB, saltB);

    // --- Time travel beyond auctionEnd ---
    await ethers.provider.send("evm_increaseTime", [Number(duration + 1n)]);
    await ethers.provider.send("evm_mine", []);


    // --- Pre-finalization state ---
    const prevProceeds = await auction.proceeds();
    expect(await auction.isFinalized(namehash)).to.equal(false);

    // --- Finalize Auction ---
    await expect(auction.finalizeAuction(name))
      .to.emit(auction, "AuctionFinalized")
      .withArgs(namehash, bob.address, bidB);

    // --- Post-finalization assertions ---
    expect(await reg.ownerOf(namehash)).to.equal(bob.address);
    expect(await auction.isFinalized(namehash)).to.equal(true);

    const newProceeds = await auction.proceeds();
    expect(newProceeds - prevProceeds).to.equal(reserve);

    // --- Double-finalization guard ---
    await expect(auction.finalizeAuction(name)).to.be.revertedWith("already finalized");
  });
});
