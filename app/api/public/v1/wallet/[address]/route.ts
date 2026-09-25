import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const address = (await params).address;
  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get portfolio stats
  const { data: stats, error: statsError } = await supabase._raw
    .from("portfolio_stats")
    .select("*")
    .eq("wallet", address)
    .maybeSingle();

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }

  // Get holdings
  const { data: holdings, error: holdingsError } = await supabase._raw
    .from("holdings")
    .select("mint, symbol, ui_amount, price_usd, value_usd, weight")
    .eq("wallet", address)
    .order("weight", { ascending: false });

  if (holdingsError) {
    return NextResponse.json({ error: holdingsError.message }, { status: 500 });
  }

  if (!stats && (!holdings || holdings.length === 0)) {
    return NextResponse.json({ error: "Wallet not found or not tracked" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      address,
      stats: stats || null,
      holdings: holdings || [],
    }
  });
}
