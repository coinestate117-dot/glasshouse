# Glasshouse
**Stocklana Hackathon Submission**
- Live-Vergleich von On-Chain-Preis (Jupiter) gegen Pyth-Referenzmarkt

## Fuer Teamkollegen: lokal starten

```bash
npm install
cp .env.local.example .env.local   # kann leer bleiben
npm run dev                        # laeuft auf http://localhost:3002
```

Die App laeuft **ohne jeden API-Schluessel**. Sie weicht dann auf den
oeffentlichen Solana-Knoten aus; Kurse, Charts, Depotansicht und der
Nachbauen-Ablauf funktionieren vollstaendig mit echten Mainnet-Daten.

Nur die **Rangliste** braucht einen eigenen RPC-Zugang: Sie muss alle Halter
eines Tokens auflisten (`getTokenLargestAccounts`), was der oeffentliche
Knoten mit HTTP 429 sperrt. Ein kostenloses Kontingent auf helius.dev reicht;
den Schluessel als `HELIUS_API_KEY` in `.env.local` eintragen.

Ohne Schluessel laesst sich der komplette Ablauf ueber **Demo ansehen** auf
`/login` vorfuehren. Dort sind Depots, Wallets und Ranglisten erfunden;
Kurse und Maerkte bleiben echt, und es wird nie eine Transaktion gebaut,
signiert oder gesendet.

Der Port ist bewusst **3002** (siehe `.claude/launch.json`) — auf 3000 laeuft
ein anderes Projekt.


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
