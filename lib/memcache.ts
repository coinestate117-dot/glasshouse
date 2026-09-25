/**
 * In-memory cache — replaces Supabase for environments where
 * SUPABASE_URL is not set. All data is fetched directly from APIs.
 * Resets on server restart (good enough for hackathon demo).
 */

import type { Asset, Holding, PortfolioStats } from "./supabase";

export const memCache: Record<string, any> = {
  assets: [] as Asset[],
  assetsAt: 0,

  wallets: new Map<string, { holdings: Holding[]; stats: PortfolioStats; fetchedAt: number }>(),

  leaderboard: [] as Array<PortfolioStats & { rank: number }>,
  leaderboardAt: 0,
};

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.length > 10 && url.startsWith("https://");
}
