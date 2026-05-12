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
  onClose: () => void;
}

const POPUP_W = 420;
const POPUP_H = 280;

const TradingViewPopup = memo(function TradingViewPopup({
  ticker,
  name,
  category,
  anchorRect,
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const tvSymbol = toTradingViewSymbol(ticker, category);

  /* Position: prefer right of anchor, fall back to left */
  const gap = 10;
  let left = anchorRect.right + gap;
  let top = anchorRect.top;
  if (typeof window !== "undefined") {
    if (left + POPUP_W > window.innerWidth - gap) left = anchorRect.left - POPUP_W - gap;
    if (left < gap) left = gap;
    if (top + POPUP_H > window.innerHeight - gap) top = window.innerHeight - POPUP_H - gap;
    if (top < gap) top = gap;
  }

  /* Load TradingView widget */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !tvSymbol) return;

    el.innerHTML = "";
    setLoaded(false);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: "100%",
      height: "100%",
      locale: "ko",
      dateRange: "3M",
      colorTheme: "dark",
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
      noTimeScale: false,
    });
    el.appendChild(script);

    const t = setTimeout(() => setLoaded(true), 1200);
    return () => {
      clearTimeout(t);
      el.innerHTML = "";
    };
  }, [tvSymbol]);

  if (!tvSymbol) return null;

  const tvUrl = `https://www.tradingview.com/symbols/${tvSymbol.replace(":", "-")}/`;

  return (
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{
        left,
        top,
        width: POPUP_W,
        background: "rgba(14,28,50,0.98)",
        border: "1px solid rgba(0,212,255,0.25)",
        boxShadow:
          "0 0 50px rgba(0,4,16,0.85), 0 0 0 1px rgba(0,212,255,0.06), 0 0 20px rgba(0,212,255,0.05)",
        backdropFilter: "blur(14px)",
      }}
      onMouseLeave={onClose}
    >
      {/* Top glow */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)",
        }}
      />

      {/* Corners */}
      {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map(
        (pos) => {
          const [v, h] = pos.split(" ");
          return (
            <div
              key={pos}
              className={`absolute ${pos} w-3 h-3`}
              style={{
                [`border${v === "top-0" ? "Top" : "Bottom"}`]:
                  "1px solid rgba(0,212,255,0.6)",
                [`border${h === "left-0" ? "Left" : "Right"}`]:
                  "1px solid rgba(0,212,255,0.6)",
              }}
            />
          );
        }
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid rgba(0,212,255,0.15)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-dot"
            style={{ background: "#00d4ff", boxShadow: "0 0 4px #00d4ff" }}
          />
          <span
            className="font-display text-[9px] tracking-[0.3em] uppercase truncate"
            style={{ color: "rgba(0,212,255,0.65)" }}
          >
            {ticker} LIVE
          </span>
          <span
            className="font-sans text-[10px] truncate"
            style={{ color: "rgba(216,238,248,0.5)" }}
          >
            {name}
          </span>
        </div>
        <a
          href={tvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[8px] tracking-wider uppercase flex-shrink-0 transition-colors"
          style={{ color: "rgba(0,212,255,0.4)" }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.color = "#00d4ff";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.color = "rgba(0,212,255,0.4)";
          }}
        >
          TRADINGVIEW →
        </a>
      </div>

      {/* Chart */}
      <div
        style={{
          height: POPUP_H - 40,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Loading spinner */}
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                style={{ color: "rgba(0,212,255,0.5)" }}
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
                className="font-mono text-[10px] animate-data-flicker"
                style={{ color: "rgba(0,212,255,0.5)" }}
              >
                LOADING CHART…
              </span>
            </div>
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
});

export default TradingViewPopup;
