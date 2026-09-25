import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const supabase = createServerClient();

  const { data, error } = await supabase._raw
    .from("portfolio_stats")
    .select("wallet, total_value, position_count, top_symbol, top_weight, change_24h_pct, rank, updated_at")
    .order("total_value", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    meta: {
      limit,
      offset,
      count: data.length,
    }
  });
}
