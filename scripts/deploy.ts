import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting deployment...");

  const Registry = await ethers.getContractFactory("Registry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ Registry deployed at:", registryAddress);

  const AuctionHouse = await ethers.getContractFactory("AuctionHouse");

  const RESERVE_PRICE = ethers.parseEther("0.01"); // 0.01 ETH deposit
  const COMMIT_DURATION = 60n * 5n;                // 5 minutes to commit
  const REVEAL_DURATION = 60n * 5n;                // 5 minutes to reveal
  const DEFAULT_EXPIRY = 365n * 24n * 60n * 60n;   // 1 year expiry

  const auction = await AuctionHouse.deploy(
    registryAddress,
    RESERVE_PRICE,
    COMMIT_DURATION,
    REVEAL_DURATION,
    DEFAULT_EXPIRY
  );

  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("✅ AuctionHouse deployed at:", auctionAddress);

  const deployments = {
    Registry: registryAddress,
    AuctionHouse: auctionAddress,
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "../frontend/ddr-app/lib/web3/deployments.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));

  console.log("📁 Deployment info saved to:", outPath);
}

main().catch((e) => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});
