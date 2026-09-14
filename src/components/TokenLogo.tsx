"use client";

import { useState } from "react";
import { colorForSymbol } from "./AllocationBar";

interface TokenLogoProps {
  symbol: string;
  logoUrl: string | null;
  size?: number;
}

export default function TokenLogo({
  symbol,
  logoUrl,
  size = 28,
}: TokenLogoProps) {
  const [failed, setFailed] = useState(false);
  const ticker = symbol.replace(/x$/i, "").slice(0, 4);

  if (!logoUrl || failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: colorForSymbol(symbol),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.36,
          fontWeight: 700,
          color: "#000",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {ticker}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{
        borderRadius: "50%",
        flexShrink: 0,
        objectFit: "cover",
        backgroundColor: "var(--border)",
      }}
    />
  );
}
