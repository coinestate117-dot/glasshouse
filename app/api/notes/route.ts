import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetWallet = searchParams.get("wallet");

  if (!targetWallet) {
    return NextResponse.json({ error: "Wallet parameter is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase._raw
    .from("wallet_notes")
    .select("id, author, content, created_at")
    .eq("wallet", targetWallet)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userAddress, targetWallet, content } = body;
    // Note: In production, verify a signed message here to prove userAddress ownership.

    if (!userAddress || !targetWallet || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Ensure user exists
    await supabase._raw
      .from("users")
      .upsert({ wallet_address: userAddress, last_login: new Date().toISOString() })
      .select();

    const { data, error } = await supabase._raw
      .from("wallet_notes")
      .insert({ wallet: targetWallet, author: userAddress, content })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, note: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
