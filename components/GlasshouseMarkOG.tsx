export function glasshouseMarkOG(size: number) {
  const frame = size * (2 / 32);
  const gap = size * (1.5 / 32);
  const paneRadius = size * (2 / 32);
  const outerRadius = size * (4 / 32);
  const half = size / 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: outerRadius,
        border: `${frame}px solid rgba(255,255,255,0.5)`,
        display: "flex",
        flexWrap: "wrap",
        overflow: "hidden",
      }}
    >
      <div style={{ width: half - frame, height: half - frame, borderRight: `${gap}px solid rgba(255,255,255,0.35)`, borderBottom: `${gap}px solid rgba(255,255,255,0.35)` }} />
      <div
        style={{
          width: half - frame,
          height: half - frame,
          borderBottom: `${gap}px solid rgba(255,255,255,0.35)`,
          background: "linear-gradient(135deg, #14F195, #9945FF)",
          borderTopRightRadius: paneRadius,
        }}
      />
      <div style={{ width: half - frame, height: half - frame, borderRight: `${gap}px solid rgba(255,255,255,0.35)` }} />
      <div style={{ width: half - frame, height: half - frame }} />
    </div>
  );
}
