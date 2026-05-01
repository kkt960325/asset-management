"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAssetStore } from "@/lib/store";
import type { AssetCategory } from "@/lib/types";

const CAT: Record<AssetCategory, { color: string; label: string }> = {
  "미국주식":   { color: "#00d4ff", label: "미국주식" },
  "한국주식":   { color: "#00ff88", label: "한국주식" },
  "해외주식":   { color: "#4488ff", label: "해외주식" },
  "국내ETF":    { color: "#00ccaa", label: "국내ETF"  },
  "해외ETF":    { color: "#2266ff", label: "해외ETF"  },
  "채권":       { color: "#6699bb", label: "채권"     },
  "Crypto":     { color: "#ffaa00", label: "Crypto"   },
  "KRX금현물":  { color: "#ff8800", label: "KRX금현물"},
  "금/원자재":  { color: "#ffcc00", label: "금/원자재"},
  "부동산":     { color: "#ff4466", label: "부동산"   },
  "현금/예금":  { color: "#aa88ff", label: "현금/예금"},
  "연금/퇴직":  { color: "#ff6600", label: "연금/퇴직"},
  "보험/기타":  { color: "#ff44aa", label: "보험/기타"},
};

type SliceData = { category: AssetCategory; value: number; pct: number; color: string; label: string };

