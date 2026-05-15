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

/* ── 타임프레임: 일봉(기본), 주봉, 월봉 ─────────────────────────────── */
const TIMEFRAMES = [
  { label: "일봉", key: "D", range: "6mo", interval: "1d" },
  { label: "주봉", key: "W", range: "2y", interval: "1wk" },
  { label: "월봉", key: "M", range: "5y", interval: "1mo" },
] as const;

/* ── 캔들 색상 ───────────────────────────────────────────────────────── */
const UP_COLOR   = "#22cc88";  // 양봉 (시가 < 종가)
const DOWN_COLOR = "#ff3355";  // 음봉 (시가 > 종가)
const DOJI_COLOR = "rgba(0,212,255,0.5)"; // 보합

const YahooChart = memo(function YahooChart({ ticker, width, height, onLoaded, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [tfIdx, setTfIdx] = useState(0); // 기본 = 일봉
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Fetch chart data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const tf = TIMEFRAMES[tfIdx];
    fetch(`/api/chart?ticker=${encodeURIComponent(ticker)}&range=${tf.range}&interval=${tf.interval}`)
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
  }, [ticker, tfIdx]);

  // Draw candlestick chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 24, right: 72, bottom: 28, left: 8 };
    const cw = width - pad.left - pad.right;
    const ch = height - pad.top - pad.bottom;

    // Price range from all OHLC values
    let minP = Infinity, maxP = -Infinity;
    for (const c of candles) {
      if (c[3] < minP) minP = c[3]; // low
      if (c[2] > maxP) maxP = c[2]; // high
    }
    const margin = (maxP - minP) * 0.04 || 1;
    minP -= margin;
    maxP += margin;
    const priceRange = maxP - minP || 1;

    const toY = (p: number) => pad.top + (1 - (p - minP) / priceRange) * ch;

    // Candle geometry
    const candleSpacing = cw / candles.length;
    const bodyWidth = Math.max(1, Math.min(candleSpacing * 0.7, 12));
    const wickWidth = Math.max(0.5, bodyWidth > 4 ? 1.5 : 1);

    const toX = (i: number) => pad.left + candleSpacing * (i + 0.5);

    // ── Background ──────────────────────────────────────────────────
    ctx.fillStyle = "rgba(10,22,40,1)";
    ctx.fillRect(0, 0, width, height);

    // ── Grid lines + price labels ───────────────────────────────────
    const gridLines = 5;
    ctx.textAlign = "left";
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (ch / gridLines) * i;
      const pv = maxP - (priceRange / gridLines) * i;
      // Grid line
      ctx.strokeStyle = "rgba(0,212,255,0.06)";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      // Price label
      ctx.fillStyle = "rgba(0,212,255,0.35)";
      ctx.font = "10px monospace";
      ctx.fillText(fmtPrice(pv, currency), width - pad.right + 6, y + 3);
    }

    // ── Volume bars (subtle background) ─────────────────────────────
    const maxVol = Math.max(...candles.map((c) => c[5])) || 1;
    const volH = ch * 0.15;
    for (let i = 0; i < candles.length; i++) {
      const [, o, , , c, v] = candles[i];
      const x = toX(i);
      const barH = (v / maxVol) * volH;
      const isUp = c >= o;
      ctx.fillStyle = isUp ? "rgba(34,204,136,0.12)" : "rgba(255,51,85,0.12)";
      ctx.fillRect(x - bodyWidth / 2, pad.top + ch - barH, bodyWidth, barH);
    }

    // ── Candlesticks ────────────────────────────────────────────────
    for (let i = 0; i < candles.length; i++) {
      const [, o, h, l, c] = candles[i];
      const x = toX(i);
      const isUp = c >= o;
      const color = c === o ? DOJI_COLOR : isUp ? UP_COLOR : DOWN_COLOR;

      // Wick (shadow)
      ctx.strokeStyle = color;
      ctx.lineWidth = wickWidth;
      ctx.beginPath();
      ctx.moveTo(x, toY(h));
      ctx.lineTo(x, toY(l));
      ctx.stroke();

      // Body
      const bodyTop = toY(Math.max(o, c));
      const bodyBot = toY(Math.min(o, c));
      const bodyH = Math.max(bodyBot - bodyTop, 1);

      if (isUp) {
        // 양봉: 테두리만 (속이 빈 캔들)
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyH);
        // 반투명 fill
        ctx.fillStyle = "rgba(34,204,136,0.15)";
        ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyH);
      } else {
        // 음봉: 채움
        ctx.fillStyle = color;
        ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyH);
      }
    }

    // ── Current price line ──────────────────────────────────────────
    if (currentPrice && currentPrice >= minP && currentPrice <= maxP) {
      const cy = toY(currentPrice);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = "rgba(255,187,51,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, cy); ctx.lineTo(width - pad.right, cy); ctx.stroke();
      ctx.setLineDash([]);
      // Price badge
      ctx.fillStyle = "rgba(255,187,51,0.9)";
      ctx.font = "bold 10px monospace";
      ctx.fillText(fmtPrice(currentPrice, currency), width - pad.right + 6, cy + 3);
    }

    // ── Hover crosshair + OHLC tooltip ──────────────────────────────
    if (hoverIdx !== null && hoverIdx >= 0 && hoverIdx < candles.length) {
      const [ts, o, h, l, c, v] = candles[hoverIdx];
      const hx = toX(hoverIdx);
      const isUp = c >= o;

      // Vertical crosshair
      ctx.strokeStyle = "rgba(0,212,255,0.25)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(hx, pad.top); ctx.lineTo(hx, pad.top + ch); ctx.stroke();
      ctx.setLineDash([]);

      // Horizontal line at close
      const hy = toY(c);
      ctx.strokeStyle = "rgba(0,212,255,0.2)";
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(pad.left, hy); ctx.lineTo(width - pad.right, hy); ctx.stroke();
      ctx.setLineDash([]);

      // OHLC tooltip at top
      const d = new Date(ts);
      const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      const ohlcColor = isUp ? UP_COLOR : DOWN_COLOR;
      const chgPct = o !== 0 ? ((c - o) / o * 100) : 0;

      ctx.font = "bold 10px monospace";
      const parts = [
        { text: `${dateStr}  `, color: "rgba(216,238,248,0.6)" },
        { text: `O:${fmtPriceShort(o, currency)} `, color: "rgba(216,238,248,0.7)" },
        { text: `H:${fmtPriceShort(h, currency)} `, color: UP_COLOR },
        { text: `L:${fmtPriceShort(l, currency)} `, color: DOWN_COLOR },
        { text: `C:${fmtPriceShort(c, currency)} `, color: ohlcColor },
        { text: `${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(2)}%`, color: ohlcColor },
      ];

      // Background bar
      let totalW = 0;
      for (const p of parts) totalW += ctx.measureText(p.text).width;
      ctx.fillStyle = "rgba(10,22,40,0.92)";
      ctx.fillRect(pad.left, 2, totalW + 16, 18);
      ctx.strokeStyle = "rgba(0,212,255,0.15)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(pad.left, 2, totalW + 16, 18);

      // Draw parts
      let px = pad.left + 8;
      for (const p of parts) {
        ctx.fillStyle = p.color;
        ctx.textAlign = "left";
        ctx.fillText(p.text, px, 14);
        px += ctx.measureText(p.text).width;
      }

      // Date label at bottom
      ctx.fillStyle = "rgba(10,22,40,0.9)";
      const dateW = ctx.measureText(dateStr).width + 10;
      ctx.fillRect(hx - dateW / 2, pad.top + ch + 2, dateW, 16);
      ctx.fillStyle = "rgba(0,212,255,0.5)";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(dateStr, hx, pad.top + ch + 13);
    }
  }, [candles, currentPrice, currency, width, height, hoverIdx]);

  // Mouse handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const padLeft = 8, padRight = 72;
    const cw = width - padLeft - padRight;
    const candleSpacing = cw / candles.length;
    const idx = Math.floor((mx - padLeft) / candleSpacing);
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
      {/* Timeframe selector: 일봉 / 주봉 / 월봉 */}
      <div className="absolute top-1 left-2 z-10 flex gap-0.5 pointer-events-auto">
        {TIMEFRAMES.map((tf, i) => (
          <button
            key={tf.key}
            onClick={() => setTfIdx(i)}
            className="font-display text-[9px] tracking-wider uppercase px-2 py-0.5 transition-all"
            style={{
              color: tfIdx === i ? "#00d4ff" : "rgba(0,212,255,0.4)",
              background: tfIdx === i ? "rgba(0,212,255,0.12)" : "transparent",
              border: `1px solid ${tfIdx === i ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.1)"}`,
            }}
          >
            {tf.label}
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
            <span className="font-mono text-xs font-bold" style={{ color: isUp ? UP_COLOR : DOWN_COLOR }}>
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

function fmtPriceShort(v: number, currency: string): string {
  if (currency === "KRW") return Math.round(v).toLocaleString("ko-KR");
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default YahooChart;
