import { DashboardClient } from "./DashboardClient";

export const metadata = {
  title: "Dein Depot — Glasshouse",
  description: "Deine eigenen xStocks-Positionen auf Solana. Öffentliche On-Chain-Daten, du entscheidest.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