function fmtKrw(v: number): string {
  if (v >= 1_000_000_000_000) return `₩${(v / 1_000_000_000_000).toFixed(2)}조`;
  if (v >= 100_000_000)       return `₩${(v / 100_000_000).toFixed(2)}억`;
  if (v >= 10_000_000)        return `₩${(v / 10_000_000).toFixed(1)}천만`;
  if (v >= 1_000_000)         return `₩${(v / 1_000_000).toFixed(1)}백만`;
  return `₩${Math.round(v).toLocaleString("ko-KR")}`;
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SliceData }> }) {
  if (!active || !payload?.length) return null;
  const { label, color, value, pct } = payload[0].payload;
  return (
    <div
      className="p-3 text-xs min-w-[140px]"
      style={{
        background: "rgba(0,8,18,0.97)",
        border: `1px solid rgba(0,212,255,0.2)`,
        boxShadow: "0 0 20px rgba(0,0,8,0.8)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
        <span className="font-display text-[10px] tracking-[0.2em] uppercase" style={{ color }}>{label}</span>
      </div>
      <p className="font-mono text-sm font-bold" style={{ color, textShadow: `0 0 8px ${color}` }}>{fmtKrw(value)}</p>
      <p className="font-mono text-[10px] mt-1.5" style={{ color: "rgba(0,212,255,0.3)" }}>
        PORTFOLIO SHARE {pct.toFixed(2)}%
      </p>
    </div>
  );
}

export default function PortfolioPieChart() {
  const { assets, exchangeRate } = useAssetStore();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const rate = exchangeRate > 0 ? exchangeRate : 1_400;

  const { chartData, total } = useMemo(() => {
    const map = new Map<AssetCategory, number>();
    for (const a of assets) {
      const v = a.currentValue ?? 0;
      const krw = a.currency === "USD" ? v * rate : v;
      if (krw > 0) map.set(a.category, (map.get(a.category) ?? 0) + krw);
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    const chartData: SliceData[] = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, value]) => ({
        category, value,
        pct: total > 0 ? (value / total) * 100 : 0,
        ...CAT[category],
      }));
    return { chartData, total };
  }, [assets, rate]);

  const hasData = chartData.length > 0;
  const activeSlice = activeIdx !== null ? chartData[activeIdx] : null;

  return (
    <div
      className="relative overflow-hidden animate-fade-in-up"
      style={{
        background: "linear-gradient(135deg, rgba(0,12,24,0.96) 0%, rgba(0,7,16,0.99) 100%)",
        border: "1px solid rgba(0,212,255,0.12)",
        boxShadow: "0 0 0 1px rgba(0,212,255,0.04), inset 0 0 80px rgba(0,60,120,0.04), 0 8px 40px rgba(0,0,8,0.9)",
      }}
    >
      {/* Top glow line */}
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)" }} />
      {/* Corners */}
      <div className="absolute top-0 left-0 w-3 h-3 z-10" style={{ borderTop: "1px solid rgba(0,212,255,0.5)", borderLeft: "1px solid rgba(0,212,255,0.5)" }} />
      <div className="absolute top-0 right-0 w-3 h-3 z-10" style={{ borderTop: "1px solid rgba(0,212,255,0.5)", borderRight: "1px solid rgba(0,212,255,0.5)" }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 z-10" style={{ borderBottom: "1px solid rgba(0,212,255,0.5)", borderLeft: "1px solid rgba(0,212,255,0.5)" }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 z-10" style={{ borderBottom: "1px solid rgba(0,212,255,0.5)", borderRight: "1px solid rgba(0,212,255,0.5)" }} />

      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(0,212,255,0.1)" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#ffaa00", boxShadow: "0 0 6px rgba(255,170,0,0.8)" }}
        />
        <span className="font-display text-[10px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.45)" }}>
          ASSET ALLOCATION
        </span>
        {hasData && (
          <span className="ml-auto font-mono text-[9px]" style={{ color: "rgba(0,212,255,0.25)" }}>
            {chartData.length} SECTORS
          </span>
        )}
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="h-[280px] flex flex-col items-center justify-center gap-3 text-center px-6">
          <div
            className="w-10 h-10 flex items-center justify-center"
            style={{ border: "1px solid rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.03)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: "rgba(0,212,255,0.3)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <div>
            <p className="font-display text-xs tracking-[0.2em] uppercase" style={{ color: "rgba(0,212,255,0.4)" }}>
              NO DATA
            </p>
            <p className="font-mono text-[10px] mt-1" style={{ color: "rgba(0,212,255,0.2)" }}>
              REFRESH SYSTEMS TO FETCH PRICES
            </p>
          </div>
        </div>
      )}

      {/* Chart + legend */}
      {hasData && (
        <div className="p-5 flex flex-col sm:flex-row items-center gap-5">
          {/* Donut */}
          <div className="relative flex-shrink-0" style={{ width: 220, height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={68} outerRadius={96}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={(_, idx) => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx(null)}
                  stroke="none"
                  startAngle={90} endAngle={-270}
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={entry.category}
                      fill={entry.color}
                      opacity={activeIdx === null || activeIdx === i ? 1 : 0.2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              {activeSlice ? (
                <>
                  <span className="font-display text-[8px] tracking-[0.25em] uppercase" style={{ color: activeSlice.color }}>
                    {activeSlice.label}
                  </span>
                  <span className="font-mono text-[13px] font-bold mt-1 leading-tight"
                    style={{ color: activeSlice.color, textShadow: `0 0 10px ${activeSlice.color}` }}>
                    {fmtKrw(activeSlice.value)}
                  </span>
                  <span className="font-mono text-[11px] mt-1 font-semibold" style={{ color: activeSlice.color }}>
                    {activeSlice.pct.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="font-display text-[8px] tracking-[0.3em] uppercase" style={{ color: "rgba(0,212,255,0.3)" }}>
                    TOTAL
                  </span>
                  <span className="font-mono text-[13px] font-bold mt-1 leading-tight"
                    style={{ color: "#00d4ff", textShadow: "0 0 10px rgba(0,212,255,0.6)" }}>
                    {fmtKrw(total)}
                  </span>
                  <span className="font-mono text-[9px] mt-0.5" style={{ color: "rgba(0,212,255,0.3)" }}>
                    KRW BASE
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-0.5 w-full flex-1 min-w-0">
            {chartData.map((entry, i) => (
              <div
                key={entry.category}
                className="flex items-center gap-2.5 px-2.5 py-1.5 cursor-default transition-all duration-150"
                style={{
                  background: activeIdx === i ? "rgba(0,212,255,0.04)" : "transparent",
                  borderLeft: activeIdx === i ? `2px solid ${entry.color}` : "2px solid transparent",
                }}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-150"
                  style={{
                    background: entry.color,
                    boxShadow: activeIdx === i ? `0 0 6px ${entry.color}` : "none",
                    transform: activeIdx === i ? "scale(1.5)" : "scale(1)",
                  }}
                />
                <span className="text-[11px] flex-1 truncate" style={{ color: "rgba(184,224,240,0.6)" }}>
                  {entry.label}
                </span>
                <span className="font-mono text-[11px]" style={{ color: activeIdx === i ? entry.color : "rgba(184,224,240,0.7)" }}>
                  {fmtKrw(entry.value)}
                </span>
                <span className="font-mono text-[10px] w-11 text-right font-bold"
                  style={{ color: activeIdx === i ? entry.color : "rgba(0,212,255,0.3)" }}>
                  {entry.pct.toFixed(1)}%
                </span>
              </div>
            ))}

            <div
              className="mt-1 pt-2 flex items-center justify-between px-2.5"
              style={{ borderTop: "1px solid rgba(0,212,255,0.08)" }}
            >
              <span className="font-display text-[9px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.3)" }}>
                TOTAL
              </span>
              <span
                className="font-mono text-[11px] font-bold"
                style={{ color: "#00d4ff", textShadow: "0 0 8px rgba(0,212,255,0.6)" }}
              >
                {fmtKrw(total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
