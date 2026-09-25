"use client";

import React from "react";

type TickerItem = {
  symbol: string;
  price: number;
  change24h: number | null;
};

type Props = { items: TickerItem[] };

function fmt(n: number): string {
  if (n >= 1000) return `$${n.toFixed(2)}`;
  if (n >= 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

export function TickerStrip({ items }: Props) {
  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {doubled.map((item, i) => {
          const isPos = item.change24h !== null && item.change24h >= 0;
          const isNeg = item.change24h !== null && item.change24h < 0;

          return (
            <div className="ticker-item" key={`${item.symbol}-${i}`}>
              <span className="ticker-symbol">{item.symbol}</span>
              <span className="ticker-price">{fmt(item.price)}</span>
              {item.change24h !== null && (
                <span
                  className={
                    isPos
                      ? "ticker-change-pos"
                      : isNeg
                      ? "ticker-change-neg"
                      : ""
                  }
                  style={{ fontSize: "10px", fontFamily: "var(--font-mono)" }}
                >
                  {isPos ? "+" : ""}
                  {item.change24h.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
