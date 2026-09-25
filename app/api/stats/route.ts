import { NextResponse } from "next/server";
import { buildLeaderboard } from "@/lib/direct";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStats } from "@/lib/demo";

export async function GET() {
  if (await isDemoMode()) {
    return NextResponse.json(demoStats());
  }

  try {
    const leaderboard = await buildLeaderboard();
    
    let totalValue = 0;
    const symbolCounts: Record<string, number> = {};

    for (const stat of leaderboard) {
      totalValue += stat.total_value;
      
      if (stat.top_symbol) {
        symbolCounts[stat.top_symbol] = (symbolCounts[stat.top_symbol] || 0) + 1;
      }
    }

    // Find the most frequent top_symbol
    let mostActivePosition = "SOL"; // Fallback
    let maxCount = 0;
    for (const [symbol, count] of Object.entries(symbolCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostActivePosition = symbol;
      }
    }

    return NextResponse.json({
      trackedValueUsd: totalValue,
      walletsObserved: leaderboard.length,
      mostActivePosition,
    });
  } catch (error) {
    console.error("[api/stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
