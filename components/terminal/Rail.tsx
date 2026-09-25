"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Feste Bereichsleiste links.
 *
 * Liegt bewusst im Shell-Layout und nicht im Terminal: sonst verschwindet
 * sie, sobald man das Depot verlässt, und es führt kein sichtbarer Weg
 * zurück. "Traden" ist immer der Rückweg ins Depot.
 */
const ITEMS = [
  { href: "/dashboard", label: "Traden", icon: "↗" },
  { href: "/app", label: "Rangliste", icon: "▤" },
  { href: "/markets", label: "Märkte", icon: "◈" },
  { href: "/search", label: "Suche", icon: "⌕" },
  { href: "/konto", label: "Konto", icon: "◎" },
];

export function Rail() {
  const path = usePathname();

  return (
    <nav className="tm-rail" aria-label="Bereiche">
      {ITEMS.map((r) => {
        const active = r.href === "/dashboard" ? path === r.href : path.startsWith(r.href);
        return (
          <Link
            key={r.href}
            href={r.href}
            className={`tm-rail-item ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="tm-rail-icon" aria-hidden="true">{r.icon}</span>
            <span className="tm-rail-label">{r.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
