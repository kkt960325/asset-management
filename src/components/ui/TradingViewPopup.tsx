"use client";

import { useMemo, memo } from "react";
import type { AssetCategory } from "@/lib/types";
import { MANUAL_CATEGORIES } from "@/lib/types";

/* ── Ticker → TradingView symbol mapping ─────────────────────────────── */

export function toTradingViewSymbol(
  ticker: string,
  category: AssetCategory
): string | null {
  if (MANUAL_CATEGORIES.has(category)) return null;

  switch (category) {
    case "미국주식":
    case "해외ETF":
      return ticker.replace(/\.(KS|KQ)$/i, "");
    case "한국주식":
    case "국내ETF": {
      const cleaned = ticker.replace(/\.(KS|KQ|KN)$/i, "");
      return `KRX:${cleaned}`;
    }
    case "해외주식":
      return ticker;
    case "채권":
      return ticker;
    case "Crypto": {
      const cleaned = ticker.replace(/-USD$/i, "");
      return `BINANCE:${cleaned}USDT`;
    }
    case "KRX금현물":
      return "KRX:411060";
    case "금/원자재": {
      const t = ticker.toUpperCase();
      if (t.includes("GC") || t.includes("GOLD")) return "TVC:GOLD";
      if (t.includes("SI") || t.includes("SILVER")) return "TVC:SILVER";
      if (t.includes("CL") || t.includes("OIL")) return "TVC:USOIL";
      return ticker;
    }
    default:
      return null;
  }
}

/* ── Component ───────────────────────────────────────────────────────── */

interface Props {
  ticker: string;
  name: string;
  category: AssetCategory;
  anchorRect: { left: number; top: number; bottom: number; right: number };
}

const POPUP_W = 800;
const POPUP_H = 500;

const TradingViewPopup = memo(function TradingViewPopup({
  ticker,
  name,
  category,
  anchorRect,
}: Props) {
  const tvSymbol = toTradingViewSymbol(ticker, category);

  /* Position: try right of ticker, fall back to centered overlay */
  const pos = useMemo(() => {
    if (typeof window === "undefined")
      return { left: anchorRect.right + 14, top: anchorRect.top };

    const gap = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = anchorRect.right + gap;
    let top = anchorRect.top - POPUP_H / 3;

    // 오른쪽에 공간이 없으면 왼쪽으로
    if (left + POPUP_W > vw - gap) left = anchorRect.left - POPUP_W - gap;
    // 왼쪽에도 없으면 중앙에 오버레이
    if (left < gap) left = Math.max(gap, (vw - POPUP_W) / 2);
    // 세로 경계 보정
    if (top + POPUP_H > vh - gap) top = vh - POPUP_H - gap;
    if (top < gap) top = gap;

    return { left, top };
  }, [anchorRect]);

  if (!tvSymbol) return null;

  /* TradingView embed URL — 풀사이즈 고급 차트 */
  const iframeSrc = `https://s.tradingview.com/widgetembed/?` +
    `frameElementId=tv_chart_popup&` +
    `symbol=${encodeURIComponent(tvSymbol)}&` +
    `interval=D&` +
    `symboledit=0&` +
    `saveimage=0&` +
    `studies=[]&` +
    `theme=dark&` +
    `style=2&` +
    `timezone=Asia%2FSeoul&` +
    `withdateranges=1&` +
    `showpopupbutton=0&` +
    `studies_overrides={}&` +
    `overrides={}&` +
    `enabled_features=[]&` +
    `disabled_features=[]&` +
    `locale=ko&` +
    `utm_source=&` +
    `utm_medium=widget_new&` +
    `utm_campaign=chart`;

  const tvUrl = `https://www.tradingview.com/symbols/${tvSymbol.replace(":", "-")}/`;

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: pos.left,
        top: pos.top,
        width: POPUP_W,
        height: POPUP_H,
      }}
    >
      {/* Outer glow shadow (behind the panel) */}
      <div
        className="absolute -inset-1 pointer-events-none"
        style={{
          boxShadow:
            "0 0 80px rgba(0,212,255,0.08), 0 0 40px rgba(0,4,16,0.9)",
        }}
      />

      {/* Main panel */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          background: "rgba(10,22,40,0.99)",
          border: "1px solid rgba(0,212,255,0.35)",
          boxShadow:
            "0 0 0 1px rgba(0,212,255,0.08), inset 0 0 60px rgba(0,80,160,0.04)",
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 inset-x-0 h-px z-20"
          style={{
            background:
              "linear-gradient(90deg, transparent 5%, rgba(0,212,255,0.8) 50%, transparent 95%)",
          }}
        />

        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 z-20" style={{ borderTop: "2px solid rgba(0,212,255,0.8)", borderLeft: "2px solid rgba(0,212,255,0.8)" }} />
        <div className="absolute top-0 right-0 w-5 h-5 z-20" style={{ borderTop: "2px solid rgba(0,212,255,0.8)", borderRight: "2px solid rgba(0,212,255,0.8)" }} />
        <div className="absolute bottom-0 left-0 w-5 h-5 z-20" style={{ borderBottom: "2px solid rgba(0,212,255,0.8)", borderLeft: "2px solid rgba(0,212,255,0.8)" }} />
        <div className="absolute bottom-0 right-0 w-5 h-5 z-20" style={{ borderBottom: "2px solid rgba(0,212,255,0.8)", borderRight: "2px solid rgba(0,212,255,0.8)" }} />

        {/* Header */}
        <div
          className="relative z-20 flex items-center justify-between px-4 py-2"
          style={{
            borderBottom: "1px solid rgba(0,212,255,0.2)",
            background: "rgba(10,22,40,0.95)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse-dot"
              style={{
                background: "#00d4ff",
                boxShadow: "0 0 8px #00d4ff",
              }}
            />
            <span
              className="font-display text-xs tracking-[0.3em] uppercase font-bold"
              style={{
                color: "#00d4ff",
                textShadow: "0 0 12px rgba(0,212,255,0.5)",
              }}
            >
              {ticker} — LIVE CHART
            </span>
            <span
              className="font-sans text-xs truncate"
              style={{ color: "rgba(216,238,248,0.55)" }}
            >
              {name}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className="font-mono text-[8px] tracking-wider uppercase hidden sm:inline"
              style={{ color: "rgba(0,212,255,0.3)" }}
            >
              TRADINGVIEW
            </span>
            <a
              href={tvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto font-display text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 transition-all"
              style={{
                color: "rgba(0,212,255,0.65)",
                border: "1px solid rgba(0,212,255,0.25)",
                background: "rgba(0,212,255,0.05)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.color = "#00d4ff";
                el.style.background = "rgba(0,212,255,0.12)";
                el.style.borderColor = "rgba(0,212,255,0.5)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.color = "rgba(0,212,255,0.65)";
                el.style.background = "rgba(0,212,255,0.05)";
                el.style.borderColor = "rgba(0,212,255,0.25)";
              }}
            >
              OPEN →
            </a>
          </div>
        </div>

        {/* TradingView iframe — 풀사이즈 차트 */}
        <iframe
          id="tv_chart_popup"
          src={iframeSrc}
          style={{
            width: "100%",
            height: `${POPUP_H - 40}px`,
            border: "none",
            display: "block",
          }}
          sandbox="allow-scripts allow-same-origin allow-popups"
          loading="eager"
          title={`${ticker} TradingView Chart`}
        />
      </div>
    </div>
  );
});

export default TradingViewPopup;
