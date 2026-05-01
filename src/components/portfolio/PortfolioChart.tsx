"use client";

import { useAssetStore } from "@/lib/store";
import type { ValueSnapshot } from "@/lib/types";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

function fmtKrw(v: number): string {
  if (v >= 1_000_000_000) return `₩${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 100_000_000)   return `₩${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000_000)    return `₩${(v / 10_000_000).toFixed(1)}천만`;
  if (v >= 1_000_000)     return `₩${(v / 1_000_000).toFixed(1)}백만`;
  return `₩${v.toLocaleString("ko-KR")}`;
}
function fmtUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}
function fmtTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() !== today.toDateString())
    return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type TooltipEntry = { dataKey: string; value: number; color: string };
type CustomTooltipProps = { active?: boolean; payload?: TooltipEntry[]; label?: string };

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="p-3 text-xs min-w-[160px]"
      style={{
        background: "rgba(0,8,18,0.97)",
        border: "1px solid rgba(0,212,255,0.18)",
        boxShadow: "0 0 20px rgba(0,0,8,0.8)",
      }}
    >
      <p className="font-display text-[9px] tracking-[0.3em] uppercase mb-2.5" style={{ color: "rgba(0,212,255,0.4)" }}>
        {label}
      </p>
      {payload.map((entry: TooltipEntry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color, boxShadow: `0 0 4px ${entry.color}` }} />
            <span className="font-mono text-[10px]" style={{ color: "rgba(184,224,240,0.6)" }}>{entry.dataKey}</span>
          </div>
          <span className="font-mono font-semibold" style={{ color: entry.color }}>
            {entry.dataKey === "KRW"
              ? `₩${Math.round(entry.value ?? 0).toLocaleString("ko-KR")}`
              : `$${((entry.value ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-6 mt-1">
      {[
        { color: "#00d4ff", label: "KRW 총액" },
        { color: "#ff6600", label: "USD 총액" },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-5 h-px inline-block" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
          <span className="font-display text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(184,224,240,0.5)" }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PortfolioChart() {
  const { valueHistory, clearHistory } = useAssetStore();

  const chartData = valueHistory.map((s: ValueSnapshot) => ({
    time: fmtTime(s.ts),
    KRW: Math.round(s.totalKrw),
    USD: Math.round(s.totalUsd * 100) / 100,
  }));

  const hasKrw = valueHistory.some((s) => s.totalKrw > 0);
  const hasUsd = valueHistory.some((s) => s.totalUsd > 0);

  return (
    <div
      className="relative overflow-hidden animate-fade-in-up"
      style={{
        background: "linear-gradient(135deg, rgba(0,12,24,0.96) 0%, rgba(0,7,16,0.99) 100%)",
        border: "1px solid rgba(0,212,255,0.12)",
        boxShadow: "0 0 0 1px rgba(0,212,255,0.04), inset 0 0 80px rgba(0,60,120,0.04), 0 8px 40px rgba(0,0,8,0.9)",
      }}
    >
      {/* Top glow */}
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)" }} />
      {/* Corners */}
      <div className="absolute top-0 left-0 w-3 h-3 z-10" style={{ borderTop: "1px solid rgba(0,212,255,0.5)", borderLeft: "1px solid rgba(0,212,255,0.5)" }} />
      <div className="absolute top-0 right-0 w-3 h-3 z-10" style={{ borderTop: "1px solid rgba(0,212,255,0.5)", borderRight: "1px solid rgba(0,212,255,0.5)" }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 z-10" style={{ borderBottom: "1px solid rgba(0,212,255,0.5)", borderLeft: "1px solid rgba(0,212,255,0.5)" }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 z-10" style={{ borderBottom: "1px solid rgba(0,212,255,0.5)", borderRight: "1px solid rgba(0,212,255,0.5)" }} />

      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(0,212,255,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#aa88ff", boxShadow: "0 0 6px rgba(170,136,255,0.8)" }} />
          <span className="font-display text-[10px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.45)" }}>
            PORTFOLIO HISTORY
          </span>
          {valueHistory.length > 0 && (
            <span className="font-mono text-[9px] ml-1" style={{ color: "rgba(0,212,255,0.2)" }}>
              {valueHistory.length} POINTS
            </span>
          )}
        </div>
        {valueHistory.length > 0 && (
          <button
            onClick={clearHistory}
            className="font-display text-[9px] tracking-[0.25em] uppercase transition-colors"
            style={{ color: "rgba(0,212,255,0.25)" }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "#ff2244"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "rgba(0,212,255,0.25)"; }}
          >
            [ CLEAR LOG ]
          </button>
        )}
      </div>

      {/* Empty state */}
      {chartData.length === 0 && (
        <div className="h-60 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="w-10 h-10 flex items-center justify-center"
            style={{ border: "1px solid rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.03)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: "rgba(0,212,255,0.3)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <p className="font-display text-xs tracking-[0.2em] uppercase" style={{ color: "rgba(0,212,255,0.4)" }}>
              NO HISTORY
            </p>
            <p className="font-mono text-[10px] mt-1" style={{ color: "rgba(0,212,255,0.2)" }}>
              FETCH PRICES TO BEGIN RECORDING
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="px-2 pt-5 pb-3">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="rgba(0,212,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fill: "rgba(0,212,255,0.3)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                axisLine={{ stroke: "rgba(0,212,255,0.08)" }}
                tickLine={false}
                minTickGap={60}
              />
              {hasKrw && (
                <YAxis yAxisId="krw" orientation="left" tickFormatter={fmtKrw}
                  tick={{ fill: "#00d4ff", fontSize: 10, fontFamily: "var(--font-mono)" }}
                  axisLine={false} tickLine={false} width={72}
                />
              )}
              {hasUsd && (
                <YAxis yAxisId="usd" orientation="right" tickFormatter={fmtUsd}
                  tick={{ fill: "#ff6600", fontSize: 10, fontFamily: "var(--font-mono)" }}
                  axisLine={false} tickLine={false} width={60}
                />
              )}
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0,212,255,0.15)", strokeWidth: 1 }} />
              {hasKrw && (
                <Line yAxisId="krw" type="monotone" dataKey="KRW" stroke="#00d4ff" strokeWidth={1.5}
                  dot={{ fill: "#00d4ff", r: 2.5, strokeWidth: 0 }}
                  activeDot={{ fill: "#00d4ff", r: 4, strokeWidth: 0, filter: "drop-shadow(0 0 4px #00d4ff)" }}
                  connectNulls
                />
              )}
              {hasUsd && (
                <Line yAxisId="usd" type="monotone" dataKey="USD" stroke="#ff6600" strokeWidth={1.5}
                  dot={{ fill: "#ff6600", r: 2.5, strokeWidth: 0 }}
                  activeDot={{ fill: "#ff6600", r: 4, strokeWidth: 0 }}
                  connectNulls
                />
              )}
              <Legend content={<CustomLegend />} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
