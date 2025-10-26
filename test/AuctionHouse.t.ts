import { expect } from "chai";
import { ethers } from "hardhat";

describe("AuctionHouse (skeleton)", () => {
  it("stores constructor params and accepts commits", async () => {
    const [deployer, alice] = await ethers.getSigners();
    if (!alice) throw new Error("Alice signer is undefined");
    
    // deploy a tiny Registry to satisfy type
    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy(); await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    const reserve = 1n;
    const duration = 3600n;
    const ah = await AH.deploy(await reg.getAddress(), reserve, duration);
    await ah.waitForDeployment();

    expect(await ah.registry()).to.eq(await reg.getAddress());
    expect(await ah.reservePrice()).to.eq(reserve);
    expect(await ah.duration()).to.eq(duration);

    const name = "alice";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));
    const salt = ethers.encodeBytes32String("s");
    const bid = 123n;
    const bidHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["string","uint256","bytes32","address"],
      [name, bid, salt, alice.address]
    ));

    await expect(ah.connect(alice).commitBid(namehash, bidHash))
      .to.emit(ah, "BidCommitted");

    // skeleton reveal emits event & stores value for now
    await expect(ah.connect(alice).revealBid(name, bid, salt))
      .to.emit(ah, "BidRevealed");
  });
});
