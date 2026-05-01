import { ReactNode, CSSProperties } from "react";

interface HudPanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  scan?: boolean;
  accentRgb?: string;
}

export function HudPanel({
  children,
  className = "",
  style,
  scan = false,
  accentRgb = "0,212,255",
}: HudPanelProps) {
  const a = accentRgb;
  return (
    <div
      className={`hud-panel ${className}`}
      style={{
        border: `1px solid rgba(${a},0.12)`,
        ...style,
      }}
    >
      {/* Top glow line */}
      <div
        className="absolute top-0 inset-x-0 h-px pointer-events-none z-10"
        style={{ background: `linear-gradient(90deg, transparent, rgba(${a},0.55), transparent)` }}
      />

      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 z-10" style={{ borderTop: `1px solid rgba(${a},0.55)`, borderLeft: `1px solid rgba(${a},0.55)` }} />
      <div className="absolute top-0 right-0 w-3 h-3 z-10" style={{ borderTop: `1px solid rgba(${a},0.55)`, borderRight: `1px solid rgba(${a},0.55)` }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 z-10" style={{ borderBottom: `1px solid rgba(${a},0.55)`, borderLeft: `1px solid rgba(${a},0.55)` }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 z-10" style={{ borderBottom: `1px solid rgba(${a},0.55)`, borderRight: `1px solid rgba(${a},0.55)` }} />

      {/* Optional scan line */}
      {scan && (
        <div
          className="absolute inset-x-0 h-px pointer-events-none z-10"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(${a},0.4), transparent)`,
            animation: "hud-scan 5s linear infinite",
            top: "-2px",
          }}
        />
      )}

      {children}
    </div>
  );
}
