import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        padding: "80px 16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 48, fontWeight: 700, marginBottom: 8 }}>
        404
      </div>
      <div
        style={{
          fontSize: 15,
          color: "var(--text-secondary)",
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        This page doesn&rsquo;t exist, or the wallet isn&rsquo;t tracked yet.
      </div>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "12px 24px",
          borderRadius: "var(--radius)",
          background: "var(--green)",
          color: "#000",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "inherit",
        }}
      >
        Back to Leaderboard
      </Link>
    </div>
  );
}
