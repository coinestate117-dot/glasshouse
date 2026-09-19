import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  // Next.js hydration needs unsafe-inline; TradingView loads its widget script
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com https://*.tradingview.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Token logos come from xstocks-metadata.backed.fi, prestocks.com, wallet icons are data: URIs
  "img-src 'self' data: blob: https:",
  // TradingView widget renders in an iframe; DexScreener chart embed
  "frame-src https://*.tradingview.com https://www.tradingview-widget.com https://dexscreener.com",
  // RPC (Helius, public Solana), Jupiter swap API, TradingView data, OG image fetch
  "connect-src 'self' https://*.helius-rpc.com wss://*.helius-rpc.com https://api.mainnet-beta.solana.com https://api.jup.ag https://*.tradingview.com wss://*.tradingview.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
