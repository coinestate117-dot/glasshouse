"use client";

/**
 * Hintergrund des Hero-Bereichs.
 *
 * Ansatz: scharfe Strukturen statt weicher Farbwolken. Verwaschene Flächen
 * bei niedriger Deckkraft ergeben unter dunklen Ebenen nur Nebel — also
 * arbeitet dieser Hintergrund mit klar gezeichneter Geometrie.
 *
 * Alles läuft über transform/opacity (GPU), kein Canvas, kein JS pro Frame.
 * Bei prefers-reduced-motion steht jede Bewegung still.
 *
 * Von hinten nach vorn:
 *   1. Farbakzente oben links/rechts
 *   2. Gitterboden in Perspektive, läuft auf den Betrachter zu
 *   3. Horizontlinie samt Glühen darüber
 *   4. Lichtstrahlen
 *   5. Schmaler Schleier hinter der Schrift
 */
export function HeroBackground() {
  return (
    <div className="hero-bg" aria-hidden="true">
      <span className="hero-accent hero-accent-green" />
      <span className="hero-accent hero-accent-violet" />

      <div className="hero-floor" />

      <div className="hero-horizon-glow" />
      <div className="hero-horizon-line" />

      <div className="hero-beams">
        <span className="hero-beam hero-beam-1" />
        <span className="hero-beam hero-beam-2" />
        <span className="hero-beam hero-beam-3" />
      </div>

      <div className="hero-bg-scrim" />
    </div>
  );
}
