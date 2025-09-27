import { ethers } from "hardhat";

async function main() {
  const Registry = await ethers.getContractFactory("Registry");
  const reg = await Registry.deploy();
  await reg.waitForDeployment();
  console.log("Registry deployed:", await reg.getAddress());
}
main().catch((e) => { console.error(e); process.exit(1); });
