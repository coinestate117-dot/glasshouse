"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "./ConnectButton";

const links = [
  { label: "Leaderboard", path: "/" },
  { label: "Pre-IPO", path: "/pre-ipo" },
  { label: "Search", path: "/search" },
];

export default function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="desktop-nav">
      <div className="desktop-nav-inner">
        <Link href="/" className="desktop-nav-logo">
          Glasshouse
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div className="desktop-nav-links">
            {links.map((link) => {
              const active =
                link.path === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className="desktop-nav-link"
                  data-active={active || undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <ConnectButton />
        </div>
      </div>
      <style jsx>{`
        .desktop-nav {
          display: none;
        }
        @media (min-width: 1024px) {
          .desktop-nav {
            display: block;
            border-bottom: 1px solid var(--border);
            padding: 0 24px;
          }
          .desktop-nav-inner {
            max-width: 960px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 56px;
          }
          .desktop-nav-logo {
            font-size: 18px;
            font-weight: 700;
            color: var(--text);
            letter-spacing: -0.02em;
          }
          .desktop-nav-links {
            display: flex;
            gap: 32px;
          }
          .desktop-nav-link {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-secondary);
            transition: color 0.15s ease;
          }
          .desktop-nav-link:hover {
            color: var(--text);
          }
          .desktop-nav-link[data-active] {
            color: var(--green);
          }
        }
      `}</style>
    </nav>
  );
}
