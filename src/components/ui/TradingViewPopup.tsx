"use client";

import { useEffect, useRef, useState, memo } from "react";
import type { AssetCategory } from "@/lib/types";
import { MANUAL_CATEGORIES } from "@/lib/types";

/* ── Ticker → TradingView symbol mapping ─────────────────────────────── */

export function toTradingViewSymbol(ticker: string, category: AssetCategory): string | null {
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

const POPUP_W = 720;
const POPUP_H = 480;

const TradingViewPopup = memo(function TradingViewPopup({
  ticker,
  name,
  category,
  anchorRect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const tvSymbol = toTradingViewSymbol(ticker, category);

  /* Position: prefer right of anchor, fall back to left, center vertically */
  const gap = 14;
  let left = anchorRect.right + gap;
  let top = anchorRect.top - POPUP_H / 2 + 20;
  if (typeof window !== "undefined") {
    if (left + POPUP_W > window.innerWidth - gap) left = anchorRect.left - POPUP_W - gap;
    if (left < gap) left = gap;
    if (top + POPUP_H > window.innerHeight - gap) top = window.innerHeight - POPUP_H - gap;
    if (top < gap) top = gap;
  }

  /* Load TradingView Advanced Chart widget */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !tvSymbol) return;

    el.innerHTML = "";
    setLoaded(false);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Asia/Seoul",
      theme: "dark",
      style: "2",
      locale: "ko",
      backgroundColor: "rgba(14, 28, 50, 1)",
      gridColor: "rgba(0, 212, 255, 0.06)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(script);

    const t = setTimeout(() => setLoaded(true), 1500);
    return () => {
      clearTimeout(t);
      el.innerHTML = "";
    };
  }, [tvSymbol]);

  if (!tvSymbol) return null;

  const tvUrl = `https://www.tradingview.com/symbols/${tvSymbol.replace(":", "-")}/`;

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left,
        top,
        width: POPUP_W,
        height: POPUP_H,
        background: "rgba(14,28,50,0.99)",
        border: "1px solid rgba(0,212,255,0.3)",
        boxShadow:
          "0 0 60px rgba(0,4,16,0.9), 0 0 0 1px rgba(0,212,255,0.08), 0 0 30px rgba(0,212,255,0.06)",
        backdropFilter: "blur(16px)",
        animation: "fade-in-up 0.25s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      {/* Top glow */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(0,212,255,0.7), transparent)",
        }}
      />

      {/* Corners */}
      <div className="absolute top-0 left-0 w-4 h-4" style={{ borderTop: "1px solid rgba(0,212,255,0.7)", borderLeft: "1px solid rgba(0,212,255,0.7)" }} />
      <div className="absolute top-0 right-0 w-4 h-4" style={{ borderTop: "1px solid rgba(0,212,255,0.7)", borderRight: "1px solid rgba(0,212,255,0.7)" }} />
      <div className="absolute bottom-0 left-0 w-4 h-4" style={{ borderBottom: "1px solid rgba(0,212,255,0.7)", borderLeft: "1px solid rgba(0,212,255,0.7)" }} />
      <div className="absolute bottom-0 right-0 w-4 h-4" style={{ borderBottom: "1px solid rgba(0,212,255,0.7)", borderRight: "1px solid rgba(0,212,255,0.7)" }} />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(0,212,255,0.18)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse-dot"
            style={{ background: "#00d4ff", boxShadow: "0 0 6px #00d4ff" }}
          />
          <span
            className="font-display text-[11px] tracking-[0.3em] uppercase font-bold"
            style={{ color: "#00d4ff", textShadow: "0 0 10px rgba(0,212,255,0.4)" }}
          >
            {ticker}
          </span>
          <span
            className="font-sans text-[12px] truncate"
            style={{ color: "rgba(216,238,248,0.6)" }}
          >
            {name}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className="font-mono text-[9px] tracking-wider uppercase"
            style={{ color: "rgba(0,212,255,0.35)" }}
          >
            POWERED BY TRADINGVIEW
          </span>
          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto font-display text-[9px] tracking-[0.2em] uppercase px-2 py-1 transition-all"
            style={{
              color: "rgba(0,212,255,0.6)",
              border: "1px solid rgba(0,212,255,0.2)",
              background: "rgba(0,212,255,0.04)",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = "#00d4ff";
              (e.target as HTMLElement).style.background = "rgba(0,212,255,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = "rgba(0,212,255,0.6)";
              (e.target as HTMLElement).style.background = "rgba(0,212,255,0.04)";
            }}
          >
            OPEN →
          </a>
        </div>
      </div>

      {/* Chart */}
      <div
        style={{
          height: POPUP_H - 44,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Loading state */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
            {/* Scan line animation */}
            <div
              className="absolute inset-x-0 h-px pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)",
                animation: "hud-scan 3s linear infinite",
                top: "-2px",
              }}
            />
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 animate-spin"
                style={{ color: "rgba(0,212,255,0.6)" }}
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span
                className="font-display text-xs tracking-[0.25em] uppercase animate-data-flicker"
                style={{ color: "rgba(0,212,255,0.6)" }}
              >
                INITIALIZING CHART
              </span>
            </div>
            <span
              className="font-mono text-[10px]"
              style={{ color: "rgba(0,212,255,0.3)" }}
            >
              {tvSymbol}
            </span>
          </div>
        )}
        <div
          ref={containerRef}
          className="tradingview-widget-container"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
});

export default TradingViewPopup;
