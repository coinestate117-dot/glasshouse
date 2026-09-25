# Glasshouse — Landingpage Bau-Prompt (Tag 4 / Politur)

Zum Kopieren in Claude Code, im selben Repo, nachdem Datenschicht + Rangliste
+ Nachbauen-Flow laufen. Baut NICHT parallel zum Kern-Feature, sondern danach
— siehe Abbruchpunkt am Ende.

---

## Vor dem Start — einmal prüfen

- [ ] Rangliste (`/`), Wallet-Detail und Nachbauen-Flow laufen bereits mit echten Daten
- [ ] Ihr habt mindestens 3-4 echte, verifizierte Wallets in der Liste (für Screenshots/Mockups in der Landingpage)
- [ ] Framer Motion ist installiert (`npm i framer-motion`) — wird für alle Scroll-Animationen gebraucht

---

## DER PROMPT (alles ab hier kopieren)

```
Wir bauen jetzt die Landingpage für Glasshouse. Das Produkt (Rangliste,
Wallet-Detail, Nachbauen-Flow) läuft bereits mit echten Daten. Diese Seite
ist die neue "/" — sie verkauft die Idee in 15 Sekunden Scroll-Zeit, bevor
der Nutzer ins eigentliche Produkt geht.

=== WICHTIGSTE STRUKTURÄNDERUNG ===
Bisher war "/" die Rangliste. Das ändert sich:
- "/" wird die neue Landingpage (dieser Prompt).
- Die bisherige Rangliste zieht um nach "/app".
- Jeder CTA-Button auf der Landingpage, der "Rangliste ansehen" o.ä. sagt,
  verlinkt auf "/app".
- Bestehende Links/Redirects entsprechend anpassen, nichts doppelt bauen.

=== NICHT VERHANDELBAR (gilt hier genauso wie im Rest der App) ===
- Alle angezeigten Zahlen auf dieser Seite sind ECHT, aus Supabase/eurem
  bestehenden Cache. Keine erfundenen Nutzerzahlen, keine Fake-Testimonials,
  keine "1.2M getrackt" wenn es in Wirklichkeit 40 Wallets sind. FOMO
  entsteht durch echte, live nachziehende Zahlen — nicht durch erfundene.
- Verbotene Wörter im gesamten Copy: "Rendite", "Copy-Trading", "Anlagetipp",
  "garantiert", "sichere Gewinne", irgendetwas, das nach Anlageberatung
  klingt. Erlaubt: "öffentliche On-Chain-Daten", "du entscheidest",
  "transparent", "nachvollziehbar".
- Mobile-first. Baue jede Sektion zuerst für 375px Breite, danach Desktop.
- prefers-reduced-motion: alle Scroll-/Eintritts-Animationen müssen bei
  aktiviertem reduced-motion auf einen einfachen Opacity-Fade ohne
  Bewegung/Verzögerung zurückfallen.

=== DESIGN-SYSTEM (identisch zur restlichen App, hier nochmal exakt) ===
Farben:
  Hintergrund:        #000000
  Flächen/Karten:      #0E0E11
  Kartenrand:          rgba(255,255,255,0.08), 1px solid
  Kartenrand (hover):  Verlauf 135deg #14F195 -> #9945FF, 1px (per
                        border-image oder Pseudo-Element, nicht als
                        Vollflächen-Border-Farbe)
  Textfarbe primär:    #FAFAFA
  Textfarbe sekundär:  rgba(250,250,250,0.55)
  Akzent grün:         #14F195
  Akzent violett:      #9945FF
  Verlauf:             immer 135deg, immer diagonal, NIE als
                        Vollflächen-Hintergrund einer ganzen Sektion —
                        nur auf Buttons, Balkenfüllungen, Kartenrändern
                        im Hover, kleinen Glow-Akzenten hinter dem Hero.

Ecken: 2-6px auf ALLEN Elementen. Keine Pillenform, nirgends. Auch Buttons
nicht — max. 6px Radius, eckig-technisch.

Typografie:
  Headlines: eine technische/eckige Sans (z.B. "Space Grotesk" oder
    "Geist Sans" von Vercel) — AUSDRÜCKLICH NICHT Inter, Roboto, Arial.
  Fliesstext: dieselbe Familie, Regular/Medium.
  Zahlen/Beträge/Prozente: IMMER Monospace (z.B. "JetBrains Mono" oder
    "IBM Plex Mono"), rechtsbündig, tabular-nums, damit Spalten/Ticker
    sauber untereinander/nebeneinander stehen.
  Hero-Headline: clamp(2.25rem, 6vw, 4.5rem), font-weight 600,
    letter-spacing -0.02em, line-height 1.05.
  Sektions-Headlines: clamp(1.75rem, 4vw, 2.75rem), gleiche Regeln.
  Body: 16px mobile / 18px desktop, line-height 1.55,
    Textfarbe sekundär für Subheadlines/Fliesstext.

Spacing-Skala (Tailwind-Werte, konsequent verwenden, nichts frei erfinden):
  4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.
  Sektionsabstand vertikal: 96px mobile, 160px desktop.

=== SEITENAUFBAU, SEKTION FÜR SEKTION ===

--- 0. Sticky Nav ---
Höhe 64px, Hintergrund #000000 mit 80% Opacity + backdrop-blur(12px) sobald
gescrollt wurde (vorher transparent). Links: Wortmarke "Glasshouse" (Text,
kein Icon nötig, es sei denn du hast schon ein Icon aus dem Haupt-Build).
Rechts: "So funktioniert's" (Anchor-Link), "Rangliste" (Link zu /app),
Button "Wallet verbinden" (Primär-Button-Styling, siehe unten). Auf Mobile:
nur Wortmarke + ein einzelner Button "App öffnen" -> /app, Rest ausblenden.

--- 1. Hero ---
Volle Viewport-Höhe (min-height: 100svh) auf Desktop, auf Mobile min-height
85svh. Zentriert, Hintergrund reines #000000.

Reihenfolge von oben:
a) Kicker-Zeile klein, Monospace, Akzentgrün, z.B. "LIVE · SOLANA MAINNET"
   mit einem 6px runden Punkt davor, der sanft pulsiert (opacity 0.4 <-> 1,
   2s, ease-in-out, infinite) — das ist der EINZIGE runde Formfaktor auf der
   ganzen Seite, bewusst als "live"-Signal reserviert.
b) Headline (2-3 Zeilen). Schlag mir 2 Textvarianten vor, bevor du sie fix
   einbaust — Richtung: es geht darum, dass jedes Depot auf Solana öffentlich
   einsehbar ist, im Gegensatz zur Bank. Kein Wort aus der Verbotsliste oben.
c) Subheadline, 1-2 Sätze, Textfarbe sekundär, max-width 60ch zentriert.
d) Zwei CTAs nebeneinander (Mobile: untereinander, volle Breite):
   - Primär: gefüllter Verlaufs-Button (135deg grün->violett), schwarzer
     Text, Radius 6px, Padding 14px/28px, Hover: Helligkeit +8%,
     transform: translateY(-1px), transition 150ms ease-out.
   - Sekundär: "ghost" Button, transparenter Hintergrund, 1px Rand
     rgba(255,255,255,0.16), Hover: Rand wird zu rgba(255,255,255,0.32).

e) Darunter, ab ca. 640px Breite aufwärts sichtbar (auf Mobile eine
   vereinfachte Version, siehe unten): die "Live Map" — das Kernstück.

  WICHTIG ZUR MAP: Wallets auf Solana haben keine geografische Position —
  eine echte Weltkarte mit echten Standorten wäre erfundene Geodaten und
  verstösst gegen die Keine-Fake-Daten-Regel. Baue stattdessen eine
  STILISIERTE, rein dekorative Punktraster-Weltkarte (wie man sie von
  Stripe/Vercel-Landingpages kennt: Kontinente als Punktwolke, kein Land
  einzeln beschriftet) als Hintergrund-Textur in Akzentfarbe bei niedriger
  Opacity (12-18%), mit 6-10 Verbindungslinien zwischen zufälligen
  Punktpaaren, die per SVG stroke-dashoffset-Animation "fliessen" (3-5s
  Loop, versetzt gestartet). Das ist reine Atmosphäre, keine Datenaussage.

  Über/auf diese Karte gelegt: 3-4 schwebende "Glass"-Karten (Hintergrund
  #0E0E11 bei 85% Opacity + backdrop-blur(8px), Rand wie oben, Radius 4px,
  Padding 12/16px), die ECHTE Live-Zahlen aus eurem Supabase-Cache zeigen,
  z.B.:
    - "Depotwert getrackt" + Summe aller gecachten Portfolios, Monospace,
      animiert hochzählend beim ersten Sichtbarwerden (siehe Zähler-Logik
      unten)
    - "Wallets beobachtet" + echte Anzahl aus eurer `holdings`-Tabelle
    - "Aktivste Position" + Symbol des Assets mit den meisten Holdings
      gerade jetzt
  Positionierung: absolute, an 3-4 festen Punkten über der Karte verteilt,
  auf Mobile alle drei UNTER dem Text gestapelt statt über einer Karte
  schwebend (die Kartengrafik wird auf Mobile nicht gerendert, nur die
  3 Stat-Karten als einfache vertikale Liste — Performance und Lesbarkeit
  vor Optik auf kleinen Screens).
  Eintritts-Animation der Stat-Karten: gestaffelt, je 80ms Verzögerung,
  von opacity:0 + translateY(12px) zu opacity:1 + translateY(0), 400ms
  ease-out, ausgelöst beim Scrollen in den Viewport (IntersectionObserver
  oder Framer Motions useInView).

  Zähler-Logik (für alle "hochzählenden" Zahlen auf der Seite, nicht nur
  hier): beim ersten Sichtbarwerden von 0 auf den echten Wert hochzählen,
  600-900ms, ease-out, KEIN Loop, läuft nur einmal pro Seitenaufruf. Danach
  steht die Zahl still, bis ein echter Poll (siehe Ticker unten) sie
  aktualisiert.

--- 2. Live-Ticker-Leiste ---
Direkt unter dem Hero, volle Breite, Hintergrund #0E0E11, Höhe 44px,
1px Rand oben/unten rgba(255,255,255,0.08). Horizontale Reihe von 5-7
Kennzahlen, durch ein dünnes vertikales Trennzeichen (1px,
rgba(255,255,255,0.12)) getrennt. Jede Kennzahl: Label klein grau links,
Wert Monospace weiss rechts daneben, plus optional ein winziger Pfeil
(▲ grün / ▼ violett-rot je nach Definitionsfarbe) bei 24h-Veränderung.
Alle Werte sind ein echter GET auf euren bestehenden Cache/eure API,
re-fetch alle 30-60s (kein aggressiveres Polling, RPC-Kosten sparen).
Auf Mobile: horizontal scrollbar (overflow-x: auto, scroll-snap-type: x
mandatory, kein sichtbarer Scrollbar), nicht umbrechen.

--- 3. "So funktioniert's" — Apple-Style Scrollytelling ---
NUR diese eine Sektion bekommt das "Slider nach rechts"-Verhalten, nicht
die ganze Seite (Scroll-Jacking auf einer ganzen Landingpage ist schlechte
UX und ein Zeitfresser). Umsetzung:
  - Container mit fixer Höhe = 300vh (3x Viewport), darin ein
    position: sticky; top: 0-Element, das während des Scrollens durch
    diesen Container stehen bleibt.
  - Innerhalb des sticky Elements: 3 "Slides" nebeneinander in einem Flex-
    Container, die per Framer Motion useScroll + useTransform (scrollYProgress
    des Containers gemappt auf translateX von 0% auf -200%) horizontal
    durchgeschoben werden, während der Nutzer vertikal weiterscrollt.
  - Jede Slide: 40% Breite Text links (Schritt-Nummer gross in
    Akzent-Verlaufsfarbe als Text, Titel, 1-2 Sätze Beschreibung),
    60% Breite rechts ein Screenshot/Mockup der echten UI in einem
    "Fenster"-Rahmen (siehe Fenster-Spezifikation unten) — ECHTE
    Screenshots aus eurem laufenden Produkt, keine Photoshop-Mockups.
  - Die 3 Schritte: 1) "Ansehen" (Rangliste + Wallet-Detail),
    2) "Verstehen" (Aufteilung/Chart in der Detailansicht),
    3) "Nachbauen" (der Kauf-Flow bis zur Bestätigungsliste).
  - Fortschrittsanzeige unten im sticky Element: 3 kleine horizontale
    Striche (nicht Punkte — Radius 2px, 24px breit, 3px hoch), aktiver
    Strich füllt sich mit dem Verlauf, inaktive bleiben
    rgba(255,255,255,0.16).
  - MOBILE-FALLBACK, zwingend: unter 768px KEIN Scroll-Jacking. Stattdessen
    die 3 Schritte einfach vertikal untereinander als normale Sektionen,
    jede mit simplem Fade+Slide-up beim Sichtbarwerden (gleiche Logik wie
    die Stat-Karten oben). Scroll-Jacking auf Touch-Geräten fühlt sich
    kaputt an — nicht erzwingen.

--- 4. Feature-Grid ("Fenster"-Spezifikation, gilt für alle Karten auf der
      ganzen Seite, nicht nur hier) ---
Grid: 1 Spalte Mobile, 2 Spalten Tablet, 3 Spalten Desktop, gap 16px Mobile
/ 24px Desktop. 5-6 Karten, Inhalte z.B.: "Keine Verwahrung", "Echte
Mainnet-Daten", "Kein KYC nötig", "Du unterschreibst selbst", "Solscan-
Verifizierbar", "Live-Preise via Jupiter".

Jede Karte (= "Fenster"):
  - Hintergrund #0E0E11, Rand 1px solid rgba(255,255,255,0.08), Radius 4px.
  - Padding 24px Desktop / 16px Mobile.
  - Kein Schatten im Ruhezustand.
  - Icon oben: 40x40px Container, Radius 4px (NICHT rund), Hintergrund
    rgba(255,255,255,0.04), Icon selbst 20x20px, Strichstärke 1.5px,
    Farbe wechselt zwischen den Karten abwechselnd grün/violett (nie
    beide gleichzeitig in einer Karte).
  - Titel darunter, 18px, font-weight 600, 12px Abstand zum Icon.
  - Beschreibung, 14px, Textfarbe sekundär, 1-2 Zeilen, 8px Abstand zum
    Titel.
  - Hover (Desktop, :hover; Mobile: kein Hover-Effekt, stattdessen nichts
    zusätzliches, da kein Maus-Hover existiert): Rand wechselt zum
    Verlaufsrand (135deg grün->violett, 1px, via linear-gradient
    border-image oder ::before-Pseudoelement mit padding-box/border-box
    Trick), transform: translateY(-2px), transition: all 200ms
    cubic-bezier(0.16, 1, 0.3, 1). Kein Scale, nur Translate — Scale auf
    Karten mit Text wirkt unruhig.

--- 5. Live-Rangliste-Teaser mit Balken ---
Zeigt die echten Top 5 der Rangliste (Live-Query, kein Static-Mock).
Layout: Liste, jede Zeile = Rang-Nummer (Monospace, grau) + gekürzte
Wallet-Adresse (Monospace) + ein horizontaler Balken, der den Depotwert
relativ zum grössten der 5 angezeigten Wallets darstellt + der Betrag
rechtsbündig in Monospace.

BALKEN-SPEZIFIKATION (exakt, gilt für JEDEN Balken auf der ganzen Seite,
auch hier und im Wallet-Detail falls dort noch nicht spezifiziert):
  - Track (Hintergrund des Balkens): rgba(255,255,255,0.06), Höhe 8px
    Mobile / 10px Desktop, Radius 2px (NICHT voll gerundet, auch an den
    Enden eckig-technisch, max. 2px).
  - Füllung: linear-gradient(135deg, #14F195, #9945FF), gleiche Höhe wie
    Track, Radius 2px.
  - Füllstand-Animation: beim Sichtbarwerden von width: 0% auf den echten
    Prozentwert, 700ms, cubic-bezier(0.16, 1, 0.3, 1), einmalig pro
    Seitenaufruf, gestaffelt pro Zeile (Zeile 2 startet 60ms nach Zeile 1,
    usw. — Kaskaden-Effekt von oben nach unten).
  - Zahl neben dem Balken: IMMER Monospace, IMMER rechtsbündig,
    tabular-nums, damit die Kommastellen aller Zeilen exakt
    untereinanderstehen.
  - Zeilenabstand 12px, Trennlinie zwischen Zeilen 1px
    rgba(255,255,255,0.06) (kein Rand um die ganze Liste, nur zwischen
    Zeilen).
Darunter: CTA "Vollständige Rangliste ansehen" -> /app, Sekundär-Button-
Styling.

--- 6. Nachbauen-Flow als horizontaler Slider (Apple-Karussell-Pattern) ---
Zeigt 4 Slides des Nachbauen-Flows als horizontal swipebares Karussell
(nicht scroll-jacked wie Sektion 3 — das ist ein klassisches Karussell mit
Pfeilen + Swipe-Geste, kein automatisches Scroll-Binding):
  1) Betrag eingeben, 2) berechnete Aufteilung, 3) Bestätigungsliste
  (Symbol/Betrag/geschätzter Preis je Position), 4) Erfolgsmeldung mit
  Transaktions-Link.
Jede Slide: ein "Fenster" (siehe Fenster-Spec oben, aber Radius hier 6px
da es ein grösseres Container-Element ist) mit einem UI-Screenshot/Mockup
drin, plus kurzem Fliesstext daneben oder darunter (responsive: Desktop
nebeneinander, Mobile untereinander in der Slide).
Navigation: Pfeil-Buttons links/rechts (40x40px Quadrat, Radius 4px,
Hintergrund rgba(255,255,255,0.04), Hover: rgba(255,255,255,0.08)) +
Fortschritts-Striche unten (gleiche Optik wie in Sektion 3: horizontale
Striche, nicht Punkte). Touch: swipebar via Drag-Gesture (Framer Motion
drag="x" mit dragConstraints), snapped auf die nächste volle Slide.

--- 7. Transparenz/Vertrauen-Sektion ---
Kurzer Textblock (max 3 Sätze) + 3 kleine Inline-Badges nebeneinander:
"Nicht-custodial", "Kein KYC", "Solana Mainnet" — Badges als kleine Pills
NEIN, als eckige Chips: Padding 6px/12px, Radius 4px, Rand 1px
rgba(255,255,255,0.16), Text 13px Monospace uppercase, letter-spacing
0.05em. Darunter ein echter Link zu Solscan für eine der angezeigten
Wallets ("Selbst nachprüfen ->").

--- 8. Schluss-CTA ---
Zentriert, Hintergrund #000000, grosse Headline (gleiche Grösse wie Hero-
Headline oder leicht kleiner), darunter der Primär-Button aus dem Hero
nochmal, plus darunter klein und dezent (Monospace, 12px, Textfarbe
sekundär) die live-hochgezählte Gesamtsumme aus dem Hero als Wiederholung
("Aktuell $X über echte Wallets getrackt · aktualisiert live").

--- 9. Footer ---
Minimal, 2 Zeilen: oben 4-5 Text-Links (Rangliste, GitHub-Repo, Solscan,
X/Twitter falls vorhanden), unten Copyright-Zeile + kleiner Hinweis-Chip
"Gebaut für den Solana Stocklana Hackathon" (gleiches Chip-Styling wie
Sektion 7). Hintergrund #000000, Rand oben 1px rgba(255,255,255,0.08).

=== TECHNISCHE UMSETZUNG ===
- Framer Motion für alle Animationen (useScroll, useTransform, useInView,
  AnimatePresence für das Karussell). Kein GSAP zusätzlich einführen, eine
  Animationsbibliothek reicht.
- Alle "live" Zahlen kommen aus einem einzigen neuen, leichten API-Endpunkt
  (z.B. `/api/stats`), der eure bestehenden Supabase-Tabellen aggregiert
  (COUNT wallets, SUM portfolio value, etc.) — nicht pro Komponente einzeln
  gegen Supabase fragen, ein gecachter Endpunkt für die ganze Seite.
- Bilder/Screenshots als echte PNG/WebP aus eurer laufenden App exportiert,
  nicht als Illustrationen erfunden.
- next/font für die Custom-Fonts einbinden (kein Google-Fonts-Link im
  <head>, next/font/google nutzen falls die gewählten Fonts dort verfügbar
  sind).
- Lighthouse-Mobile-Performance im Blick behalten: Map-Grafik als
  optimiertes SVG, keine schweren Canvas-Partikel-Effekte.

=== ARBEITSWEISE (wie im Hauptprompt) ===
- Bevor du etwas baust: Stichpunkte, welche Dateien du anlegst/änderst.
- Bevor du die Hero-Headline UND die Map-Grafik final umsetzt: 2 Varianten
  vorschlagen, ich entscheide.
- Kleine, beschreibende Commits. Neue Dateien einzeln mit `git add <datei>`,
  dann `git commit -F <msgdatei> -- <dateien>`, danach `git show --stat HEAD`.
- Baue in dieser Reihenfolge: Struktur/Routing-Umzug (/ -> Landingpage,
  Rangliste -> /app) -> statische Sektionen ohne Animation mit echten Daten
  -> Animationen nachrüsten, Sektion für Sektion, mit der Ticker-Leiste und
  den Stat-Karten zuerst (am wichtigsten fürs FOMO-Gefühl) -> Scrollytelling-
  Sektion 3 und Karussell 6 zuletzt (am aufwändigsten, am ehesten verzichtbar).

=== ABBRUCHPUNKT (nicht optional) ===
Diese Landingpage entsteht NACH dem funktionierenden Kernprodukt, als Tag-4-
Politur. Wenn am Tag-4-Mittag die Scrollytelling-Sektion (3) oder das
Karussell (6) nicht sauber laufen: beide durch einfache statische Sektionen
mit Fade-in-Animation ersetzen (wie Sektion 4/7) statt sie ruckelig
auszuliefern. Ticker-Leiste, Stat-Karten und Balken-Animationen haben
Priorität vor den beiden aufwändigen Scroll-Effekten — die liefern den
grössten Teil des FOMO-Effekts für den geringsten Aufwand.

Starte mit dem Routing-Umzug (/ und /app) und melde dich, wenn der steht.
```

---

## Was du selbst noch klären solltest

- Ob ihr wirklich zwei Fonts (Space Grotesk + JetBrains Mono o.ä.) lizenzfrei
  über next/font/google einbinden könnt — beide sind Open-Font-License,
  sollte gehen.
- 3-4 echte Screenshots aus der laufenden App vorbereiten, sobald Rangliste
  und Nachbauen-Flow stehen — die Landingpage braucht die als Bildmaterial,
  nicht als nachträglich erfundene Mockups.
