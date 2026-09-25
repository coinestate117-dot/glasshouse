# Glasshouse — Vollständiger Bau-Prompt

Alles zum Kopieren in Claude Code. Unten in einem Block, darüber die Erklärung der Teile.

---

## Vor dem Start — einmal prüfen

- [ ] `.env.local` liegt im Projektordner mit `HELIUS_API_KEY` und `JUPITER_API_KEY`
- [ ] `.env.local` steht in `.gitignore`
- [ ] Repo `glasshouse` ist geklont, du bist im Ordner
- [ ] Claude Code läuft im Ordner (Terminal `claude` oder Desktop-App, Code-Tab)

---

## DER PROMPT (alles ab hier kopieren)

```
Wir bauen "Glasshouse" für den Stocklana-Hackathon der Solana Foundation.
Deadline: Freitag 18.09.2026, 16:00 ET = 22:00 Uhr Schweizer Zeit.
Ziel: Donnerstag einreichen. Team: zwei Personen, beide TypeScript/React,
kein Rust/Anchor-Wissen.

=== DIE IDEE ===
Auf Solana sind tokenisierte US-Aktien (xStocks, z.B. NVDAx, AAPLx,
TSLAx) frei handelbar, und jedes Wallet-Depot ist öffentlich einsehbar
— anders als bei einer Bank. Glasshouse zeigt eine Rangliste echter
Wallets nach Depotwert, lässt dich jedes Depot im Detail ansehen, und
gibt dir einen Knopf, der ein fremdes Depot mit deinem Betrag nachbaut
und über Jupiter ausführt.

Kein eigener Smart Contract, kein Rust. Wir lesen Mainnet-Daten und
reichen Käufe an bestehende Infrastruktur (Jupiter) weiter.

=== RANDBEDINGUNGEN, NICHT VERHANDELBAR ===
- Kein Anchor/Rust, keine eigene On-Chain-Logik.
- Kein KYC, keine Kartenzahlung, keine Verwahrung fremder Gelder.
  Nutzer verbindet eigene Wallet und unterschreibt selbst.
- Alle Daten sind ECHT, Mainnet. Keine Fake-/Demo-Daten, auch nicht
  für die UI-Entwicklung — die echten Endpunkte sind kostenlos und
  einfacher als erfundene Daten zu pflegen.
- Mobile-first. Die meisten Juroren schauen sich das Video an, nicht
  die Desktop-Seite.

=== TECH-STACK ===
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres) als Cache-Schicht für Wallet-/Portfolio-Daten
- Helius als Solana-RPC-Anbieter (Mainnet)
- Jupiter Price API + Ultra API für Ausführung
- @solana/web3.js und @solana/wallet-adapter für die Wallet-Anbindung
- Deploy: Vercel

Env-Variablen, die ich bereits gesetzt habe:
  HELIUS_API_KEY
  JUPITER_API_KEY
Prüfe beim Start, ob beide geladen werden, aber gib ihren Wert nie aus.

=== DESIGN-RICHTUNG ===
Solana-Ökosystem-Ton, aber mit einem eigenen Wiedererkennungsmerkmal
— kein reiner Klon, sonst siehst du aus wie die anderen 40 Projekte.

- Hintergrund #000000, Flächen #0E0E11
- Akzente #14F195 (grün) und #9945FF (violett), Verlauf diagonal
  eingesetzt, nicht als Vollflächen-Hintergrund
- Schrift: eckig/technisch, AUSDRÜCKLICH NICHT Inter, Roboto oder Arial.
  Zahlen und Beträge immer in Monospace, rechtsbündig, damit Spalten
  sauber untereinanderstehen.
- Ecken 2-6px, keine Pillenform, keine runden Icon-Container.
- Referenz für Dichte, Tabellenaufbau und Informationshierarchie:
  jup.ag und raydium.io. Schau dir beide an, bevor du Komponenten baust.
- Dark Mode ist Standard, prüfe trotzdem einen Light-Mode-Toggle.
- Finde EIN eigenes visuelles Element, das nur Glasshouse hat (z.B.
  eine spezifische Art, Portfoliogewichtung darzustellen). Schlag mir
  eine Option vor, bevor du sie umsetzt.

=== DATENMODELL & QUELLEN ===

1. Asset-Liste (welche xStocks gibt es)
   GET https://api.xstocks.fi/api/v2/public/assets
   Keine Auth nötig. Enthält Symbol, Mint-Adresse, Decimals.
   In Supabase-Tabelle `assets` cachen.

2. Multiplier / korrekte Balance (Dividenden, Splits)
   xStocks nutzen Token-2022 mit Scaled UI Amount Extension.
   FALLE: Das Feld `multiplier` im Mint-Account ist der ALTE Wert.
   Der aktuell gültige Wert hängt von `newMultiplierEffectiveTimestamp`
   ab. Schreib GENAU EINE Funktion `getCorrectBalance()`, die das
   korrekt auflöst, und ruf sie überall auf — nie manuell
   `amount / 10^decimals` rechnen. Nutze wo möglich direkt
   `getTokenAccountBalance` (liefert `uiAmount` bereits korrekt) statt
   selbst zu rechnen.
   Referenz: GET https://api.xstocks.fi/api/v2/public/assets/{SYMBOL}/multiplier?network=solana

3. Kandidaten-Wallets finden
   Für die 20-25 grössten xStocks per Marktkapitalisierung:
   `getTokenLargestAccounts(mint)` über Helius RPC.
   Daraus die Owner-Adressen auflösen (Token-Account -> Owner).
   Ergebnis: 400-500 Kandidaten.

4. Kandidaten filtern (WICHTIGSTER SCHRITT, grösstes Risiko)
   Die meisten Kandidaten sind KEINE echten Nutzer, sondern:
   - Raydium-/Orca-Liquiditätspools
   - Jupiter-Routing-Konten
   - CEX-Hot-Wallets (Binance, Coinbase, etc.)
   - Die Issuer-Treasury von Backed Finance
   Filter:
   a) Owner-Programm prüfen — ist die Adresse ein PDA (Program
      Derived Address) eines bekannten AMM/DEX-Programms, raus damit.
   b) Eine Sperrliste bekannter Pool-/Börsen-Adressen führen und
      abgleichen (fang mit den grössten Raydium/Orca xStocks-Pools an).
   c) Nach dem Filter: melde mir die Zahl (Kandidaten vorher/nachher).
   ABBRUCHPUNKT: Wenn am Ende von Tag 1 keine saubere Liste steht,
   sag es mir explizit. Wir kuratieren dann 8-12 Adressen von Hand.

5. Portfolios pro Wallet
   Für jede überlebende Wallet: `getTokenAccountsByOwner`, gefiltert
   auf die bekannten xStocks-Mints. In Supabase-Tabelle `holdings`
   cachen, mit Timestamp.

6. Preise & Portfoliowert
   Jupiter Price API für aktuelle Preise je Mint.
   Portfoliowert je Wallet = Summe(Menge x Preis), gecacht.

7. Handelshistorie je Wallet (für die Detail-Ansicht)
   `getSignaturesForAddress` auf die Wallet, gefiltert auf Swaps mit
   xStocks-Mints.

8. Kauf ausführen (Nachbauen-Funktion)
   Jupiter Ultra API:
   - POST /ultra/v1/order — Order zusammenstellen
   - POST /ultra/v1/execute — nach Nutzer-Signatur ausführen
   Bei "mit X Dollar nachbauen": Zielaufteilung nach Portfoliogewicht
   berechnen, für jede Position eine Order erstellen, alle Orders vor
   dem Senden dem Nutzer als Liste zeigen (Symbol, Betrag, geschätzter
   Preis), erst nach Bestätigung ausführen.

=== SEITENSTRUKTUR ===

1. `/` — Rangliste
   Tabelle/Liste: Rang, Wallet (gekürzt), Depotwert, grösste Position,
   24h-Veränderung. Lädt ohne Wallet-Connect. Klick auf Zeile -> Detail.

2. `/wallet/[address]` — Detail
   Volle Aufteilung (Balkendiagramm oder Liste mit Prozent), letzte
   Trades, Link zu Solscan (`https://solscan.io/account/{address}`),
   Knopf "Mit meinem Betrag nachbauen".

