import { expect } from "chai";
import { ethers } from "hardhat";

describe("Registry", () => {
  it("registers a name to an owner", async () => {

    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    const signers = await ethers.getSigners();
    const alice = signers[0]!;

    await reg.waitForDeployment();

    await expect(reg.register("alice", alice.address))
      .to.emit(reg, "NameRegistered");

    expect(await reg.ownerOf("alice")).to.eq(alice.address);
  });

  it("rejects invalid names per normalization policy", async () => {
    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    await reg.waitForDeployment();

    const badNames = ["-abc", "abc-", "ab--cd", "AlicE", "ab", "ab@cd"];
    for (const name of badNames) {
      await expect(reg.register(name, ethers.ZeroAddress))
        .to.be.revertedWith("invalid name format");
    }

    const goodNames = ["alice", "alice-123", "a1b2c3"];
    for (const name of goodNames) {
      await expect(reg.register(name, ethers.ZeroAddress))
        .to.emit(reg, "NameRegistered");
    }
  });
});
