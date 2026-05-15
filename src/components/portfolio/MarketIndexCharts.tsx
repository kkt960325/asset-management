"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";

/* ── 시장 지수 정의 ─────────────────────────────────────────────────── */
const INDICES = [
  {
    key: "kospi",
    label: "KOSPI",
    sub: "코스피",
    ticker: "^KS11",
    currency: "KRW",
    accent: "0,212,255",        // cyan
    glowColor: "#00d4ff",
  },
  {
    key: "kosdaq",
    label: "KOSDAQ",
    sub: "코스닥",
    ticker: "^KQ11",
    currency: "KRW",
    accent: "34,255,153",       // green
    glowColor: "#22ff99",
  },
  {
    key: "nasdaq",
    label: "NASDAQ",
    sub: "나스닥",
    ticker: "^IXIC",
    currency: "USD",
    accent: "255,119,34",       // orange
    glowColor: "#ff7722",
  },
  {
    key: "btc",
    label: "BITCOIN",
    sub: "비트코인",
    ticker: "BTC-USD",
    currency: "USD",
    accent: "255,187,51",       // amber
    glowColor: "#ffbb33",
  },
] as const;

type Candle = [number, number, number, number, number, number]; // ts, o, h, l, c, v

interface IndexData {
  candles: Candle[];
  currentPrice: number | null;
  loading: boolean;
  error: boolean;
}

