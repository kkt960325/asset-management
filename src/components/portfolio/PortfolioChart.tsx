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
// ── 포맷 유틸 ─────────────────────────────────────────────────────────────────

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

// ── 커스텀 툴팁 ───────────────────────────────────────────────────────────────

type TooltipEntry = { dataKey: string; value: number; color: string };
type CustomTooltipProps = { active?: boolean; payload?: TooltipEntry[]; label?: string };

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#1a2540] bg-[#070b12] p-3 text-xs shadow-2xl min-w-[160px]">
      <p className="font-mono text-[#8392b0] mb-2.5 text-[11px]">{label}</p>
      {payload.map((entry: TooltipEntry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-[#8392b0]">{entry.dataKey}</span>
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

// ── 커스텀 레전드 ─────────────────────────────────────────────────────────────

function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-5 mt-1">
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-0.5 rounded bg-sky-400 inline-block" />
        <span className="text-[11px] text-[#8392b0]">KRW 총액</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-0.5 rounded bg-amber-400 inline-block" />
        <span className="text-[11px] text-[#8392b0]">USD 총액</span>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

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
    <div className="rounded-xl border border-[#1a2540] bg-[#0c1121] overflow-hidden animate-fade-in-up">
      {/* 헤더 */}
      <div className="px-5 py-3.5 border-b border-[#1a2540] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#8392b0]">
            총액 추이
          </span>
          {valueHistory.length > 0 && (
            <span className="font-mono text-[10px] text-[#3a4a6a] ml-1">
              {valueHistory.length} points
            </span>
          )}
        </div>
        {valueHistory.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-[10px] font-semibold text-[#3a4a6a] hover:text-rose-400 transition-colors uppercase tracking-wider"
          >
            기록 초기화
          </button>
        )}
      </div>

      {/* 빈 상태 */}
      {chartData.length === 0 && (
        <div className="h-60 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="w-10 h-10 rounded-full bg-[#111827] border border-[#1a2540] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#3a4a6a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <p className="text-[#8392b0] text-sm font-medium">아직 기록된 데이터가 없습니다</p>
            <p className="text-[#3a4a6a] text-xs mt-1">
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
              {/* 배경 그리드 */}
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="#1a2540"
                vertical={false}
              />

              {/* X축 */}
              <XAxis
                dataKey="time"
                tick={{ fill: "#3a4a6a", fontSize: 10, fontFamily: "var(--font-mono)" }}
                axisLine={{ stroke: "#1a2540" }}
                tickLine={false}
                minTickGap={60}
              />

              {/* Y축 왼쪽: KRW */}
              {hasKrw && (
                <YAxis
                  yAxisId="krw"
                  orientation="left"
                  tickFormatter={fmtKrw}
                  tick={{ fill: "#38bdf8", fontSize: 10, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
              )}

              {/* Y축 오른쪽: USD */}
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
                cursor={{ stroke: "#243050", strokeWidth: 1 }}
              />

              {/* KRW 라인 */}
              {hasKrw && (
                <Line
                  yAxisId="krw"
                  type="monotone"
                  dataKey="KRW"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ fill: "#38bdf8", r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: "#38bdf8", r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              )}

              {/* USD 라인 */}
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
