export const SYSTEM_PROGRAM = "11111111111111111111111111111111";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// Only truly non-human accounts: AMM pools, routing, CEX hot wallets, issuer treasury.
// Whales and market makers stay IN — they get labels instead.
export const BLOCKLIST: Set<string> = new Set([
  // xStocks issuer treasury (top holder on nearly every token)
  "S7vYFFWH6BjJyEsdrPQpqpYTqLTrPRK6KW3VwsJuRaS",
  // Treasury/Issuer: 925 pos, $1.37B, 0.3 SOL, holds every xStock
  "9U76mo3WuP28s4kYJ9CMH1CiQh6Ph3r5Zg5awZM5vMQd",
  // Treasury/Custodian: 650 pos, $92M, 87K SOL
  "6LY1JzAFVZsP2a2xKrtU6znQMQ5h4i7tocWdgrkZzkzF",
  // Treasury/Issuer: 632 pos, $34M, 0.06 SOL
  "41Mjig92SfveWPKkqis78hF3a75cpe96n1uuVuMAdkJF",
  // Issuer/Custodian: 525 pos, $14M, 50K SOL
  "9A9dUreQvTNoqNrqQC2DN1onfZWBtCBsTiuA6oGXZwc6",
]);

// Minimum portfolio value to appear in the leaderboard
export const MIN_PORTFOLIO_VALUE_USD = 100;

// xStocks API
export const XSTOCKS_API_BASE = "https://api.xstocks.fi/api/v2/public";

// Yahoo Finance
export const YAHOO_FINANCE_BASE =
  "https://query1.finance.yahoo.com/v8/finance/chart";
