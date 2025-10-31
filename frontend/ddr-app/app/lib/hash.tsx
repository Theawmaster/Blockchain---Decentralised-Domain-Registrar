import { keccak256, encodePacked } from "viem";

/**
 * Generate deterministic commit hash:
 * keccak256(abi.encodePacked(name, bidWei, salt, bidder))
 */
export function makeBidHash(
  domain: string,
  bidWei: bigint,
  salt: `0x${string}`,
  bidder: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodePacked(["string", "uint256", "bytes32", "address"], [
      domain,
      bidWei,
      salt,
      bidder,
    ])
  );
}

/**
 * Create a random salt for commit phase.
 */
export function randomSalt(): `0x${string}` {
  return `0x${[...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
}
