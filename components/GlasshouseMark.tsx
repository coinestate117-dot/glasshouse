interface GlasshouseMarkProps {
  size?: number;
  variant?: "gradient" | "mono";
  className?: string;
}

export function GlasshouseMark({ size = 32, variant = "gradient", className }: GlasshouseMarkProps) {
  const frameStroke = variant === "gradient" ? "rgba(255,255,255,0.5)" : "currentColor";
  const gridStroke = variant === "gradient" ? "rgba(255,255,255,0.35)" : "currentColor";
  const paneFill = variant === "gradient" ? "url(#glasshouse-grad)" : "currentColor";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {variant === "gradient" && (
        <defs>
          <linearGradient id="glasshouse-grad" x1="16" y1="2" x2="30" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14F195" />
            <stop offset="100%" stopColor="#9945FF" />
          </linearGradient>
        </defs>
      )}
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="4"
        stroke={frameStroke}
        strokeOpacity={variant === "mono" ? 0.5 : 1}
        strokeWidth="2"
      />
      <rect x="17" y="3" width="12" height="12" rx="2" fill={paneFill} fillOpacity={variant === "mono" ? 1 : 1} />
      <path d="M16 2V30" stroke={gridStroke} strokeOpacity={variant === "mono" ? 0.35 : 1} strokeWidth="1.5" />
      <path d="M2 16H30" stroke={gridStroke} strokeOpacity={variant === "mono" ? 0.35 : 1} strokeWidth="1.5" />
    </svg>
  );
}
