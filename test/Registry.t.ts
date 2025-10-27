import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Registry (T013)", () => {

  it("registers a valid name to an owner (string version)", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice] = signers;
    if (!alice) throw new Error("signers missing");

    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    await reg.waitForDeployment();

    const name = "alice";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    // should emit NameRegistered
    await expect(reg.register(name, alice.address))
      .to.emit(reg, "NameRegistered")
      .withArgs(namehash, alice.address, name);

    // stored ownership
    expect(await reg.ownerOf(namehash)).to.equal(alice.address);

    // duplicate should revert with custom error
    await expect(reg.register(name, alice.address))
      .to.be.revertedWithCustomError(reg, "NameAlreadyRegistered");
  });

  it("rejects invalid names per normalization policy", async () => {
    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    await reg.waitForDeployment();

    const badNames = ["-abc", "abc-", "ab--cd", "AlicE", "ab", "ab@cd"];
    for (const name of badNames) {
      await expect(reg.register(name, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(reg, "InvalidNameFormat");
    }

    const goodNames = ["alice", "alice-123", "a1b2c3"];
    for (const name of goodNames) {
      await expect(reg.register(name, ethers.ZeroAddress))
        .to.emit(reg, "NameRegistered");
    }
  });

  it("registers by hash directly (system-level)", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice] = signers;
    if (!alice) throw new Error("signers missing");

    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    await reg.waitForDeployment();

    const namehash = ethers.keccak256(ethers.toUtf8Bytes("domainx"));

    // system registration (AuctionHouse-style)
    await expect(reg.registerByHash(namehash, alice.address))
      .to.emit(reg, "NameRegistered")
      .withArgs(namehash, alice.address, "");

    // duplicate registration fails
    await expect(reg.registerByHash(namehash, alice.address))
      .to.be.revertedWithCustomError(reg, "NameAlreadyRegistered");
  });

  it("allows only owner to set and resolve address", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice, bob] = signers;
    if (!alice || !bob) throw new Error("signers missing");

    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    await reg.waitForDeployment();

    const name = "alice";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));
    await reg.register(name, alice.address);

    const resolvedTarget = "0x00000000000000000000000000000000000b0b01";
    const checksum = ethers.getAddress(resolvedTarget);

    // owner sets resolve successfully
    await expect(reg.connect(alice).setResolve(name, resolvedTarget))
      .to.emit(reg, "ResolveSet")
      .withArgs(namehash, checksum);

    // non-owner cannot set resolve
    await expect(reg.connect(bob).setResolve(name, resolvedTarget))
      .to.be.revertedWithCustomError(reg, "NotDomainOwner");

    // resolves correctly
    const resolved = await reg.resolve(name);
    expect(resolved).to.equal(checksum);
  });

  it("reverts when setting resolve for unregistered domain", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice] = signers;
    if (!alice) throw new Error("signers missing");

    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    await reg.waitForDeployment();

    await expect(
      reg.connect(alice).setResolve("ghost", alice.address)
    ).to.be.revertedWithCustomError(reg, "DomainNotRegistered");
  });
});
