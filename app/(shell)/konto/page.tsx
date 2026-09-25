import { KontoClient } from "./KontoClient";

export const metadata = {
  title: "Konto & Einstellungen — Glasshouse",
  description: "Deine Kontodaten, Anmeldegeräte und Einstellungen.",
};

export default function KontoPage() {
  return <KontoClient />;
}
