"use client";

import { useEffect, useRef, useState, memo } from "react";

type Candle = [number, number, number, number, number, number]; // ts, o, h, l, c, v

interface Props {
  ticker: string;
  width: number;
  height: number;
  onLoaded?: () => void;
  onError?: () => void;
}

const RANGES = [
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "3M", range: "3mo", interval: "1d" },
  { label: "6M", range: "6mo", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1wk" },
] as const;

const YahooChart = memo(function YahooChart({ ticker, width, height, onLoaded, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [rangeIdx, setRangeIdx] = useState(1); // default 3M
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Fetch chart data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const r = RANGES[rangeIdx];
    fetch(`/api/chart?ticker=${encodeURIComponent(ticker)}&range=${r.range}&interval=${r.interval}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.candles || data.candles.length === 0) {
          setError(true);
          onError?.();
          return;
        }
        setCandles(data.candles);
        setCurrentPrice(data.currentPrice);
        setCurrency(data.currency ?? "USD");
        setLoading(false);
        onLoaded?.();
      })
      .catch(() => {
        if (!cancelled) { setError(true); onError?.(); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [ticker, rangeIdx]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 30, right: 70, bottom: 30, left: 10 };
    const cw = width - pad.left - pad.right;
    const ch = height - pad.top - pad.bottom;

    const closes = candles.map((c) => c[4]);
    const minP = Math.min(...closes) * 0.998;
    const maxP = Math.max(...closes) * 1.002;
    const priceRange = maxP - minP || 1;

    const toX = (i: number) => pad.left + (i / (candles.length - 1)) * cw;
    const toY = (p: number) => pad.top + (1 - (p - minP) / priceRange) * ch;

    // Background
    ctx.fillStyle = "rgba(10,22,40,1)";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(0,212,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      const pv = maxP - (priceRange / 4) * i;
      ctx.fillStyle = "rgba(0,212,255,0.35)";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(fmtPrice(pv, currency), width - pad.right + 6, y + 3);
    }

    // Area gradient
    const grad = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
    const isUp = closes[closes.length - 1] >= closes[0];
    if (isUp) {
      grad.addColorStop(0, "rgba(0,212,255,0.25)");
      grad.addColorStop(1, "rgba(0,212,255,0.01)");
    } else {
      grad.addColorStop(0, "rgba(255,34,68,0.25)");
      grad.addColorStop(1, "rgba(255,34,68,0.01)");
    }

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(closes[0]));
    for (let i = 1; i < closes.length; i++) ctx.lineTo(toX(i), toY(closes[i]));
    ctx.lineTo(toX(closes.length - 1), height - pad.bottom);
    ctx.lineTo(toX(0), height - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(closes[0]));
    for (let i = 1; i < closes.length; i++) ctx.lineTo(toX(i), toY(closes[i]));
    ctx.strokeStyle = isUp ? "#00d4ff" : "#ff2244";
    ctx.lineWidth = 1.8;
    ctx.shadowColor = isUp ? "rgba(0,212,255,0.5)" : "rgba(255,34,68,0.5)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current price line
    if (currentPrice) {
      const cy = toY(currentPrice);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255,187,51,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, cy); ctx.lineTo(width - pad.right, cy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffbb33";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(fmtPrice(currentPrice, currency), width - pad.right + 6, cy + 3);
    }

    // Hover crosshair
    if (hoverIdx !== null && hoverIdx >= 0 && hoverIdx < candles.length) {
      const hx = toX(hoverIdx);
      const hy = toY(closes[hoverIdx]);
      ctx.strokeStyle = "rgba(0,212,255,0.3)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(hx, pad.top); ctx.lineTo(hx, height - pad.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.left, hy); ctx.lineTo(width - pad.right, hy); ctx.stroke();
      ctx.setLineDash([]);

      // Dot
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fillStyle = isUp ? "#00d4ff" : "#ff2244";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tooltip
      const d = new Date(candles[hoverIdx][0]);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const priceStr = fmtPrice(closes[hoverIdx], currency);
      const label = `${dateStr}  ${priceStr}`;
      ctx.font = "bold 10px monospace";
      const tw = ctx.measureText(label).width + 12;
      let tx = hx - tw / 2;
      if (tx < pad.left) tx = pad.left;
      if (tx + tw > width - pad.right) tx = width - pad.right - tw;
      ctx.fillStyle = "rgba(14,28,50,0.95)";
      ctx.fillRect(tx, pad.top - 22, tw, 18);
      ctx.strokeStyle = "rgba(0,212,255,0.4)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(tx, pad.top - 22, tw, 18);
      ctx.fillStyle = "#d8eef8";
      ctx.textAlign = "left";
      ctx.fillText(label, tx + 6, pad.top - 9);
    }
  }, [candles, currentPrice, currency, width, height, hoverIdx]);

  // Mouse handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pad = { left: 10, right: 70 };
    const cw = width - pad.left - pad.right;
    const idx = Math.round(((mx - pad.left) / cw) * (candles.length - 1));
    setHoverIdx(Math.max(0, Math.min(candles.length - 1, idx)));
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(10,22,40,1)" }}>
        <span className="font-display text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,34,68,0.6)" }}>
          CHART DATA UNAVAILABLE
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ background: "rgba(10,22,40,1)" }}>
      {/* Range selector */}
      <div className="absolute top-1 left-2 z-10 flex gap-0.5 pointer-events-auto">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRangeIdx(i)}
            className="font-display text-[9px] tracking-wider uppercase px-2 py-0.5 transition-all"
            style={{
              color: rangeIdx === i ? "#00d4ff" : "rgba(0,212,255,0.4)",
              background: rangeIdx === i ? "rgba(0,212,255,0.12)" : "transparent",
              border: `1px solid ${rangeIdx === i ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.1)"}`,
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Price change badge */}
      {candles.length > 1 && !loading && (() => {
        const first = candles[0][4];
        const last = candles[candles.length - 1][4];
        const chg = ((last - first) / first) * 100;
        const isUp = chg >= 0;
        return (
          <div className="absolute top-1 right-2 z-10 flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold" style={{ color: isUp ? "#00ff88" : "#ff2244" }}>
              {isUp ? "+" : ""}{chg.toFixed(2)}%
            </span>
          </div>
        );
      })()}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" style={{ color: "rgba(0,212,255,0.6)" }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="font-display text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(0,212,255,0.5)" }}>
              YAHOO FINANCE
            </span>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{ width, height, display: candles.length > 0 ? "block" : "none" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      />
    </div>
  );
});

function fmtPrice(v: number, currency: string): string {
  if (currency === "KRW") return "₩" + Math.round(v).toLocaleString("ko-KR");
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default YahooChart;
