"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Trophy, Search, Activity } from "lucide-react";

const tabs = [
  { label: "Leaderboard", path: "/", Icon: Trophy },
  { label: "Activity", path: "/activity", Icon: Activity },
  { label: "Search", path: "/search", Icon: Search },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="mobile-tab-bar"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: "var(--card)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => {
        const active =
          tab.path === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.path);
        const color = active ? "var(--green)" : "var(--text-secondary)";
        return (
          <Link
            key={tab.path}
            href={tab.path}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 500,
              color,
            }}
          >
            <tab.Icon size={20} strokeWidth={1.8} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
