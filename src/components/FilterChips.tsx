"use client";

interface FilterChipsProps {
  options: string[];
  active: string;
  onChange: (value: string) => void;
}

export default function FilterChips({
  options,
  active,
  onChange,
}: FilterChipsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "0 0 12px",
        overflowX: "auto",
      }}
    >
      {options.map((opt) => {
        const isActive = opt === active;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${isActive ? "var(--green)" : "var(--border)"}`,
              background: isActive ? "rgba(20,241,149,0.1)" : "transparent",
              color: isActive ? "var(--green)" : "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
