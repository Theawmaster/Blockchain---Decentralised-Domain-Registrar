import deployments from "@/lib/web3/deployments.json";
import RegistryABI from "@/abis/Registry.json";
import AuctionHouseABI from "@/abis/AuctionHouse.json";

export const CONTRACTS = {
  registry: {
    address: deployments.Registry,
    abi: RegistryABI.abi,
  },
  auctionHouse: {
    address: deployments.AuctionHouse,
    abi: AuctionHouseABI.abi,
  },
};
