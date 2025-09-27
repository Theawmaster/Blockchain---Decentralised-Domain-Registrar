import { ethers } from "hardhat";
async function main() {
  console.log("Current block:", await ethers.provider.getBlockNumber());
}
main().catch((e) => { console.error(e); process.exit(1); });
