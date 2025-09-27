import { expect } from "chai";
import { ethers } from "hardhat";

describe("Registry", () => {
  it("registers a namehash to an owner", async () => {
    const signers = await ethers.getSigners();
    const alice = signers[0];
    if (!alice) {
      throw new Error("Alice signer is undefined");
    }
    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    await reg.waitForDeployment();

    const namehash = ethers.keccak256(ethers.toUtf8Bytes("alice.ntu"));
    await (await reg.register(namehash, alice.address)).wait();

    expect(await reg.ownerOf(namehash)).to.eq(alice.address);
  });
});
