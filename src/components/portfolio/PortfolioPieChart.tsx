"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAssetStore } from "@/lib/store";
import type { AssetCategory } from "@/lib/types";

const CAT: Record<AssetCategory, { color: string; label: string }> = {
  "미국주식":   { color: "#38bdf8", label: "미국주식" },
  "한국주식":   { color: "#34d399", label: "한국주식" },
  "해외주식":   { color: "#818cf8", label: "해외주식" },
  "국내ETF":    { color: "#2dd4bf", label: "국내ETF" },
  "해외ETF":    { color: "#60a5fa", label: "해외ETF" },
  "채권":       { color: "#94a3b8", label: "채권" },
  "Crypto":     { color: "#fbbf24", label: "Crypto" },
  "KRX금현물":  { color: "#f59e0b", label: "KRX금현물" },
  "금/원자재":  { color: "#fcd34d", label: "금/원자재" },
  "부동산":     { color: "#fb7185", label: "부동산" },
  "현금/예금":  { color: "#a78bfa", label: "현금/예금" },
  "연금/퇴직":  { color: "#fb923c", label: "연금/퇴직" },
  "보험/기타":  { color: "#f472b6", label: "보험/기타" },
};

type SliceData = {
  category: AssetCategory;
  value: number;
  pct: number;
  color: string;
  label: string;
};

function fmtKrw(v: number): string {
  if (v >= 1_000_000_000_000) return `₩${(v / 1_000_000_000_000).toFixed(2)}조`;
  if (v >= 100_000_000)       return `₩${(v / 100_000_000).toFixed(2)}억`;
  if (v >= 10_000_000)        return `₩${(v / 10_000_000).toFixed(1)}천만`;
  if (v >= 1_000_000)         return `₩${(v / 1_000_000).toFixed(1)}백만`;
  return `₩${Math.round(v).toLocaleString("ko-KR")}`;
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SliceData }>;
}) {
  if (!active || !payload?.length) return null;
  const { label, color, value, pct } = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#030e18]/95 p-3 text-xs shadow-2xl min-w-[140px] backdrop-blur">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="font-semibold text-[#edeff9] tracking-wider text-[11px] uppercase">{label}</span>
      </div>
      <p className="font-mono text-sm font-bold leading-none" style={{ color }}>
        {fmtKrw(value)}
      </p>
      <p className="font-mono text-[10px] text-[#787e88]/60 mt-1.5">
        포트폴리오 내 {pct.toFixed(2)}%
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
        category,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
        ...CAT[category],
      }));
    return { chartData, total };
  }, [assets, rate]);

  const hasData = chartData.length > 0;
  const activeSlice = activeIdx !== null ? chartData[activeIdx] : null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a1c2d]/80 backdrop-blur-sm overflow-hidden animate-fade-in-up">
      {/* 헤더 */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
        <span className="text-xs font-semibold uppercase tracking-widest text-[#787e88]">
          자산 비중
        </span>
        {hasData && (
          <span className="ml-auto font-mono text-[10px] text-[#787e88]/50">
            {chartData.length}개 카테고리
          </span>
        )}
      </div>

      {/* 빈 상태 */}
      {!hasData && (
        <div className="h-[280px] flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="w-10 h-10 rounded-full bg-[#030e18] border border-white/[0.06] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#787e88]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <div>
            <p className="text-[#787e88] text-sm font-medium">시세 데이터 없음</p>
            <p className="text-[#787e88]/50 text-xs mt-1">시세 갱신 버튼을 눌러주세요</p>
          </div>
        </div>
      )}

      {/* 차트 + 레전드 */}
      {hasData && (
        <div className="p-5 flex flex-col sm:flex-row items-center gap-5">

          {/* 도넛 차트 */}
          <div className="relative flex-shrink-0" style={{ width: 220, height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={96}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={(_, idx) => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx(null)}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={entry.category}
                      fill={entry.color}
                      opacity={activeIdx === null || activeIdx === i ? 1 : 0.3}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none transition-all duration-200">
              {activeSlice ? (
                <>
                  <span
                    className="font-mono text-[9px] tracking-[0.25em] uppercase font-semibold"
                    style={{ color: activeSlice.color }}
                  >
                    {activeSlice.label}
                  </span>
                  <span className="font-mono text-[13px] font-bold text-[#edeff9] mt-1 leading-tight">
                    {fmtKrw(activeSlice.value)}
                  </span>
                  <span
                    className="font-mono text-[11px] mt-1 font-semibold"
                    style={{ color: activeSlice.color }}
                  >
                    {activeSlice.pct.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono text-[9px] tracking-[0.25em] text-[#787e88]/50 uppercase">
                    총 자산
                  </span>
                  <span className="font-mono text-[13px] font-bold text-[#edeff9] mt-1 leading-tight">
                    {fmtKrw(total)}
                  </span>
                  <span className="font-mono text-[9px] text-[#787e88]/50 mt-0.5">KRW 환산</span>
                </>
              )}
            </div>
          </div>

          {/* 레전드 목록 */}
          <div className="flex flex-col gap-1 w-full flex-1 min-w-0">
            {chartData.map((entry, i) => (
              <div
                key={entry.category}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-default transition-all duration-150 ${
                  activeIdx === i ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"
                }`}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-150"
                  style={{
                    background: entry.color,
                    transform: activeIdx === i ? "scale(1.4)" : "scale(1)",
                    boxShadow: activeIdx === i ? `0 0 6px ${entry.color}80` : "none",
                  }}
                />

                <span className="text-[11px] text-[#787e88] flex-1 truncate font-medium">
                  {entry.label}
                </span>

                <span
                  className="font-mono text-[11px] transition-colors duration-150"
                  style={{ color: activeIdx === i ? entry.color : "#edeff9" }}
                >
                  {fmtKrw(entry.value)}
                </span>

                <span
                  className="font-mono text-[10px] w-11 text-right font-semibold"
                  style={{ color: activeIdx === i ? entry.color : "#787e88" }}
                >
                  {entry.pct.toFixed(1)}%
                </span>
              </div>
            ))}

            <div className="mt-1 pt-2 border-t border-white/[0.06] flex items-center justify-between px-2.5">
              <span className="text-[10px] text-[#787e88]/50 uppercase tracking-widest">합계</span>
              <span className="font-mono text-[11px] font-bold text-[#00c389]">{fmtKrw(total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
