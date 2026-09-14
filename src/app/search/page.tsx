"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length >= 32) {
      router.push(`/wallet/${trimmed}`);
    }
  }

  return (
    <div style={{ padding: "24px 16px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        Search Wallet
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Paste a Solana wallet address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "14px 16px",
            color: "var(--text)",
            fontSize: 15,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      </form>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          marginTop: 12,
          lineHeight: 1.5,
        }}
      >
        Enter a Solana wallet address to see its xStock portfolio.
        Only wallets holding xStocks are tracked.
      </p>
    </div>
  );
}
