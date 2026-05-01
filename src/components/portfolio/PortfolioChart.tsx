"use client";

import { useAssetStore } from "@/lib/store";
import type { ValueSnapshot } from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
  if (d.toDateString() !== today.toDateString()) {
    return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type TooltipEntry = { dataKey: string; value: number; color: string };
type CustomTooltipProps = { active?: boolean; payload?: TooltipEntry[]; label?: string };

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#030e18]/95 p-3 text-xs shadow-2xl min-w-[160px] backdrop-blur">
      <p className="font-mono text-[#787e88] mb-2.5 text-[11px]">{label}</p>
      {payload.map((entry: TooltipEntry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-[#787e88]">{entry.dataKey}</span>
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
    <div className="flex items-center justify-center gap-5 mt-1">
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-0.5 rounded inline-block" style={{ background: "#00c389" }} />
        <span className="text-[11px] text-[#787e88]">KRW 총액</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-0.5 rounded bg-[#fbbf24] inline-block" />
        <span className="text-[11px] text-[#787e88]">USD 총액</span>
      </div>
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
    <div className="rounded-xl border border-white/[0.06] bg-[#0a1c2d]/80 backdrop-blur-sm overflow-hidden animate-fade-in-up">
      {/* 헤더 */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#485cc7]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#787e88]">
            총액 추이
          </span>
          {valueHistory.length > 0 && (
            <span className="font-mono text-[10px] text-[#787e88]/50 ml-1">
              {valueHistory.length} points
            </span>
          )}
        </div>
        {valueHistory.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-[10px] font-semibold text-[#787e88]/50 hover:text-rose-400 transition-colors uppercase tracking-wider"
          >
            기록 초기화
          </button>
        )}
      </div>

      {/* 빈 상태 */}
      {chartData.length === 0 && (
        <div className="h-60 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="w-10 h-10 rounded-full bg-[#030e18] border border-white/[0.06] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#787e88]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <p className="text-[#787e88] text-sm font-medium">아직 기록된 데이터가 없습니다</p>
            <p className="text-[#787e88]/50 text-xs mt-1">
              시세 갱신 버튼을 누르면 총액이 자동으로 기록됩니다
            </p>
          </div>
        </div>
      )}

      {/* 차트 */}
      {chartData.length > 0 && (
        <div className="px-2 pt-5 pb-3">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                tick={{ fill: "#787e88", fontSize: 10, fontFamily: "var(--font-mono)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
                tickLine={false}
                minTickGap={60}
              />

              {hasKrw && (
                <YAxis
                  yAxisId="krw"
                  orientation="left"
                  tickFormatter={fmtKrw}
                  tick={{ fill: "#00c389", fontSize: 10, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
              )}

              {hasUsd && (
                <YAxis
                  yAxisId="usd"
                  orientation="right"
                  tickFormatter={fmtUsd}
                  tick={{ fill: "#fbbf24", fontSize: 10, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
              )}

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
              />

              {hasKrw && (
                <Line
                  yAxisId="krw"
                  type="monotone"
                  dataKey="KRW"
                  stroke="#00c389"
                  strokeWidth={2}
                  dot={{ fill: "#00c389", r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: "#00c389", r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              )}

              {hasUsd && (
                <Line
                  yAxisId="usd"
                  type="monotone"
                  dataKey="USD"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ fill: "#fbbf24", r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: "#fbbf24", r: 5, strokeWidth: 0 }}
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
