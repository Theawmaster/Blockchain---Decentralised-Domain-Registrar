import { keccak256, encodePacked, parseEther, type Address } from "viem";

/**
 * Produces a commit hash that matches Solidity:
 * keccak256(abi.encodePacked(name, bidAmount, salt, bidder))
 */
export function hashBid(
  name: string,
  bidEth: string,
  salt: string,
  bidder: Address   // ✅ Correct type
) {
  return keccak256(
    encodePacked(
      ["string", "uint256", "string", "address"],
      [name, parseEther(bidEth), salt, bidder]
    )
  );
}
