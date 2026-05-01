"use client";

import { useState } from "react";
import type { AssetCategory } from "@/lib/types";

// 카테고리별 폴백 색상
const CAT_COLOR: Record<AssetCategory, string> = {
  "미국주식": "#38bdf8",
  "Crypto":   "#f59e0b",
  "금현물":   "#fcd34d",
  "ISA-ETF":  "#34d399",
  "주택청약": "#a78bfa",
  "IRP":      "#fb923c",
  "부동산":   "#2dd4bf",
};

// 카테고리별 SVG 아이콘 (폴백용)
const CAT_ICON: Partial<Record<AssetCategory, React.ReactNode>> = {
  "금현물": (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  "부동산": (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  "주택청약": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  "IRP": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
    </svg>
  ),
};

function getLogoUrl(ticker: string, category: AssetCategory): string | null {
  if (category === "미국주식") {
    // Financial Modeling Prep — 공개 스톡 이미지 API
    return `https://financialmodelingprep.com/image-stock/${ticker}.png`;
  }
  if (category === "Crypto") {
    const sym = ticker.replace(/-USD$/i, "").toLowerCase();
    // CoinCap 공개 아이콘 CDN
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
        className="rounded-full object-contain flex-shrink-0"
        style={{ width: size, height: size, background: "#27272a" }}
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
