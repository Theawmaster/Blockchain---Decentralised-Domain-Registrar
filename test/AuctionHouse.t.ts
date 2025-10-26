import { expect } from "chai";
import { ethers } from "hardhat";

describe("AuctionHouse - Commit Phase", () => {
  it("accepts first commit, sets auctionEnd, and prevents duplicates", async () => {
    const [deployer, alice, bob] = await ethers.getSigners();

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
    const [deployer, alice] = await ethers.getSigners();

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
    const [deployer, alice] = await ethers.getSigners();

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
});
