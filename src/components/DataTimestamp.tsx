export default function DataTimestamp() {
  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      style={{
        fontSize: 11,
        color: "var(--text-secondary)",
        padding: "12px 0",
      }}
    >
      Data from {date}, 06:00 UTC · updated daily
    </div>
  );
}
