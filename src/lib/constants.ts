export const SYSTEM_PROGRAM = "11111111111111111111111111111111";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// Known treasury / issuer / pool addresses to exclude from rankings.
// The single largest holder per xStock is almost always the issuer treasury.
// This list is seeded with addresses found during exploration and extended at runtime.
export const BLOCKLIST: Set<string> = new Set([
  // xStocks issuer treasury (appears as top holder on most tokens)
  "S7vYFFWH6BjJyEsdrPQpqpYTqLTrPRK6KW3VwsJuRaS",
  // Add more as discovered during sync
]);

// Minimum portfolio value (USD) to include a wallet in rankings
export const MIN_PORTFOLIO_VALUE_USD = 10;

// xStocks API
export const XSTOCKS_API_BASE = "https://api.xstocks.fi/api/v2/public";

// Yahoo Finance
export const YAHOO_FINANCE_BASE =
  "https://query1.finance.yahoo.com/v8/finance/chart";
