import { expect } from "chai";
import { ethers } from "hardhat";

describe("Registry", function () {
  let registry: any;
  let owner: any;
  let user1: any;

  beforeEach(async () => {
    [owner, user1] = await ethers.getSigners();
    const Reg = await ethers.getContractFactory("Registry");
    registry = await Reg.deploy();
    await registry.waitForDeployment();
  });

  it("registers a valid .ntu name to an owner", async () => {
    const name = "alice.ntu";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    await expect(registry.connect(user1).register(name, user1.address))
      .to.emit(registry, "NameRegistered")
      .withArgs(namehash, user1.address, name);

    expect(await registry.ownerOf(namehash)).to.equal(user1.address);
  });

  it("rejects invalid names per .ntu format", async () => {
    // ✅ These names should revert based on Registry._isValidName()
    const invalidNames = ["abc", "abc.com", "ABC.ntu", "a--b.ntu", "!!a.ntu"];

    for (const bad of invalidNames) {
      await expect(
        registry.connect(user1).register(bad, user1.address)
      ).to.be.revertedWithCustomError(registry, "InvalidNameFormat");
    }
  });

  it("allows only owner to set and resolve address", async () => {
    const name = "bob.ntu";
    await registry.connect(user1).register(name, user1.address);
    await expect(registry.connect(user1).setResolve(name, user1.address))
      .to.emit(registry, "ResolveSet");

    // Non-owner cannot set resolve
    await expect(
      registry.connect(owner).setResolve(name, owner.address)
    ).to.be.revertedWithCustomError(registry, "NotDomainOwner");
  });

  it("reverts when setting resolve for unregistered domain", async () => {
    const name = "ghost.ntu";
    await expect(
      registry.connect(user1).setResolve(name, user1.address)
    ).to.be.revertedWithCustomError(registry, "DomainNotRegistered");
  });

  it("returns all registered names and names by owner", async () => {
    const names = ["a.ntu", "b.ntu"];
    for (const n of names) {
      await registry.connect(user1).register(n, user1.address);
    }

    const allNames = await registry.getAllNames();
    expect(allNames).to.include.members(names);

    const ownedNames = await registry.namesOfOwner(user1.address);
    expect(ownedNames).to.include.members(names);
  });
});
