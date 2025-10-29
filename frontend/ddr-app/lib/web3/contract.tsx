import deployments from "@/lib/web3/deployments.json";
import RegistryABI from "@/abis/Registry.json";
import AuctionHouseABI from "@/abis/AuctionHouse.json";
import type { Address } from "viem";

export const CONTRACTS = {
  registry: {
    address: deployments.Registry as Address,
    abi: RegistryABI.abi,
  },
  auctionHouse: {
    address: deployments.AuctionHouse as Address,
    abi: AuctionHouseABI.abi,
  },
};
