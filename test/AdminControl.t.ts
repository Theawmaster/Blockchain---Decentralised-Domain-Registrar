import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Access Control & Pausable", () => {
  it("owner can pause/unpause AuctionHouse and Registry", async () => {
    const [owner, alice]: HardhatEthersSigner[] = await ethers.getSigners();
    if (!alice || !owner) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    // match constructor: registry, reservePrice, commitDuration, revealDuration, defaultExpiry
    const ah = await AH.deploy(await reg.getAddress(), 1n, 1000n, 1000n, 3600n);
    await ah.waitForDeployment();

    // Initially not paused - owner can pause/unpause
    await expect(ah.pause()).to.emit(ah, "Paused").withArgs(owner.address);
    await expect(ah.unpause()).to.emit(ah, "Unpaused").withArgs(owner.address);

    // Non-owner cannot pause auction house
    await expect(ah.connect(alice).pause()).to.be.revertedWithCustomError(
      ah,
      "OwnableUnauthorizedAccount"
    );

    // Similarly for registry
    await expect(reg.pause()).to.emit(reg, "Paused").withArgs(owner.address);
    await expect(reg.unpause()).to.emit(reg, "Unpaused").withArgs(owner.address);
    await expect(reg.connect(alice).pause()).to.be.revertedWithCustomError(
      reg,
      "OwnableUnauthorizedAccount"
    );
  });

  it("prevents actions while paused", async () => {
    const [owner, alice]: HardhatEthersSigner[] = await ethers.getSigners();
    if (!alice || !owner) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    const ah = await AH.deploy(await reg.getAddress(), 1n, 1000n, 1000n, 3600n);
    await ah.waitForDeployment();

    // Pause registry
    await reg.pause();

    // Register should fail while paused
    await expect(
      reg.connect(alice).register("alice.ntu", alice.address)
    ).to.be.revertedWithCustomError(reg, "EnforcedPause");

    // Pause auction house as well
    await ah.pause();
    // Non-owner trying to pause again should revert with OwnableUnauthorizedAccount
    await expect(ah.connect(alice).pause()).to.be.revertedWithCustomError(
      ah,
      "OwnableUnauthorizedAccount"
    );
  });
});
