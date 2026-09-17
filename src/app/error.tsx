"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        padding: "80px 16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Something went wrong
      </div>
      <div
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        The page couldn&rsquo;t load. This might be a temporary issue.
      </div>
      <button
        onClick={reset}
        style={{
          padding: "12px 24px",
          borderRadius: "var(--radius)",
          border: "none",
          background: "var(--green)",
          color: "#000",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
