import { expect } from "chai";
import { ethers } from "hardhat";

describe("Registry", () => {
  it("registers a name to an owner (string version)", async () => {
    const [alice] = await ethers.getSigners() as [any];

    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    await reg.waitForDeployment();

    // ✅ valid lowercase string
    const tx = reg.register("alice", alice.address);
    await expect(tx)
      .to.emit(reg, "NameRegistered")
      .withArgs(ethers.keccak256(ethers.toUtf8Bytes("alice")), alice.address, "alice");

    // ✅ check stored owner by hash
    const namehash = ethers.keccak256(ethers.toUtf8Bytes("alice"));
    expect(await reg.ownerOf(namehash)).to.equal(alice.address);
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

  it("registers by hash directly (used by AuctionHouse)", async () => {
    const [alice] = await ethers.getSigners() as [any];

    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    await reg.waitForDeployment();

    const namehash = ethers.keccak256(ethers.toUtf8Bytes("domainx"));
    await expect(reg.registerByHash(namehash, alice.address))
      .to.emit(reg, "NameRegistered")
      .withArgs(namehash, alice.address, "");
  });
});
