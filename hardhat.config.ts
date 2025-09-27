import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "solidity-coverage";
import "hardhat-contract-sizer";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545" },
    // sepolia: {
    //   url: process.env.SEPOLIA_RPC_URL || "",
    //   accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    //   chainId: 11155111
    // }
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY || "" },
  typechain: { outDir: "typechained", target: "ethers-v6" },
  gasReporter: { enabled: process.env.REPORT_GAS === "1", currency: "USD", showMethodSig: true },
  contractSizer: { runOnCompile: true, strict: true, alphaSort: true }
};
export default config;
