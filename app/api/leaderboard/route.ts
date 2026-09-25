import { NextResponse } from "next/server";
import { buildLeaderboard, getAssetsDirect, hasHeliusKey } from "@/lib/direct";
import { isDemoMode } from "@/lib/demo-mode";
import { DEMO_WALLETS } from "@/lib/demo";

export const runtime = "nodejs";

export type CopyEntry = {
  rank: number;
  address: string;
  label: string | null;
  total_value: number;
  change_24h_pct: number | null;
  position_count: number;
  holdings: Array<{ mint: string; symbol: string; weight: number; value_usd: number }>;
};

/**
 * Depots für die Nachbauen-Ansicht.
 *
 * Die Mint-Adresse muss mitgeliefert werden: ohne sie lässt sich kein
 * Tausch bauen. Die Ranglisten-Struktur führt sie nicht, deshalb wird sie
 * hier über die Symbole nachgeschlagen.
 */
export async function GET() {
  if (await isDemoMode()) {
    const entries: CopyEntry[] = [...DEMO_WALLETS]
      .sort((a, b) => b.total_value - a.total_value)
      .map((w, i) => ({
        rank: i + 1,
        address: w.address,
        label: w.label,
        total_value: w.total_value,
        change_24h_pct: w.change_24h_pct,
        position_count: w.holdings.length,
        holdings: w.holdings.map((h) => ({
          mint: h.mint,
          symbol: h.symbol,
          weight: h.weight,
          value_usd: h.value_usd,
        })),
      }));
    return NextResponse.json({ demo: true, available: true, entries });
  }

  // Ohne eigenen RPC-Zugang lässt sich live nicht ermitteln, wer einen Token
  // hält — der öffentliche Knoten sperrt getTokenLargestAccounts.
  if (!hasHeliusKey()) {
    return NextResponse.json({
      demo: false,
      available: false,
      entries: [],
      reason:
        "Die Depotsuche braucht einen eigenen RPC-Zugang. Kurse, Charts und dein eigenes Depot laufen bereits live.",
    });
  }

  try {
    const [board, assets] = await Promise.all([buildLeaderboard(), getAssetsDirect()]);
    const mintBySymbol = new Map(assets.map((a) => [a.symbol, a.mint]));

    const entries: CopyEntry[] = board.map((e) => ({
      rank: e.rank,
      address: e.address,
      label: null,
      total_value: e.total_value,
      change_24h_pct: e.change_24h_pct,
      position_count: e.position_count,
      holdings: e.holdings
        .map((h) => ({
          mint: mintBySymbol.get(h.symbol) ?? "",
          symbol: h.symbol,
          weight: h.weight,
          value_usd: h.value_usd,
        }))
        // Ohne Mint liesse sich die Position nicht nachbauen.
        .filter((h) => h.mint !== ""),
    }));

    return NextResponse.json({ demo: false, available: true, entries });
  } catch (err) {
    console.error("[api/leaderboard]", err);
    return NextResponse.json(
      { demo: false, available: false, entries: [], reason: "Depots konnten nicht geladen werden." },
      { status: 502 }
    );
  }
}
