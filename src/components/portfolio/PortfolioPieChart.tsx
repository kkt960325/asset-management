"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAssetStore } from "@/lib/store";
import type { AssetCategory } from "@/lib/types";

// ── 지브리 다크 팔레트 ──────────────────────────────────────────────────────────
// 90년대 일본 애니메이션 감성: 하늘빛, 숲의 초록, 황금빛, 황혼의 보랏빛, 석양 오렌지
const CAT: Record<AssetCategory, { color: string; label: string }> = {
  "미국주식": { color: "#38bdf8", label: "미국주식" },   // 하울의 하늘빛
  "Crypto":   { color: "#f59e0b", label: "Crypto" },     // 황금 정령
  "금현물":   { color: "#fcd34d", label: "금현물" },      // 타타라 황금
  "ISA-ETF":  { color: "#34d399", label: "ISA-ETF" },    // 모노노케 숲
  "주택청약": { color: "#a78bfa", label: "주택청약" },     // 황혼의 보랏빛
  "IRP":      { color: "#fb923c", label: "IRP" },         // 토토로 석양
  "부동산":   { color: "#2dd4bf", label: "부동산" },      // 대지의 청록
};

type SliceData = {
  category: AssetCategory;
  value: number;
  pct: number;
  color: string;
  label: string;
};

// ── 포맷 유틸 ─────────────────────────────────────────────────────────────────
function fmtKrw(v: number): string {
  if (v >= 1_000_000_000_000) return `₩${(v / 1_000_000_000_000).toFixed(2)}조`;
  if (v >= 100_000_000)       return `₩${(v / 100_000_000).toFixed(2)}억`;
  if (v >= 10_000_000)        return `₩${(v / 10_000_000).toFixed(1)}천만`;
  if (v >= 1_000_000)         return `₩${(v / 1_000_000).toFixed(1)}백만`;
  return `₩${Math.round(v).toLocaleString("ko-KR")}`;
}

// ── 커스텀 툴팁 ──────────────────────────────────────────────────────────────
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
    <div className="rounded-xl border border-[#1a2540] bg-[#070b12]/95 p-3 text-xs shadow-2xl min-w-[140px] backdrop-blur">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="font-semibold text-[#e2e8f8] tracking-wider text-[11px] uppercase">{label}</span>
      </div>
      <p className="font-mono text-sm font-bold leading-none" style={{ color }}>
        {fmtKrw(value)}
      </p>
      <p className="font-mono text-[10px] text-[#3a4a6a] mt-1.5">
        포트폴리오 내 {pct.toFixed(2)}%
      </p>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
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
    <div className="rounded-xl border border-[#1a2540] bg-[#0c1121] overflow-hidden animate-fade-in-up">
      {/* 헤더 */}
      <div className="px-5 py-3.5 border-b border-[#1a2540] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-[#8392b0]">
          자산 비중
        </span>
        {hasData && (
          <span className="ml-auto font-mono text-[10px] text-[#3a4a6a]">
            {chartData.length}개 카테고리
          </span>
        )}
      </div>

      {/* 빈 상태 */}
      {!hasData && (
        <div className="h-[280px] flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="w-10 h-10 rounded-full bg-[#111827] border border-[#1a2540] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#3a4a6a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <div>
            <p className="text-[#8392b0] text-sm font-medium">시세 데이터 없음</p>
            <p className="text-[#3a4a6a] text-xs mt-1">시세 갱신 버튼을 눌러주세요</p>
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
                      opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* 중앙 텍스트 — 호버 시 해당 카테고리 정보로 전환 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none transition-all duration-200">
              {activeSlice ? (
                <>
                  <span
                    className="font-mono text-[9px] tracking-[0.25em] uppercase font-semibold"
                    style={{ color: activeSlice.color }}
                  >
                    {activeSlice.label}
                  </span>
                  <span className="font-mono text-[13px] font-bold text-[#e2e8f8] mt-1 leading-tight">
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
                  <span className="font-mono text-[9px] tracking-[0.25em] text-[#3a4a6a] uppercase">
                    총 자산
                  </span>
                  <span className="font-mono text-[13px] font-bold text-[#e2e8f8] mt-1 leading-tight">
                    {fmtKrw(total)}
                  </span>
                  <span className="font-mono text-[9px] text-[#3a4a6a] mt-0.5">KRW 환산</span>
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
                  activeIdx === i ? "bg-[#111827]" : "hover:bg-[#111827]/60"
                }`}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                {/* 색상 점 */}
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-150"
                  style={{
                    background: entry.color,
                    transform: activeIdx === i ? "scale(1.4)" : "scale(1)",
                    boxShadow: activeIdx === i ? `0 0 6px ${entry.color}80` : "none",
                  }}
                />

                {/* 카테고리명 */}
                <span className="text-[11px] text-[#8392b0] flex-1 truncate font-medium">
                  {entry.label}
                </span>

                {/* 금액 */}
                <span
                  className="font-mono text-[11px] transition-colors duration-150"
                  style={{ color: activeIdx === i ? entry.color : "#e2e8f8" }}
                >
                  {fmtKrw(entry.value)}
                </span>

                {/* 비중 */}
                <span
                  className="font-mono text-[10px] w-11 text-right font-semibold"
                  style={{ color: activeIdx === i ? entry.color : "#3a4a6a" }}
                >
                  {entry.pct.toFixed(1)}%
                </span>
              </div>
            ))}

            {/* 구분선 + 합계 */}
            <div className="mt-1 pt-2 border-t border-[#1a2540] flex items-center justify-between px-2.5">
              <span className="text-[10px] text-[#3a4a6a] uppercase tracking-widest">합계</span>
              <span className="font-mono text-[11px] font-bold text-sky-400">{fmtKrw(total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
