"use client";

import React, { useMemo } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { AuthProvider } from "@/components/AuthProvider";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

/** Öffentlicher Mainnet-Knoten. Langsamer und rate-limited, aber er
 *  funktioniert ohne Zugangsdaten — besser als eine tote Verbindung. */
const PUBLIC_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

/**
 * RPC-Endpunkt bestimmen.
 *
 * Wichtig: Früher wurde hier bedingungslos der Helius-Key eingesetzt. Fehlte
 * er, entstand die URL "...?api-key=undefined", die mit 401 antwortet — jeder
 * RPC-Aufruf lief ins Leere. Ohne Key wird jetzt der öffentliche Knoten
 * verwendet, damit Wallet-Verbindung und Kontoabfragen trotzdem gehen.
 */
function resolveEndpoint(): string {
  const explicit = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  if (explicit && !explicit.includes("undefined")) return explicit;

  const key = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (key) return `https://mainnet.helius-rpc.com/?api-key=${key}`;

  return PUBLIC_MAINNET_RPC;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(resolveEndpoint, []);

  // Leeres Array: Phantom und Solflare melden sich selbst über den
  // Wallet-Standard an. Die Adapter zusätzlich einzutragen führt sonst
  // dazu, dass dieselbe Wallet doppelt in der Auswahl steht.
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* autoConnect: einmal erlaubt, verbindet sich die Wallet beim
          nächsten Besuch still wieder — ohne erneute Bestätigung. */}
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AuthProvider>{children}</AuthProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
