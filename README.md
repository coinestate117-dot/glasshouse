# Glasshouse

A leaderboard of every tokenized stock portfolio on Solana. Browse wallets, compare holdings, copy portfolios in two taps.

## The problem

Your broker shows you your own portfolio and nothing else. On Solana, every token balance is public by design. Glasshouse reads that data, prices it, ranks it, and lets you act on it.

## What it does

**Leaderboard** — 1,347 wallets ranked by portfolio value. Filter by type (Holder, Investor, Whale, Market Maker). $253M total across 832 tokenized stocks.

**Wallet detail** — Full position list, allocation bar, 24h change, concentration score (Top 3 = X%). Share card for social. One-tap copy: pick an amount, the app builds the same mix using Jupiter swaps.

**Stock pages** — Per-ticker view for any of the 832 stocks. Price, holder count, who holds it, TradingView chart (Nasdaq) and GeckoTerminal chart (Solana token) side by side. Holder changes since the last snapshot.

**Pre-IPO** — 8 pre-IPO companies tracked via the PreStocks API: SpaceX, Anthropic, OpenAI, Anduril, Neuralink, Figure AI, Kalshi, Polymarket. 345 wallets hold at least one. Risk disclaimer included — some issuers have publicly stated these SPV-based transfers are not valid.

**Buy in two taps** — Tap a dollar amount, confirm in the review sheet. Wallet connects silently if Phantom was previously approved. Each position is a separate Jupiter swap (quote → sign → send → confirm). Route and price impact shown per order.

## Why Solana

Public balances are a property of the chain, not a feature we built. Every wallet's Token-2022 holdings are readable by anyone. Glasshouse turns that raw data into something useful. The same approach would not work on a chain with private balances.

## The multiplier problem

xStocks use Token-2022's Scaled UI Amount extension. The raw on-chain balance is not the display balance. The `multiplier` field and `newMultiplierEffectiveTimestamp` determine the actual amount. If you read the raw bytes without applying the multiplier, a 10:1 stock split shows one tenth of the real holdings. This breaks valuations and sorts the entire leaderboard wrong.

We apply the multiplier during the deep scan phase. The `jsonParsed` RPC encoding handles it automatically for portfolio building. The raw `dataSlice` path (used for fast bulk scanning) applies it manually from `assets.json`.

## Treasury filter

Without filtering, 88% of the market is one wallet. The xStocks issuer treasury held $1.37B across 925 positions — every token that exists. We block 5 addresses identified by three signals: 500+ positions, near-zero SOL balance, and holdings that span virtually every mint.

Blocked addresses (with reasons) are shown on the leaderboard. Users can expand the list and see why each was excluded.

| Address | Positions | Value | Reason |
|---------|-----------|-------|--------|
| `S7vY…RaS` | — | — | Primary issuer treasury |
| `9U76…vMQd` | 925 | $1.37B | Holds every xStock, 0.3 SOL |
| `6LY1…zkzF` | 650 | $92M | Second treasury, 87K SOL |
| `41Mj…dkJF` | 632 | $34M | Third treasury, 0.06 SOL |
| `9A9d…Zwc6` | 525 | $14M | Custodian/liquidity, 50K SOL |

## Wallet type labels

Derived from on-chain data, not self-reported.

| Type | Rule |
|------|------|
| Holder | 1 xStock position |
| Investor | 2–40 positions, xStocks ≥ 60% of Token-2022 holdings |
| Whale | xStocks < 30% of Token-2022 holdings |
| Market Maker | > 40 xStock positions |

Tapping a badge shows the rule. Distribution across the leaderboard: 509 Holders, 501 Investors, 320 Whales, 17 Market Makers.

## Security

- **CSP and security headers** — Content-Security-Policy with `frame-ancestors 'none'`, X-Frame-Options DENY, nosniff, strict Referrer-Policy, COOP same-origin. Blocks clickjacking on wallet approval flows.
- **No keys in the client** — Helius and Jupiter API keys are server-side only. Pyth key is not deployed (demo tier, no data access).
- **No on-chain contract** — Glasshouse reads data and routes swaps through Jupiter. No custom program, no admin keys, no fund custody.
- **Wallet signatures are fresh** — Every swap requires a new signature from the connected wallet. `skipPreflight` is off — the RPC simulates before broadcast.
- **OG image endpoint** — Rate-limited (30/min per IP), address-validated, CDN-cached (`s-maxage=3600`).
- **Ticker sanitization** — External API data (xstocks.fi symbols) is stripped to `[A-Z0-9.-]` before embedding in TradingView widget config.

## What's missing

- **Snapshot history starts Sep 16, 2026.** Holder change data requires at least two daily snapshots. The "New holders / Sold out" section on stock pages only appears after the second scan. No backfilled data.
- **Selling is not built.** The SELL button on stock pages is disabled. Selling requires knowing the user's holdings (needs a connected wallet) and reversing the Jupiter swap direction. Currently only buying is implemented.

## Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 15, TypeScript, React 19 |
| Solana RPC | Helius (mainnet) |
| Wallet | @solana/wallet-adapter-react (Phantom, Solflare via Wallet Standard) |
| Swaps | Jupiter Swap API v1 (`/swap/v1/quote` + `/swap/v1/swap`) |
| Stock prices | Yahoo Finance (underlying symbols) |
| Token prices | DexScreener API (pair addresses cached in scan) |
| Charts | TradingView Advanced Chart widget (Nasdaq), GeckoTerminal embed (Solana) |
| Pre-IPO data | PreStocks API (`prestocks.com/api/prestocks`) |
| OG images | @vercel/og (dynamic per wallet) |
| Hosting | Vercel |
| Scan | Custom `fullscan.ts` — getProgramAccounts for top 30 mints, getTokenLargestAccounts for the rest, ~25 min per run |

## Numbers

| Metric | Value |
|--------|-------|
| Wallets holding xStocks on Solana | ~294,000 |
| Tracked in Glasshouse (≥ $1K) | 4,620 |
| Leaderboard (≥ $10K) | 1,347 |
| Total portfolio value (leaderboard) | $253.4M |
| Tokenized stocks tracked | 832 |
| Pre-IPO tokens | 8 |
| Pre-IPO holders | 345 |
| Treasury addresses blocked | 5 |
| Daily scan RPC calls | ~15,000 |
| Daily scan duration | ~25 minutes |
