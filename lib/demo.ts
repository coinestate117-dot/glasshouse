/**
 * Demo-Modus — vollständig synthetische Daten für Vorführungen ohne API-Key.
 *
 * Wichtig: Diese Daten sind NICHT echt. Jede Oberfläche, die sie anzeigt, muss
 * den Demo-Modus sichtbar kennzeichnen (siehe DemoBanner). Im Demo-Modus wird
 * nie eine echte Transaktion gebaut, signiert oder gesendet.
 */

export const DEMO_COOKIE = "gh_demo";

export type DemoHolding = {
  mint: string;
  symbol: string;
  ui_amount: number;
  price_usd: number;
  value_usd: number;
  weight: number;
};

export type DemoWallet = {
  address: string;
  label: string;
  holdings: DemoHolding[];
  total_value: number;
  change_24h_pct: number;
};

const PRICES: Record<string, { price: number; change24h: number }> = {
  NVDAx: { price: 184.32, change24h: 2.41 },
  AAPLx: { price: 241.18, change24h: -0.62 },
  TSLAx: { price: 412.77, change24h: 3.88 },
  MSFTx: { price: 428.05, change24h: 0.94 },
  METAx: { price: 604.51, change24h: -1.27 },
  GOOGLx: { price: 196.44, change24h: 1.12 },
  AMZNx: { price: 223.9, change24h: 0.38 },
  SPYx: { price: 598.13, change24h: 0.21 },
  COINx: { price: 312.66, change24h: -2.95 },
  MSTRx: { price: 389.4, change24h: 5.17 },
};

function mintFor(symbol: string): string {
  // Deterministischer Platzhalter-Mint — bewusst kein echter Mainnet-Mint.
  return `Demo${symbol.padEnd(8, "x")}1111111111111111111111`.slice(0, 44);
}

function buildWallet(
  address: string,
  label: string,
  positions: Array<[string, number]>
): DemoWallet {
  const raw = positions.map(([symbol, amount]) => {
    const p = PRICES[symbol];
    return {
      mint: mintFor(symbol),
      symbol,
      ui_amount: amount,
      price_usd: p.price,
      value_usd: amount * p.price,
      weight: 0,
    };
  });

  const total = raw.reduce((s, h) => s + h.value_usd, 0);
  const holdings = raw
    .map((h) => ({ ...h, weight: total > 0 ? h.value_usd / total : 0 }))
    .sort((a, b) => b.value_usd - a.value_usd);

  const change = holdings.reduce(
    (sum, h) => sum + (PRICES[h.symbol]?.change24h ?? 0) * h.weight,
    0
  );

  return { address, label, holdings, total_value: total, change_24h_pct: change };
}

export const DEMO_WALLETS: DemoWallet[] = [
  buildWallet("Demo1ndexFundBroadMarketSpread7h2Kq9", "Index-Stil", [
    ["SPYx", 420], ["NVDAx", 310], ["MSFTx", 180], ["AAPLx", 240], ["GOOGLx", 190], ["AMZNx", 140],
  ]),
  buildWallet("DemoTechHeavyGrowthConviction4m8Rt2", "Tech-lastig", [
    ["NVDAx", 680], ["TSLAx", 190], ["METAx", 95], ["MSFTx", 120],
  ]),
  buildWallet("DemoConcentratedSingleNameBet9x3Fw6", "Konzentriert", [
    ["NVDAx", 1180], ["COINx", 60],
  ]),
  buildWallet("DemoBa1ancedB1ueChipCoreHo1d5k7Lp1", "Ausgewogen", [
    ["AAPLx", 310], ["MSFTx", 190], ["SPYx", 120], ["AMZNx", 165], ["GOOGLx", 140],
  ]),
  buildWallet("DemoCryptoAdjacentBasketMix3q6Yn8", "Krypto-nah", [
    ["MSTRx", 260], ["COINx", 210], ["NVDAx", 85],
  ]),
  buildWallet("DemoSteadyAccumu1atorSparp1an2w9Zd4", "Sparplan-Stil", [
    ["SPYx", 180], ["AAPLx", 95], ["MSFTx", 70], ["NVDAx", 45],
  ]),
  buildWallet("DemoMomentumRotationSwing8t4Vj5Uc", "Momentum", [
    ["TSLAx", 240], ["MSTRx", 110], ["METAx", 62], ["NVDAx", 70],
  ]),
  buildWallet("DemoSma11StarterDepotEntry6r2Hs3Bx", "Einsteiger", [
    ["SPYx", 22], ["AAPLx", 14], ["NVDAx", 18],
  ]),
];

/** Depot, das im Demo-Modus als "eigenes" Depot im Dashboard erscheint. */
export const DEMO_OWN_WALLET: DemoWallet = buildWallet(
  "DemoYourConnectedDepotSamp1e1n5Gk7",
  "Dein Demo-Depot",
  [["NVDAx", 42], ["AAPLx", 30], ["SPYx", 18], ["TSLAx", 9]]
);

