# Glasshouse — One-Pager

*Solana Stocklana Hackathon · Team: Nils Spörri & Philipp Piekos · Submission deadline Fri Sept 18, 2026, 22:00 CET*

## The problem

A brokerage account is a black box. You never see what a bank's biggest clients, market makers, or "smart money" actually hold — only what the bank chooses to disclose, on its own schedule, in its own format.

## The solution

Glasshouse is a live leaderboard of real wallets holding tokenized US stocks (xStocks) on Solana, ranked by portfolio value. Every wallet is public by default because it's on-chain — Glasshouse just makes that transparency legible: rank, holdings, weighting, recent trades, all verifiable on Solscan. A "Rebuild at my size" flow lets anyone mirror a wallet's allocation at their own budget, executed through Jupiter, non-custodial — the user connects their own wallet and signs every transaction themselves.

No smart contract, no custody, no KYC. Glasshouse reads Solana mainnet and routes trades to existing infrastructure; it never holds a user's funds.

## Why this, why now

- xStocks (Backed Finance, distributed via Kraken, Bybit and others) made tokenized US equities liquid on Solana in 2025 — the underlying data this product needs didn't exist on any chain before.
- Stocklana's own judging criteria ask "could this be a real app people will actually use" and reward a genuinely Solana-specific value proposition — public portfolios are a feature no centralized broker can offer, on-chain or off.
- Retail interest in "what are the big holders doing" is already proven demand in crypto (wallet trackers, whale-watching tools); nobody has pointed that pattern at tokenized equities yet.

## What's built (status)

- Day 1: asset list + balance layer live, 52 candidate wallets filtered and verified, $123.96M in tracked portfolio value across real, Solscan-checkable addresses.
- In progress: wallet detail view, trade history, the Rebuild flow via Jupiter Ultra API.
- Shipping toward: a submission before the Thursday buffer, one day ahead of the Friday deadline.

## Team

Nils Spörri and Philipp Piekos — both TypeScript/React, no prior Anchor/Rust experience, which is why the architecture deliberately avoids writing any on-chain program.

## Possible directions beyond the hackathon (not commitments)

A referral fee on routed swaps (Jupiter supports referral accounts), a read-only API for other builders, or watchlists with paid alerts are the kinds of models that would fit without changing the non-custodial, no-KYC shape of the product. None of this is scoped or promised — it's the shortlist worth revisiting if Glasshouse continues past Sept 18.

---

# Feature Roadmap

*Ordered by effort vs. payoff, not by when they'll happen. Nothing here is required for the hackathon submission — the core three routes (leaderboard, wallet detail, rebuild flow) are the whole demo.*

### Near-term (natural next sprint)
- **Watchlists** — follow specific wallets, get notified when they open or close a position.
- **Wallet history chart** — portfolio value over time per wallet, not just the current snapshot.
- **Compare mode** — two or three wallets side by side, same layout as the detail view.
- **Refined tagging** — the Market Maker / Whale / Holder / Investor labels already in the leaderboard, made rule-based and shown with the reasoning (e.g. position count, holding age) instead of a static label.

### Medium-term
- **Public read-only API** — the leaderboard and portfolio data as a documented endpoint other Solana builders can query.
- **Progressive Web App** — installable, push notifications for watchlist alerts, without a native app store submission.
- **Jupiter referral integration** — the one credible, non-custodial revenue path that doesn't touch user funds.

### Longer-term / bigger bets
- **Scheduled rebuilds** — using Jupiter's payment-channel style spending limits (the same primitive the hackathon's Agentic Payments track is built around) so a user can pre-approve "keep matching wallet X" instead of re-signing every trade.
- **Opt-in verified wallets** — public figures or funds who want to claim and annotate their own listed wallet, rather than appearing anonymously.
- **Community curation** — light social layer (notes, not trading signals) on why a wallet is tagged the way it is.

None of the roadmap items should touch language implying returns, performance, or advice — the product stays "here is public data, you decide," on the leaderboard and in every feature built on top of it.
