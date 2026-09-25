import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { DemoBanner } from "@/components/DemoMode";
import { Rail } from "@/components/terminal/Rail";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Ambient glow — hält die App-Screens visuell an die Landingpage angebunden */}
      <div className="app-ambient" aria-hidden="true">
        <span className="app-ambient-green" />
        <span className="app-ambient-violet" />
      </div>
      <DemoBanner />
      <TopBar />

      {/* Die Bereichsleiste steht auf allen Seiten, damit der Weg zurück ins
          Depot von überall sichtbar ist. Unter 1100px übernimmt das die
          BottomNav. */}
      <div className="shell-body">
        <Rail />
        <main className="shell-main min-h-screen pt-4 pb-20 md:pb-8">{children}</main>
      </div>

      <BottomNav />
    </>
  );
}
