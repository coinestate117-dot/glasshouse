import { Suspense } from "react";
import { LoginClient } from "./LoginClient";

export const metadata = {
  title: "Anmelden — Glasshouse",
  description: "Melde dich mit deiner Solana-Wallet an.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
