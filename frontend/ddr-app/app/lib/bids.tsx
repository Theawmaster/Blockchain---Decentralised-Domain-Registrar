/**
 * We store committed bids locally so we can reveal later.
 * Storage Key = "bids:<chainId>:<wallet>"
 */

export type StoredBid = {
  domain: string;
  bidWei: string;      // store as string; convert using BigInt when needed
  salt: `0x${string}`;
  revealed: boolean;
  ts: number;          // timestamp for sorting
};

function key(chainId: number, addr: string) {
  return `bids:${chainId}:${addr.toLowerCase()}`;
}

export function listBids(chainId: number, addr: string): StoredBid[] {
  try {
    return JSON.parse(localStorage.getItem(key(chainId, addr)) || "[]");
  } catch {
    return [];
  }
}

export function upsertBid(chainId: number, addr: string, bid: StoredBid) {
  const bids = listBids(chainId, addr);
  const idx = bids.findIndex((b) => b.domain === bid.domain);
  if (idx >= 0) bids[idx] = bid;
  else bids.push(bid);
  localStorage.setItem(key(chainId, addr), JSON.stringify(bids));
}

export function markRevealed(chainId: number, addr: string, domain: string) {
  const bids = listBids(chainId, addr);
  const idx = bids.findIndex((b) => b.domain === domain);
  if (idx >= 0) bids[idx].revealed = true;
  localStorage.setItem(key(chainId, addr), JSON.stringify(bids));
}

export function clearAllBids(chainId: number, addr: string) {
  localStorage.removeItem(key(chainId, addr));
}
