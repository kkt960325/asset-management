"use client";

import { useState } from "react";
import type { AssetCategory } from "@/lib/types";

const CAT_COLOR: Record<AssetCategory, string> = {
  "미국주식":   "#38bdf8",
  "한국주식":   "#34d399",
  "해외주식":   "#818cf8",
  "국내ETF":    "#2dd4bf",
  "해외ETF":    "#60a5fa",
  "채권":       "#94a3b8",
  "Crypto":     "#fbbf24",
  "KRX금현물":  "#f59e0b",
  "금/원자재":  "#fcd34d",
  "부동산":     "#fb7185",
  "현금/예금":  "#a78bfa",
  "연금/퇴직":  "#fb923c",
  "보험/기타":  "#f472b6",
};

const CAT_ICON: Partial<Record<AssetCategory, React.ReactNode>> = {
  "KRX금현물": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
      <rect x="3" y="8" width="18" height="8" rx="1" strokeLinecap="round"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2"/>
      <path strokeLinecap="round" d="M9 12h6"/>
    </svg>
  ),
  "금/원자재": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  "부동산": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  "현금/예금": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path strokeLinecap="round" d="M2 10h20"/>
    </svg>
  ),
  "연금/퇴직": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  "보험/기타": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
      <circle cx="12" cy="12" r="10"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3"/>
    </svg>
  ),
  "채권": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
};

function getLogoUrl(ticker: string, category: AssetCategory): string | null {
  if (category === "미국주식" || category === "해외주식" || category === "해외ETF") {
    return `https://financialmodelingprep.com/image-stock/${ticker}.png`;
  }
  if (category === "Crypto") {
    const sym = ticker.replace(/-USD$/i, "").toLowerCase();
    return `https://assets.coincap.io/assets/icons/${sym}@2x.png`;
  }
  return null;
}

interface AssetIconProps {
  ticker: string;
  category: AssetCategory;
  size?: number;
}

export function AssetIcon({ ticker, category, size = 28 }: AssetIconProps) {
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const logoUrl = getLogoUrl(ticker, category);
  const color = CAT_COLOR[category] ?? "#a1a1aa";
  const fallbackIcon = CAT_ICON[category];
  const initial = ticker.replace(/[^A-Za-z0-9]/g, "").charAt(0).toUpperCase() || "?";

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={ticker}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="rounded-full object-contain flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: "#27272a",
          // 50% grayscale by default; full color on hover
          filter: hovered ? "grayscale(0)" : "grayscale(0.5) brightness(0.85)",
          transition: "filter 0.25s ease",
        }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `${color}18`,
        border: `1px solid ${color}35`,
        color,
      }}
    >
      {fallbackIcon ?? (
        <span className="font-mono font-bold text-[10px] leading-none">{initial}</span>
      )}
    </div>
  );
}
