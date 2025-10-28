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
  const auction = await AuctionHouse.deploy(registryAddress, 1n, 1000n);
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("✅ AuctionHouse deployed at:", auctionAddress);

  // Save deployment info to a JSON file for the frontend
  const deployments = {
    Registry: registryAddress,
    AuctionHouse: auctionAddress,
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "../frontend/config/deployments.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));

  console.log("📁 Deployment info saved to:", outPath);
}

main().catch((e) => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});
