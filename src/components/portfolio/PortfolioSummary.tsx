"use client";

import { useAssetStore, selectRebalanceSummary, selectTotalTargetRatio } from "@/lib/store";

type Props = {
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
};

export default function PortfolioSummary({ onRefresh, loading, error, lastUpdated }: Props) {
  const { assets, thresholdPct, rebalanceAlert, setThreshold, exchangeRate } = useAssetStore();
  const summary = selectRebalanceSummary(assets, thresholdPct, exchangeRate);
  const alertCount = summary.results.filter((r) => r.needsRebalancing).length;
  const totalTargetPct = selectTotalTargetRatio(assets);

  // ── 통화별 자산 합계 ──────────────────────────────────────────────────────────
  const totalKrw = assets
    .filter((a) => a.currency === "KRW")
    .reduce((s, a) => s + (a.currentValue ?? 0), 0);
  const totalUsd = assets
    .filter((a) => a.currency === "USD")
    .reduce((s, a) => s + (a.currentValue ?? 0), 0);
  const hasAnyValue = totalKrw > 0 || totalUsd > 0;

  // ── 통합 환산 총액 ────────────────────────────────────────────────────────────
  // USD → KRW 환산 포함 전체 합계 (exchangeRate = 0 방어)
  const rate = exchangeRate > 0 ? exchangeRate : 1_400;
  const totalKrwCombined = totalKrw + totalUsd * rate;
  const totalUsdCombined = totalUsd + totalKrw / rate;

  // ── 목표 배분 상태 ────────────────────────────────────────────────────────────
  const targetPctStatus =
    Math.abs(totalTargetPct - 100) < 0.01
      ? ("ok" as const)
      : totalTargetPct > 100
      ? ("over" as const)
      : totalTargetPct === 0
      ? ("none" as const)
      : ("under" as const);

  const targetPctColor = {
    ok: "text-emerald-400",
    over: "text-rose-400",
    under: "text-amber-400",
    none: "text-[#3a4a6a]",
  }[targetPctStatus];

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ── 상단 타이틀 줄 ───────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-sky-400 uppercase mb-1">
            Portfolio Overview
          </p>
          <h1 className="text-2xl font-bold text-[#e2e8f8] tracking-tight">포트폴리오</h1>
        </div>

        {/* 시세 갱신 버튼 */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1a2540] bg-[#0c1121] text-xs font-semibold text-[#8392b0] hover:border-sky-500/40 hover:text-sky-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {loading ? "조회 중…" : "시세 갱신"}
        </button>
      </div>

      {/* ── 에러 배너 ─────────────────────────────────── */}
      {error && (
        <div className="px-4 py-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* ── 리밸런싱 알림 배너 ────────────────────────── */}
      {rebalanceAlert && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-dot flex-shrink-0" />
          <p className="text-amber-400 text-xs font-semibold">
            {alertCount}개 종목이 ±{thresholdPct}%p 임계치를 초과했습니다. 리밸런싱이 필요합니다.
          </p>
        </div>
      )}

      {/* ── 스탯 카드 4개 ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 통합 총액 KRW */}
        <StatCard
          label="전체 자산 총액 (KRW)"
          value={hasAnyValue ? fmtKrw(totalKrwCombined) : "—"}
          sub="전체 자산 통합 환산"
          accent="sky"
          detail={
            hasAnyValue
              ? `KRW ${fmtKrw(totalKrw)}  +  USD $${fmtUsdShort(totalUsd)} × ${Math.round(rate).toLocaleString("ko-KR")}`
              : undefined
          }
        />

        {/* 통합 총액 USD */}
        <StatCard
          label="전체 자산 총액 (USD)"
          value={hasAnyValue ? `$${fmtUsd(totalUsdCombined)}` : "—"}
          sub="전체 자산 통합 환산"
          accent="sky"
          detail={
            hasAnyValue
              ? `USD $${fmtUsdShort(totalUsd)}  +  KRW ${fmtKrw(totalKrw)} ÷ ${Math.round(rate).toLocaleString("ko-KR")}`
              : undefined
          }
        />

        {/* 리밸런싱 필요 */}
        <StatCard
          label="리밸런싱 필요"
          value={String(alertCount)}
          sub={alertCount > 0 ? `±${thresholdPct}%p 임계치 초과` : "모든 종목 정상"}
          accent={alertCount > 0 ? "amber" : "emerald"}
          dot={alertCount > 0}
        />

        {/* 임계치 설정 */}
        <div className="rounded-xl border border-[#1a2540] bg-[#0c1121] p-4 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-[#8392b0] font-semibold">
            알림 임계치
          </p>
          <div className="flex items-center gap-2 mt-auto">
            <input
              type="range"
              min={1}
              max={10}
              value={thresholdPct}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="flex-1 accent-sky-400 h-1.5"
            />
            <span className="font-mono text-base font-bold text-sky-400 w-10 text-right">
              {thresholdPct}%p
            </span>
          </div>
          <p className="text-[10px] text-[#3a4a6a]">이탈 시 리밸런싱 알림 기준</p>
        </div>
      </div>

      {/* ── 종목 현황 메타 바 ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-[#1a2540] bg-[#0c1121]/50">
        <div className="flex flex-wrap items-center gap-5 text-[11px]">
          <span className="text-[#3a4a6a]">
            보유 종목{" "}
            <span className="font-mono text-[#8392b0] font-semibold">{assets.length}개</span>
          </span>

          <span className="text-[#1a2540]">|</span>

          <span className="flex items-center gap-1.5 text-[#3a4a6a]">
            적용 환율
            <span className="font-mono font-bold text-[#8392b0]">
              ₩{Math.round(rate).toLocaleString("ko-KR")}
            </span>
            <span className="text-[#3a4a6a]">/ $1</span>
            {exchangeRate > 0 && (
              <span className="text-emerald-400/60 text-[10px]">실시간</span>
            )}
          </span>

          <span className="text-[#1a2540]">|</span>

          <span className="flex items-center gap-1.5 text-[#3a4a6a]">
            목표 배분
            <span className={`font-mono font-bold ${targetPctColor}`}>
              {totalTargetPct.toFixed(1)}%
            </span>
            {targetPctStatus === "ok" && <span className="text-emerald-400/60">✓</span>}
            {targetPctStatus === "over" && (
              <span className="text-rose-400 text-[10px]">초과 {(totalTargetPct - 100).toFixed(1)}%p</span>
            )}
            {targetPctStatus === "under" && totalTargetPct > 0 && (
              <span className="text-amber-400 text-[10px]">{(100 - totalTargetPct).toFixed(1)}%p 미배분</span>
            )}
          </span>
        </div>

        <span className="font-mono text-[10px] text-[#3a4a6a]">
          {lastUpdated
            ? `${lastUpdated.toLocaleString("ko-KR", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })} 기준`
            : "시세 미조회 — 갱신 버튼을 눌러주세요"}
        </span>
      </div>
    </div>
  );
}

// ── 포맷 유틸 ─────────────────────────────────────────────────────────────────

function fmtKrw(v: number): string {
  if (v >= 1_000_000_000_000) return `₩${(v / 1_000_000_000_000).toFixed(2)}조`;
  if (v >= 100_000_000)       return `₩${(v / 100_000_000).toFixed(2)}억`;
  if (v >= 10_000_000)        return `₩${(v / 10_000_000).toFixed(1)}천만`;
  if (v >= 1_000_000)         return `₩${(v / 1_000_000).toFixed(1)}백만`;
  return `₩${Math.round(v).toLocaleString("ko-KR")}`;
}

function fmtUsd(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtUsdShort(v: number): string {
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  dot,
  detail,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "sky" | "emerald" | "amber" | "rose";
  dot?: boolean;
  detail?: string;
}) {
  const accentColor = {
    sky: "text-sky-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  }[accent];

  return (
    <div className="rounded-xl border border-[#1a2540] bg-[#0c1121] p-4 flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-widest text-[#8392b0] font-semibold">{label}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {dot && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-dot flex-shrink-0" />
        )}
        <span className={`font-mono text-xl font-bold ${accentColor} leading-none`}>{value}</span>
      </div>
      <p className="text-[11px] text-sky-400/60">{sub}</p>
      {detail && (
        <p className="font-mono text-[9px] text-[#3a4a6a] leading-relaxed mt-0.5 break-all">{detail}</p>
      )}
    </div>
  );
}