3. Nachbauen-Flow (Modal oder eigene Seite)
   Betrag eingeben -> Aufteilung berechnen -> Liste der geplanten Käufe
   zeigen -> Wallet verbinden (wallet-adapter) -> unterschreiben ->
   Jupiter Ultra ausführen -> Erfolgsmeldung mit Transaktions-Link.

=== ARBEITSWEISE ===
- Bevor du etwas ausführst: schreib mir in Stichpunkten, welche
  Dateien du anlegst/änderst.
- Commits klein und beschreibend halten. Neue Dateien einzeln mit
  `git add <datei>` benennen, dann committen mit einer Nachrichtendatei
  vor dem doppelten Bindestrich: `git commit -F <msgdatei> -- <dateien>`.
  Danach `git show --stat HEAD` zur Kontrolle.
- Baue in dieser Reihenfolge: Datenschicht (Tag 1) -> UI mit echten
  Daten (Tag 2) -> Nachbauen-Funktion (Tag 3) -> Politur/Deploy (Tag 4).
  Kein UI, bevor die Datenschicht steht.
- Wenn eine API anders antwortet als erwartet oder ein Schritt nicht
  in der geplanten Zeit fertig wird: sofort melden, nicht stillschweigend
  eine vereinfachte Version bauen.

=== ABBRUCHPUNKTE (explizit, nicht optional) ===
- Tag 1 Abend: keine saubere Wallet-Liste -> 8-12 Adressen kuratieren.
- Tag 3 Mittag: kein Guthaben für eine echte Transaktion -> Kauf-Flow
  bis zur Transaktion bauen, dann `simulateTransaction` statt Senden.
- Tag 4 Mittag: wenn Nachbauen-Funktion nicht stabil läuft -> Rangliste
  und Detail-Ansicht poliert ausliefern, Nachbauen als "Vorschau"
  kennzeichnen statt sie kaputt zu zeigen.

=== WAS DIE DEMO ZEIGEN MUSS ===
- Rangliste mit echten, auf Solscan verifizierbaren Adressen.
- Eine konkrete Wallet mit plausibler, nachvollziehbarer Aufteilung.
- Den Nachbauen-Flow bis mindestens zur unterschriebenen Transaktion.
- Kein Wort wie "Rendite", "Copy-Trading" oder Anlageberatung im
  Interface-Text — stattdessen "öffentliche On-Chain-Daten" und
  "du entscheidest".

Starte mit Schritt 1 der Datenschicht (Asset-Liste) und melde dich,
wenn sie steht.
```

---

## Nach Tag 1 — Folgeprompt für Tag 2 (UI)

Sobald die Datenschicht steht, sag mir Bescheid — ich schreibe dir dann den Tag-2-Prompt für die mobile-first Oberfläche, abgestimmt auf das, was Tag 1 tatsächlich geliefert hat (Anzahl echter Wallets, Datenstruktur).

## Was du selbst tun musst, das kein Prompt ersetzt

- USDC-Frage klären (für Tag 3 nötig)
- Wallet-Adapter im Browser testen (Phantom installiert?)
- Vercel-Account mit dem GitHub-Repo verbinden (Tag 4)
- Video aufnehmen (Bildschirmaufnahme der echten App, kein Animationsfilm)
