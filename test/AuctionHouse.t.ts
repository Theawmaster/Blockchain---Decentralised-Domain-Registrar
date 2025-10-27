import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("AuctionHouse - Commit Phase", () => {

  it("accepts first commit, sets auctionEnd, and prevents duplicates", async () => {
    const [deployer, alice, bob]: HardhatEthersSigner[] = await ethers.getSigners();
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

    // ✅ duplicate commit should revert with custom error
    await expect(
      ah.connect(alice).commitBid(namehash, bidHash, { value: 1n })
    ).to.be.revertedWithCustomError(ah, "AuctionAlreadyCommitted");

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
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    const bob = (await ethers.getSigners())[1];
    const bidHash2 = ethers.keccak256(ethers.toUtf8Bytes("dummy"));
    await expect(
      ah.connect(bob).commitBid(namehash, bidHash2, { value: 1n })
    ).to.be.revertedWithCustomError(ah, "AuctionClosed");
  });

  it("accepts valid reveal and updates highest bid", async () => {
    const [deployer, alice] = await ethers.getSigners();
    if (!alice) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    const auction = await AH.deploy(await reg.getAddress(), 1n, 1000n);
    await auction.waitForDeployment();

    const name = "example";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));
    const salt = ethers.encodeBytes32String("secretSalt");
    const bidAmount = 5n;

    const bidHash = ethers.keccak256(
      ethers.solidityPacked(
        ["string", "uint256", "bytes32", "address"],
        [name, bidAmount, salt, alice.address]
      )
    );

    await auction.connect(alice).commitBid(namehash, bidHash, { value: 1n });
    await ethers.provider.send("evm_increaseTime", [500]);
    await ethers.provider.send("evm_mine", []);

    await expect(auction.connect(alice).revealBid(name, bidAmount, salt))
      .to.emit(auction, "BidRevealed")
      .withArgs(namehash, alice.address, bidAmount);

    expect(await auction.getHighestBid(namehash)).to.equal(bidAmount);
    expect(await auction.getHighestBidder(namehash)).to.equal(alice.address);
  });

  it("finalizes auction, assigns winner, and locks proceeds (T010)", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice, bob] = signers;
    if (!alice || !bob) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    const auction = await AH.deploy(await reg.getAddress(), 1n, 1000n);
    await auction.waitForDeployment();

    const name = "domainx";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));
    const saltA = ethers.encodeBytes32String("a-salt");
    const saltB = ethers.encodeBytes32String("b-salt");
    const bidA = 3n, bidB = 6n;

    const commitA = ethers.keccak256(
      ethers.solidityPacked(["string", "uint256", "bytes32", "address"], [name, bidA, saltA, alice.address])
    );
    const commitB = ethers.keccak256(
      ethers.solidityPacked(["string", "uint256", "bytes32", "address"], [name, bidB, saltB, bob.address])
    );

    await auction.connect(alice).commitBid(namehash, commitA, { value: 1n });
    await auction.connect(bob).commitBid(namehash, commitB, { value: 1n });
    await auction.connect(alice).revealBid(name, bidA, saltA);
    await auction.connect(bob).revealBid(name, bidB, saltB);
    await ethers.provider.send("evm_increaseTime", [1001]);
    await ethers.provider.send("evm_mine", []);

    const prevProceeds = await auction.proceeds();
    await expect(auction.finalizeAuction(name))
      .to.emit(auction, "AuctionFinalized")
      .withArgs(namehash, bob.address, bidB);

    expect(await reg.ownerOf(namehash)).to.equal(bob.address);
    expect(await auction.isFinalized(namehash)).to.be.true;
    expect((await auction.proceeds()) - prevProceeds).to.equal(1n);

    await expect(auction.finalizeAuction(name))
      .to.be.revertedWithCustomError(auction, "AuctionAlreadyFinalized");
  });

  it("allows losing bidders to withdraw safely (T011)", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice, bob] = signers;
    if (!alice || !bob) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const AH = await ethers.getContractFactory("AuctionHouse");
    const auc = await AH.deploy(await reg.getAddress(), 1n, 1000n);
    await auc.waitForDeployment();

    const name = "refundtest";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    const salt1 = ethers.encodeBytes32String("salt1");
    const salt2 = ethers.encodeBytes32String("salt2");
    const bid1 = 3n, bid2 = 6n;

    const commit1 = ethers.keccak256(
      ethers.solidityPacked(["string", "uint256", "bytes32", "address"], [name, bid1, salt1, alice.address])
    );
    const commit2 = ethers.keccak256(
      ethers.solidityPacked(["string", "uint256", "bytes32", "address"], [name, bid2, salt2, bob.address])
    );

    await auc.connect(alice).commitBid(namehash, commit1, { value: 1n });
    await auc.connect(bob).commitBid(namehash, commit2, { value: 1n });
    await auc.connect(alice).revealBid(name, bid1, salt1);
    await auc.connect(bob).revealBid(name, bid2, salt2);
    await ethers.provider.send("evm_increaseTime", [2000]);
    await ethers.provider.send("evm_mine", []);
    await auc.finalizeAuction(name);

    const before = await ethers.provider.getBalance(alice.address);
    const tx = await auc.connect(alice).withdraw(namehash);
    const receipt = await tx.wait(); // returns TransactionReceipt | null
    if (!receipt) throw new Error("Transaction receipt was null");

    const gasUsed = receipt.gasUsed * (tx.gasPrice ?? 0n);
    const after = await ethers.provider.getBalance(alice.address);
    const effectiveAfter = after + gasUsed;

    expect(effectiveAfter).to.be.gt(before);

    await expect(auc.connect(bob).withdraw(namehash))
      .to.be.revertedWithCustomError(auc, "WinnerCannotWithdraw");

    await expect(auc.connect(alice).withdraw(namehash))
      .to.be.revertedWithCustomError(auc, "NothingToWithdraw");
  });

  it("allows owner to set and resolve address (T012)", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice] = signers;
    if (!alice) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy(); await reg.waitForDeployment();

    const name = "alice";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));
    await reg.register(name, alice.address);

    const target = ethers.getAddress("0x00000000000000000000000000000000000b0b01");

    await expect(reg.connect(alice).setResolve(name, target))
      .to.emit(reg, "ResolveSet")
      .withArgs(namehash, target);

    expect(await reg.resolve(name)).to.equal(target);
  });

  it("allows losing bidders to withdraw safely (T011)", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice, bob] = signers;
    if (!alice || !bob) throw new Error("signers missing");

    const Registry = await ethers.getContractFactory("Registry");
    const reg = await Registry.deploy();
    await reg.waitForDeployment();

    const Auction = await ethers.getContractFactory("AuctionHouse");
    const auc = await Auction.deploy(await reg.getAddress(), 1n, 1000n);
    await auc.waitForDeployment();

    const name = "refundtest";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    const salt1 = ethers.encodeBytes32String("salt1");
    const salt2 = ethers.encodeBytes32String("salt2");
    const bid1 = 3n;
    const bid2 = 6n;

    const commit1 = ethers.keccak256(
      ethers.solidityPacked(["string", "uint256", "bytes32", "address"], [name, bid1, salt1, alice.address])
    );
    const commit2 = ethers.keccak256(
      ethers.solidityPacked(["string", "uint256", "bytes32", "address"], [name, bid2, salt2, bob.address])
    );

    await auc.connect(alice).commitBid(namehash, commit1, { value: 1n });
    await auc.connect(bob).commitBid(namehash, commit2, { value: 1n });

    await auc.connect(alice).revealBid(name, bid1, salt1);
    await auc.connect(bob).revealBid(name, bid2, salt2);

    await ethers.provider.send("evm_increaseTime", [2000]);
    await ethers.provider.send("evm_mine", []);
    await auc.finalizeAuction(name);

    // --- Alice (loser) withdraws safely ---
    const before = await ethers.provider.getBalance(alice.address);
    const tx = await auc.connect(alice).withdraw(namehash);
    const receipt = (await tx.wait())!;
    const gasUsed = receipt.gasUsed * (tx.gasPrice ?? 0n);
    const after = await ethers.provider.getBalance(alice.address);
    const effectiveAfter = after + gasUsed; // balance + gas spent

    expect(effectiveAfter).to.be.gt(before);

    // --- Winner cannot withdraw ---
    await expect(auc.connect(bob).withdraw(namehash)).to.be.revertedWith("winner cannot withdraw");

    // --- Double withdraw prevention ---
    await expect(auc.connect(alice).withdraw(namehash)).to.be.revertedWith("nothing to withdraw");
  });

  it("allows owner to set and resolve address (T012)", async () => {
    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    const [deployer, alice] = signers;
    if (!alice) throw new Error("signers missing");

    const Reg = await ethers.getContractFactory("Registry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const name = "alice";
    const namehash = ethers.keccak256(ethers.toUtf8Bytes(name));

    await reg.register(name, alice.address);

    // lower-case literal is fine, but normalize for assertions:
    const target = "0x00000000000000000000000000000000000b0b01";
    const targetChecksum = ethers.getAddress(target); // <-- normalize

    await expect(reg.connect(alice).setResolve(name, target))
      .to.emit(reg, "ResolveSet")
      .withArgs(namehash, targetChecksum); // <-- use checksum form

    const resolved = await reg.resolve(name);
    expect(resolved).to.equal(targetChecksum); // also compare checksummed form
  });
});
