import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Access Control & Pausable", () => {
  it("owner can pause/unpause AuctionHouse and Registry", async () => {
    const [owner, alice] : HardhatEthersSigner[] = await ethers.getSigners();
    if (!alice || !owner) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    const ah = await AH.deploy(await reg.getAddress(), 1n, 1000n);
    await ah.waitForDeployment();

    // Initially not paused
    await expect(ah.pause()).to.emit(ah, "Paused").withArgs(owner.address);
    await expect(ah.unpause()).to.emit(ah, "Unpaused").withArgs(owner.address);

    // Non-owner cannot pause
    await expect(ah.connect(alice).pause()).to.be.revertedWithCustomError(ah, "OwnableUnauthorizedAccount");
  });

  it("prevents actions while paused", async () => {
    const [owner, alice] : HardhatEthersSigner[] = await ethers.getSigners();
    if (!alice || !owner) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy(); await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    const ah = await AH.deploy(await reg.getAddress(), 1n, 1000n);
    await ah.waitForDeployment();

    await ah.pause();

    const namehash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const salt = ethers.encodeBytes32String("x");
    const bidHash = ethers.keccak256(
      ethers.solidityPacked(["string", "uint256", "bytes32", "address"], ["test", 1n, salt, alice.address])
    );

    await reg.pause();

    await expect(
    reg.connect(alice).register("alice", alice.address)
    ).to.be.revertedWithCustomError(reg, "EnforcedPause");
  });
});
