import fs from "fs";
import path from "path";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

interface SnapshotEntry {
  address: string;
  positions: { ticker: string; amount: number }[];
}

export interface HolderChange {
  ticker: string;
  /** Date string of oldest snapshot used */
  sinceDate: string;
  /** Date string of newest snapshot */
  latestDate: string;
  holdersNow: number;
  holdersBefore: number;
  holderDiff: number;
  newHolders: { address: string; amount: number }[];
  soldOut: { address: string; prevAmount: number }[];
  netShareChange: number;
}

function listSnapshots(): string[] {
  try {
    return fs
      .readdirSync(SNAPSHOT_DIR)
      .filter((f: string) => f.endsWith(".json"))
      .sort();
  } catch {
    return [];
  }
}

function loadSnapshot(filename: string): SnapshotEntry[] {
  const raw = fs.readFileSync(path.join(SNAPSHOT_DIR, filename), "utf-8");
  return JSON.parse(raw);
}

/**
 * Compare holder changes for a specific ticker between the oldest
 * and newest available snapshots.
 * Returns null if fewer than 2 snapshots exist.
 */
export function getHolderChanges(ticker: string): HolderChange | null {
  const files = listSnapshots();
  if (files.length < 2) return null;

  const oldestFile = files[0];
  const latestFile = files[files.length - 1];

  const oldest = loadSnapshot(oldestFile);
  const latest = loadSnapshot(latestFile);

  // Build maps: address → amount for this ticker
  const oldMap = new Map<string, number>();
  for (const w of oldest) {
    const pos = w.positions.find((p) => p.ticker === ticker);
    if (pos && pos.amount > 0) oldMap.set(w.address, pos.amount);
  }

  const newMap = new Map<string, number>();
  for (const w of latest) {
    const pos = w.positions.find((p) => p.ticker === ticker);
    if (pos && pos.amount > 0) newMap.set(w.address, pos.amount);
  }

  // New holders: in new but not in old
  const newHolders: { address: string; amount: number }[] = [];
  for (const [addr, amount] of newMap) {
    if (!oldMap.has(addr)) {
      newHolders.push({ address: addr, amount });
    }
  }
  newHolders.sort((a, b) => b.amount - a.amount);

  // Sold out: in old but not in new
  const soldOut: { address: string; prevAmount: number }[] = [];
  for (const [addr, amount] of oldMap) {
    if (!newMap.has(addr)) {
      soldOut.push({ address: addr, prevAmount: amount });
    }
  }
  soldOut.sort((a, b) => b.prevAmount - a.prevAmount);

  // Net share change
  let totalNow = 0;
  let totalBefore = 0;
  for (const v of newMap.values()) totalNow += v;
  for (const v of oldMap.values()) totalBefore += v;

  return {
    ticker,
    sinceDate: oldestFile.replace(".json", ""),
    latestDate: latestFile.replace(".json", ""),
    holdersNow: newMap.size,
    holdersBefore: oldMap.size,
    holderDiff: newMap.size - oldMap.size,
    newHolders: newHolders.slice(0, 5),
    soldOut: soldOut.slice(0, 5),
    netShareChange: totalNow - totalBefore,
  };
}

/** How many snapshots exist */
export function snapshotCount(): number {
  return listSnapshots().length;
}
