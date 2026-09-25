import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from Solscan and xStocks
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.xstocks.fi" },
      { protocol: "https", hostname: "**.solscan.io" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },

  // Turbopack config (Next.js 16+ default bundler)
  // Solana web3.js uses Node.js builtins that need aliases in the browser bundle
  turbopack: {},

  // Experimental: allow server-side imports of node modules used in lib/ files
  serverExternalPackages: ["@solana/web3.js"],
};

export default nextConfig;