/* ── 가격 포맷 ──────────────────────────────────────────────────────── */
function fmtPrice(v: number, currency: string): string {
  if (currency === "KRW") return Math.round(v).toLocaleString("ko-KR");
  if (v >= 10000) return v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPriceCompact(v: number, currency: string): string {
  if (currency === "KRW") {
    return Math.round(v).toLocaleString("ko-KR");
  }
  if (v >= 100000) return (v / 1000).toFixed(1) + "K";
  if (v >= 10000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── 미니 차트 (Canvas) ─────────────────────────────────────────────── */
const MiniChart = memo(function MiniChart({
  candles,
  accent,
  width,
  height,
}: {
  candles: Candle[];
  accent: string;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Data extraction — close prices
    const closes = candles.map((c) => c[4]);
    const minP = Math.min(...closes);
    const maxP = Math.max(...closes);
    const range = maxP - minP || 1;
    const pad = 2;

    const toX = (i: number) => (i / (closes.length - 1)) * width;
    const toY = (v: number) => pad + (1 - (v - minP) / range) * (height - pad * 2);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `rgba(${accent},0.25)`);
    gradient.addColorStop(0.5, `rgba(${accent},0.08)`);
    gradient.addColorStop(1, `rgba(${accent},0.0)`);

    // Draw area fill
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(closes[0]));
    for (let i = 1; i < closes.length; i++) {
      ctx.lineTo(toX(i), toY(closes[i]));
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(closes[0]));
    for (let i = 1; i < closes.length; i++) {
      ctx.lineTo(toX(i), toY(closes[i]));
    }
    ctx.strokeStyle = `rgba(${accent},0.9)`;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Endpoint dot
    const lastX = toX(closes.length - 1);
    const lastY = toY(closes[closes.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${accent},1)`;
    ctx.fill();

    // Endpoint glow
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${accent},0.3)`;
    ctx.fill();
  }, [candles, accent, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
    />
  );
});

/* ── 메인 컴포넌트 ──────────────────────────────────────────────────── */
export default function MarketIndexCharts() {
  const [data, setData] = useState<Record<string, IndexData>>(() => {
    const initial: Record<string, IndexData> = {};
    for (const idx of INDICES) {
      initial[idx.key] = { candles: [], currentPrice: null, loading: true, error: false };
    }
    return initial;
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetchingRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const results = await Promise.allSettled(
      INDICES.map(async (idx) => {
        const res = await fetch(
          `/api/chart?ticker=${encodeURIComponent(idx.ticker)}&range=1mo&interval=1d`
        );
        const json = await res.json();
        return { key: idx.key, data: json };
      })
    );

    setData((prev) => {
      const next = { ...prev };
      for (const result of results) {
        if (result.status === "fulfilled") {
          const { key, data: d } = result.value;
          if (d.candles && d.candles.length > 0) {
            next[key] = {
              candles: d.candles,
              currentPrice: d.currentPrice,
              loading: false,
              error: false,
            };
          } else {
            next[key] = { ...prev[key], loading: false, error: true };
          }
        } else {
          // Find which index failed — mark error
          const idx = INDICES[results.indexOf(result)];
          if (idx) {
            next[idx.key] = { ...prev[idx.key], loading: false, error: true };
          }
        }
      }
      return next;
    });

    setLastUpdated(new Date());
    fetchingRef.current = false;
  }, []);

  // Fetch on mount + auto-refresh every 60s
  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 60_000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  return (
    <div className="animate-fade-in-up">
      {/* Section header */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
            style={{ background: "#00d4ff", boxShadow: "0 0 6px #00d4ff" }}
          />
          <span
            className="font-display text-[9px] tracking-[0.45em] uppercase"
            style={{ color: "rgba(0,212,255,0.6)" }}
          >
            MARKET OVERVIEW
          </span>
        </div>
        <div
          className="h-px flex-1"
          style={{ background: "linear-gradient(90deg, rgba(0,212,255,0.25), transparent)" }}
        />
        {lastUpdated && (
          <span
            className="font-mono text-[9px] tracking-widest"
            style={{ color: "rgba(0,212,255,0.3)" }}
          >
            {lastUpdated.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* 4 cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {INDICES.map((idx) => {
          const d = data[idx.key];
          const candles = d?.candles ?? [];
          const price = d?.currentPrice;
          const isLoading = d?.loading ?? true;
          const isError = d?.error ?? false;

          // Change calculation
          let changePercent = 0;
          let changeAbs = 0;
          let isUp = true;
          if (candles.length >= 2 && price != null) {
            const prevClose = candles[candles.length - 2]?.[4] ?? candles[0][4];
            changeAbs = price - prevClose;
            changePercent = (changeAbs / prevClose) * 100;
            isUp = changeAbs >= 0;
          }

          return (
            <div
              key={idx.key}
              className="relative overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, rgba(14,29,53,0.97) 0%, rgba(10,22,40,0.99) 100%)",
                border: `1px solid rgba(${idx.accent},0.2)`,
                boxShadow: `0 0 0 1px rgba(${idx.accent},0.04), inset 0 0 40px rgba(${idx.accent},0.03), 0 4px 20px rgba(0,4,16,0.5)`,
              }}
            >
              {/* Top glow line */}
              <div
                className="absolute top-0 inset-x-0 h-px pointer-events-none z-10"
                style={{ background: `linear-gradient(90deg, transparent, rgba(${idx.accent},0.5), transparent)` }}
              />

              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-2.5 h-2.5 z-10"
                style={{ borderTop: `1px solid rgba(${idx.accent},0.5)`, borderLeft: `1px solid rgba(${idx.accent},0.5)` }} />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 z-10"
                style={{ borderTop: `1px solid rgba(${idx.accent},0.5)`, borderRight: `1px solid rgba(${idx.accent},0.5)` }} />
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 z-10"
                style={{ borderBottom: `1px solid rgba(${idx.accent},0.5)`, borderLeft: `1px solid rgba(${idx.accent},0.5)` }} />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 z-10"
                style={{ borderBottom: `1px solid rgba(${idx.accent},0.5)`, borderRight: `1px solid rgba(${idx.accent},0.5)` }} />

              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: `inset 0 0 30px rgba(${idx.accent},0.06)` }}
              />

              {/* Content */}
              <div className="relative z-20 px-4 pt-3 pb-0">
                {/* Header row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{
                        background: idx.glowColor,
                        boxShadow: `0 0 4px ${idx.glowColor}`,
                      }}
                    />
                    <span
                      className="font-display text-[10px] font-bold tracking-[0.2em] uppercase"
                      style={{ color: `rgba(${idx.accent},0.9)` }}
                    >
                      {idx.label}
                    </span>
                    <span
                      className="font-sans text-[9px]"
                      style={{ color: `rgba(${idx.accent},0.5)` }}
                    >
                      {idx.sub}
                    </span>
                  </div>
                </div>

                {/* Price + change */}
                {isLoading ? (
                  <div className="flex items-center gap-2 h-8">
                    <svg className="w-3 h-3 animate-spin" style={{ color: `rgba(${idx.accent},0.5)` }} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span
                      className="font-display text-[9px] tracking-[0.2em] uppercase"
                      style={{ color: `rgba(${idx.accent},0.4)` }}
                    >
                      LOADING...
                    </span>
                  </div>
                ) : isError ? (
                  <div className="h-8 flex items-center">
                    <span
                      className="font-display text-[9px] tracking-[0.2em] uppercase"
                      style={{ color: "rgba(255,51,85,0.6)" }}
                    >
                      DATA UNAVAILABLE
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-mono text-base font-bold tabular-nums"
                      style={{
                        color: `rgba(${idx.accent},1)`,
                        textShadow: `0 0 8px rgba(${idx.accent},0.4)`,
                      }}
                    >
                      {idx.currency === "KRW" ? "" : "$"}
                      {price != null ? fmtPrice(price, idx.currency) : "—"}
                    </span>
                    {candles.length >= 2 && (
                      <span
                        className="font-mono text-[11px] font-semibold tabular-nums"
                        style={{
                          color: isUp ? "#22ff99" : "#ff3355",
                          textShadow: isUp
                            ? "0 0 6px rgba(34,255,153,0.4)"
                            : "0 0 6px rgba(255,51,85,0.4)",
                        }}
                      >
                        {isUp ? "▲" : "▼"} {Math.abs(changePercent).toFixed(2)}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Mini chart */}
              <div className="relative z-10 mt-1">
                {candles.length >= 2 && !isLoading && !isError ? (
                  <MiniChart
                    candles={candles}
                    accent={idx.accent}
                    width={320}
                    height={64}
                  />
                ) : (
                  <div style={{ height: 64 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
