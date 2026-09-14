export const SYSTEM_PROGRAM = "11111111111111111111111111111111";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// Only truly non-human accounts: AMM pools, routing, CEX hot wallets, issuer treasury.
// Whales and market makers stay IN — they get labels instead.
export const BLOCKLIST: Set<string> = new Set([
  // xStocks issuer treasury (top holder on nearly every token)
  "S7vYFFWH6BjJyEsdrPQpqpYTqLTrPRK6KW3VwsJuRaS",
]);

// Minimum portfolio value to appear in the leaderboard
export const MIN_PORTFOLIO_VALUE_USD = 100;

// xStocks API
export const XSTOCKS_API_BASE = "https://api.xstocks.fi/api/v2/public";

// Yahoo Finance
export const YAHOO_FINANCE_BASE =
  "https://query1.finance.yahoo.com/v8/finance/chart";
