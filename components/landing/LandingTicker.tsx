"use client";

import { useEffect, useState } from "react";

type TickerItem = {
  symbol: string;
  price: number;
  change24h: number | null;
};

function fmt(n: number): string {
  if (n >= 1000) return `$${n.toFixed(2)}`;
  if (n >= 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

export function LandingTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchTicker = () => {
      fetch("/api/ticker")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setItems(data);
        })
        .catch(console.error);
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 60000); // re-fetch alle 60s
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) {
    return <div className="h-[44px] bg-bg-secondary border-y border-border w-full" />;
  }

  return (
    <div className="w-full h-[44px] bg-bg-secondary border-y border-border overflow-hidden">
      <div 
        className="h-full flex items-center overflow-x-auto snap-x snap-mandatory hide-scrollbar max-w-7xl mx-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Helper class hide-scrollbar handles webkit */}
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}} />
        
        {items.map((item, i) => {
          const isPos = item.change24h !== null && item.change24h >= 0;
          const isNeg = item.change24h !== null && item.change24h < 0;

          return (
            <div 
              key={item.symbol} 
              className="flex items-center h-full px-4 md:px-6 shrink-0 snap-start relative"
            >
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-text-secondary uppercase">{item.symbol}</span>
                <span className="font-mono text-sm text-text-primary">{fmt(item.price)}</span>
                
                {item.change24h !== null && (
                  <span 
                    className={`font-mono text-[11px] flex items-center gap-0.5 ${isPos ? 'text-positive' : isNeg ? 'text-negative' : 'text-text-secondary'}`}
                  >
                    {isPos ? '▲' : isNeg ? '▼' : ''}
                    {Math.abs(item.change24h).toFixed(2)}%
                  </span>
                )}
              </div>
              
              {/* Divider (not on the last item) */}
              {i < items.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-[18px] bg-white/12" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
