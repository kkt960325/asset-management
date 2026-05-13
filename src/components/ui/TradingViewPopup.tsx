"use client";

import { useEffect, useRef, useState, useMemo, memo } from "react";
import type { AssetCategory } from "@/lib/types";
import { MANUAL_CATEGORIES } from "@/lib/types";
import YahooChart from "./YahooChart";

/* ── KRX 6자리 코드 감지 ──────────────────────────────────────────────── */
// 첫 자리 숫자 + 이후 5자리 영숫자, 총 6글자 → 국내 주식·ETF·채권 코드
// 카테고리와 무관하게 네이버 차트로 라우팅해야 함
function isKrxCode(ticker: string): boolean {
  return /^[0-9][0-9A-Za-z]{5}$/.test(ticker);
}

/* ── Ticker → TradingView symbol mapping ─────────────────────────────── */

export function toTradingViewSymbol(
  ticker: string,
  category: AssetCategory
): string | null {
  if (MANUAL_CATEGORIES.has(category)) return null;
  // KRX 6자리 코드는 카테고리 무관하게 TradingView 미지원 → 네이버 사용
  if (isKrxCode(ticker)) return null;
  // 한국 주식/ETF 카테고리도 미지원
  if (category === "한국주식" || category === "국내ETF") return null;

  switch (category) {
    case "미국주식":
    case "해외ETF":
      return ticker.replace(/\.(KS|KQ)$/i, "");
    case "해외주식":
      return ticker;
    case "채권":
      return ticker;
    case "Crypto": {
      const cleaned = ticker.replace(/-USD$/i, "");
      return `BINANCE:${cleaned}USDT`;
    }
    case "KRX금현물":
      return null; // 네이버 차트 사용
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

/** 한국 자산인지 확인 — 카테고리뿐 아니라 KRX 6자리 코드도 감지 */
export function isKoreanAsset(category: AssetCategory, ticker?: string): boolean {
  if (category === "한국주식" || category === "국내ETF" || category === "KRX금현물") return true;
  // 카테고리가 채권·해외ETF 등이어도 티커가 KRX 코드면 국내 자산
  if (ticker && isKrxCode(ticker)) return true;
  return false;
}

/** Yahoo Finance 차트 조회용 티커 변환 */
export function toYahooTicker(ticker: string, category: AssetCategory): string | null {
  if (MANUAL_CATEGORIES.has(category)) return null;
  if (isKoreanAsset(category, ticker)) return null; // 네이버 차트 사용
  switch (category) {
    case "Crypto": {
      const base = ticker.replace(/-USD$/i, "");
      return `${base}-USD`;
    }
    case "금/원자재": {
      const t = ticker.toUpperCase();
      if (t.includes("GC") || t.includes("GOLD") || t === "금 99.99_1KG") return "GC=F";
      if (t.includes("SI") || t.includes("SILVER")) return "SI=F";
      if (t.includes("CL") || t.includes("OIL")) return "CL=F";
      return ticker;
    }
    default:
      return ticker.replace(/\.(KS|KQ)$/i, "");
  }
}

/** 차트 표시 가능 여부 (TradingView, 네이버, 또는 Yahoo 차트) */
export function hasChartSupport(ticker: string, category: AssetCategory): boolean {
  if (MANUAL_CATEGORIES.has(category)) return false;
  return true; // 모든 시장 자산은 최소한 Yahoo 차트로 표시 가능
}

/* ── 네이버 차트 기간 타입 ────────────────────────────────────────────── */
const NAVER_PERIODS = [
  { label: "당일", key: "day" },
  { label: "3개월", key: "month3" },
  { label: "1년", key: "year" },
  { label: "3년", key: "year3" },
] as const;

type NaverPeriod = (typeof NAVER_PERIODS)[number]["key"];

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
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [naverPeriod, setNaverPeriod] = useState<NaverPeriod>("month3");

  const tvSymbol = toTradingViewSymbol(ticker, category);
  const yahooTicker = toYahooTicker(ticker, category);
  const isKR = isKoreanAsset(category, ticker);
  const useYahooFallback = !isKR && !tvSymbol && !!yahooTicker;

  /* 한국 주식 네이버 차트 ticker 정리 */
  const krTicker = useMemo(() => {
    if (!isKR) return "";
    return ticker.replace(/\.(KS|KQ|KN)$/i, "");
  }, [ticker, isKR]);

  /* Position */
  const pos = useMemo(() => {
    if (typeof window === "undefined")
      return { left: anchorRect.right + 14, top: anchorRect.top };

    const gap = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = anchorRect.right + gap;
    let top = anchorRect.top - POPUP_H / 3;

    if (left + POPUP_W > vw - gap) left = anchorRect.left - POPUP_W - gap;
    if (left < gap) left = Math.max(gap, (vw - POPUP_W) / 2);
    if (top + POPUP_H > vh - gap) top = vh - POPUP_H - gap;
    if (top < gap) top = gap;

    return { left, top };
  }, [anchorRect]);

  /* TradingView widget (해외 자산용 — Yahoo 폴백이 아닌 경우만) */
  useEffect(() => {
    if (isKR || useYahooFallback) return; // 한국 자산은 네이버, Yahoo 폴백 자산은 YahooChart 사용
    const container = chartContainerRef.current;
    if (!container || !tvSymbol) return;

    container.innerHTML = "";
    setLoading(true);

    const widgetWrap = document.createElement("div");
    widgetWrap.className = "tradingview-widget-container";
    widgetWrap.style.cssText = "width:100%;height:100%;";

    const widgetEl = document.createElement("div");
    widgetEl.className = "tradingview-widget-container__widget";
    widgetEl.style.cssText = "width:100%;height:100%;";
    widgetWrap.appendChild(widgetEl);

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
      backgroundColor: "rgba(10, 22, 40, 1)",
      gridColor: "rgba(0, 212, 255, 0.06)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    widgetWrap.appendChild(script);
    container.appendChild(widgetWrap);

    const t = setTimeout(() => setLoading(false), 2000);
    return () => {
      clearTimeout(t);
      container.innerHTML = "";
    };
  }, [tvSymbol, isKR, useYahooFallback]);

  if (!tvSymbol && !isKR && !useYahooFallback) return null;

  const chartH = POPUP_H - 42;

  /* 네이버 차트 이미지 URL */
  const naverChartUrl = isKR
    ? `https://ssl.pstatic.net/imgfinance/chart/item/area/${naverPeriod}/${krTicker}.png?_t=${Date.now()}`
    : "";

  /* 외부 링크 */
  const externalUrl = isKR
    ? `https://finance.naver.com/item/fchart.naver?code=${krTicker}`
    : useYahooFallback
    ? `https://finance.yahoo.com/quote/${encodeURIComponent(yahooTicker ?? ticker)}/`
    : `https://www.tradingview.com/symbols/${(tvSymbol ?? "").replace(":", "-")}/`;

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left: pos.left, top: pos.top, width: POPUP_W, height: POPUP_H }}
    >
      {/* Outer glow */}
      <div
        className="absolute -inset-1 pointer-events-none"
        style={{
          boxShadow: "0 0 80px rgba(0,212,255,0.08), 0 0 40px rgba(0,4,16,0.9)",
        }}
      />

      {/* Main panel */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          background: "rgba(10,22,40,0.99)",
          border: "1px solid rgba(0,212,255,0.35)",
          boxShadow: "0 0 0 1px rgba(0,212,255,0.08), inset 0 0 60px rgba(0,80,160,0.04)",
        }}
      >
        {/* Top glow */}
        <div
          className="absolute top-0 inset-x-0 h-px z-20"
          style={{
            background: "linear-gradient(90deg, transparent 5%, rgba(0,212,255,0.8) 50%, transparent 95%)",
          }}
        />

        {/* Corners */}
        {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((p) => {
          const [v, h] = p.split(" ");
          return (
            <div
              key={p}
              className={`absolute ${p} w-5 h-5 z-20`}
              style={{
                [`border${v === "top-0" ? "Top" : "Bottom"}`]: "2px solid rgba(0,212,255,0.8)",
                [`border${h === "left-0" ? "Left" : "Right"}`]: "2px solid rgba(0,212,255,0.8)",
              }}
            />
          );
        })}

        {/* Header */}
        <div
          className="relative z-20 flex items-center justify-between px-4 py-2"
          style={{ borderBottom: "1px solid rgba(0,212,255,0.2)", background: "rgba(10,22,40,0.95)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse-dot"
              style={{ background: "#00d4ff", boxShadow: "0 0 8px #00d4ff" }}
            />
            <span
              className="font-display text-xs tracking-[0.3em] uppercase font-bold"
              style={{ color: "#00d4ff", textShadow: "0 0 12px rgba(0,212,255,0.5)" }}
            >
              {ticker} — LIVE CHART
            </span>
            <span className="font-sans text-xs truncate" style={{ color: "rgba(216,238,248,0.55)" }}>
              {name}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* 한국 자산: 기간 선택 탭 */}
            {isKR && (
              <div className="pointer-events-auto flex items-center gap-0.5">
                {NAVER_PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => { setNaverPeriod(p.key); setLoading(true); }}
                    className="font-display text-[9px] tracking-wider uppercase px-2 py-0.5 transition-all"
                    style={{
                      color: naverPeriod === p.key ? "#00d4ff" : "rgba(0,212,255,0.4)",
                      background: naverPeriod === p.key ? "rgba(0,212,255,0.12)" : "transparent",
                      border: `1px solid ${naverPeriod === p.key ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.1)"}`,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <span
              className="font-mono text-[8px] tracking-wider uppercase hidden sm:inline"
              style={{ color: "rgba(0,212,255,0.3)" }}
            >
              {isKR ? "네이버증권" : useYahooFallback ? "YAHOO FINANCE" : "TRADINGVIEW"}
            </span>
            <a
              href={externalUrl}
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

        {/* Chart area */}
        <div style={{ width: "100%", height: chartH, position: "relative", overflow: "hidden" }}>
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin"
                  style={{ color: "rgba(0,212,255,0.6)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span
                  className="font-display text-xs tracking-[0.25em] uppercase animate-data-flicker"
                  style={{ color: "rgba(0,212,255,0.6)" }}
                >
                  LOADING CHART
                </span>
              </div>
            </div>
          )}

          {isKR ? (
            /* ── 한국 주식/ETF: 네이버 증권 차트 이미지 ────────────── */
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "#fff" }}
            >
              <img
                src={naverChartUrl}
                alt={`${ticker} chart`}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            </div>
          ) : useYahooFallback ? (
            /* ── Yahoo Finance 차트 (TradingView 미지원 자산) ────── */
            <YahooChart
              ticker={yahooTicker!}
              width={POPUP_W - 2}
              height={chartH}
              onLoaded={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          ) : (
            /* ── 해외 자산: TradingView 위젯 ─────────────────────── */
            <div
              ref={chartContainerRef}
              style={{ width: POPUP_W - 2, height: chartH, position: "absolute", top: 0, left: 0 }}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default TradingViewPopup;
