import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting deployment...");

  // --- Deploy Registry ---
  const Registry = await ethers.getContractFactory("Registry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ Registry deployed at:", registryAddress);

  // --- Deploy AuctionHouse ---
  const AuctionHouse = await ethers.getContractFactory("AuctionHouse");

  // Reserve price (how much ETH a bidder must put in)
  const RESERVE_PRICE = ethers.parseEther("0.01"); // 0.01 ETH

  // ✅ Timings (seconds)
  const COMMIT_DURATION = 60n * 3n;   // 3 minutes commit phase
  const REVEAL_DURATION = 60n * 3n;   // 3 minutes reveal phase

  // Domain ownership expiry (example: 1 year)
  const DEFAULT_EXPIRY = 365n * 24n * 60n * 60n; // 1 year

  // Deploy AuctionHouse
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

  // --- Save Deployment Metadata ---
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
  console.log("🎉 Done!");
}

main().catch((e) => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});
