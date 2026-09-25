import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get("wallet");

  if (!userAddress) {
    return NextResponse.json({ error: "Wallet parameter is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase._raw
    .from("watchlists")
    .select("target_wallet, added_at")
    .eq("user_address", userAddress);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ watchlists: data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userAddress, targetWallet, action } = body;
    // Note: In production, verify a signed message here to prove userAddress ownership.

    if (!userAddress || !targetWallet || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Ensure user exists
    await supabase._raw
      .from("users")
      .upsert({ wallet_address: userAddress, last_login: new Date().toISOString() })
      .select();

    if (action === "add") {
      const { error } = await supabase._raw
        .from("watchlists")
        .insert({ user_address: userAddress, target_wallet: targetWallet });

      if (error && error.code !== "23505") { // Ignore unique violation
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, added: true });
    } else if (action === "remove") {
      const { error } = await supabase._raw
        .from("watchlists")
        .delete()
        .match({ user_address: userAddress, target_wallet: targetWallet });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, removed: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
