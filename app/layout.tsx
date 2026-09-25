import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Glasshouse — Öffentliche xStocks-Rangliste auf Solana",
  description:
    "Öffentliche On-Chain-Daten zu tokenisierten US-Aktien (xStocks) auf Solana. Jedes Depot ist einsehbar — transparent und nachvollziehbar. Du entscheidest.",
  manifest: "/manifest.json",
  keywords: ["Solana", "xStocks", "tokenisierte Aktien", "on-chain", "Rangliste", "DeFi", "Backed Finance"],
  openGraph: {
    title: "Glasshouse",
    description: "Öffentliche xStocks-Rangliste auf Solana",
    type: "website",
    images: ["/api/og"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function() {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