/** Gleiche Form wie LeaderboardEntry aus lib/direct, damit der Client-Code identisch bleibt. */
export type DemoLeaderboardEntry = {
  address: string;
  total_value: number;
  position_count: number;
  top_symbol: string | null;
  top_weight: number | null;
  change_24h_pct: number | null;
  rank: number;
  holdings: Array<{ symbol: string; weight: number; value_usd: number }>;
};

export function demoLeaderboard(): DemoLeaderboardEntry[] {
  return [...DEMO_WALLETS]
    .sort((a, b) => b.total_value - a.total_value)
    .map((w, i) => ({
      address: w.address,
      total_value: w.total_value,
      position_count: w.holdings.length,
      top_symbol: w.holdings[0]?.symbol ?? null,
      top_weight: w.holdings[0]?.weight ?? null,
      change_24h_pct: w.change_24h_pct,
      rank: i + 1,
      holdings: w.holdings.map((h) => ({
        symbol: h.symbol,
        weight: h.weight,
        value_usd: h.value_usd,
      })),
    }));
}

export function demoWalletByAddress(address: string): DemoWallet | null {
  if (address === DEMO_OWN_WALLET.address) return DEMO_OWN_WALLET;
  return DEMO_WALLETS.find((w) => w.address === address) ?? null;
}

export function demoMarkets() {
  return Object.entries(PRICES)
    .map(([symbol, p]) => ({
      symbol,
      name: `${symbol.replace(/x$/, "")} (Demo)`,
      mint: mintFor(symbol),
      price: p.price,
      change24h: p.change24h,
      logoUrl: null as string | null,
    }))
    .sort((a, b) => b.price - a.price);
}

export function demoTicker() {
  return Object.entries(PRICES).map(([symbol, p]) => ({
    symbol,
    price: p.price,
    change24h: p.change24h,
  }));
}

export function demoStats() {
  const tracked = DEMO_WALLETS.reduce((s, w) => s + w.total_value, 0);
  return {
    trackedValueUsd: tracked,
    walletsObserved: DEMO_WALLETS.length,
    mostActivePosition: "NVDAx",
  };
}

/* ---------------- Demo-Konto ----------------
   Vollständige Kontodaten für die Vorführung. Alles erfunden — die
   Oberfläche kennzeichnet das an jeder Stelle. */

export type DemoDevice = {
  id: string;
  label: string;
  method: string;
  createdAt: string;
  lastUsedAt: string;
};

export const DEMO_ACCOUNT = {
  createdAt: "2026-07-03T09:14:00.000Z",
  signedInAt: "2026-09-15T08:02:00.000Z",
  lastSeenAt: "2026-09-15T08:02:00.000Z",
  walletName: "Phantom",
  devices: [
    {
      id: "demo-device-iphone",
      label: "iPhone 16 Pro",
      method: "Face ID",
      createdAt: "2026-07-03T09:16:00.000Z",
      lastUsedAt: "2026-09-15T08:02:00.000Z",
    },
    {
      id: "demo-device-macbook",
      label: "MacBook Pro",
      method: "Touch ID",
      createdAt: "2026-08-11T17:40:00.000Z",
      lastUsedAt: "2026-09-14T20:31:00.000Z",
    },
  ] as DemoDevice[],
};

/**
 * Das Demo-Konto in genau der Form, die /api/auth/session sonst für eine
 * echte Wallet-Anmeldung liefert.
 *
 * Damit ist der Demo-Modus für die ganze App eine ganz normale Anmeldung:
 * useAuth() bekommt einen Nutzer, und jede Ansicht — Kopfzeile, Kontomenü,
 * Depot — verhält sich identisch zum Live-Betrieb. Vorher war auth.user im
 * Demo-Modus null, weshalb oben rechts "Wallet installieren" stand statt
 * des Kontos.
 */
export function demoAuthUser() {
  return {
    address: DEMO_OWN_WALLET.address,
    createdAt: DEMO_ACCOUNT.createdAt,
    lastSeenAt: DEMO_ACCOUNT.lastSeenAt,
    signedInAt: DEMO_ACCOUNT.signedInAt,
    passkeyCount: DEMO_ACCOUNT.devices.length,
    passkeys: DEMO_ACCOUNT.devices.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      transports: ["internal"] as string[],
    })),
  };
}

/**
 * Handelsaktivität für das Demo-Konto.
 *
 * Bewusst nur im Demo vorhanden: Im Live-Betrieb gibt es ohne eigenen
 * Indexer keine belastbare Handelshistorie, und erfundene Zahlen dürfen dort
 * nicht erscheinen. Die Kontoansicht blendet diesen Block live deshalb aus,
 * statt Platzhalter zu zeigen.
 */
export function demoActivity() {
  return {
    tradeCount30d: 14,
    volume30dUsd: 8420.5,
    firstTradeAt: "2026-07-03T10:22:00.000Z",
    lastTradeAt: "2026-09-22T14:08:00.000Z",
    rebuiltDepots: 3,
    bestPosition: { symbol: "MSTRx", changePct: 5.17 },
    worstPosition: { symbol: "METAx", changePct: -1.27 },
  };
}
