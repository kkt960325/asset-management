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

  const totalKrw = assets.filter((a) => a.currency === "KRW").reduce((s, a) => s + (a.currentValue ?? 0), 0);
  const totalUsd = assets.filter((a) => a.currency === "USD").reduce((s, a) => s + (a.currentValue ?? 0), 0);
  const hasAnyValue = totalKrw > 0 || totalUsd > 0;

  const rate = exchangeRate > 0 ? exchangeRate : 1_400;
  const totalKrwCombined = totalKrw + totalUsd * rate;
  const totalUsdCombined = totalUsd + totalKrw / rate;

  const targetPctStatus =
    Math.abs(totalTargetPct - 100) < 0.01 ? ("ok" as const)
    : totalTargetPct > 100              ? ("over" as const)
    : totalTargetPct === 0              ? ("none" as const)
    :                                     ("under" as const);

  const targetPctAccent =
    targetPctStatus === "ok"    ? "cyan"
    : targetPctStatus === "over" ? "red"
    : targetPctStatus === "none" ? "cyan"
    : "amber";

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <p
            className="font-display text-[10px] tracking-[0.45em] uppercase mb-1"
            style={{ color: "rgba(0,212,255,0.4)" }}
          >
            // FINANCIAL INTELLIGENCE SYSTEM
          </p>
          <h1
            className="font-display text-2xl font-bold tracking-[0.08em] uppercase"
            style={{ color: "#b8e0f0", textShadow: "0 0 20px rgba(0,212,255,0.12)" }}
          >
            PORTFOLIO
          </h1>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="group relative flex items-center gap-2 px-4 py-2 font-display text-[11px] tracking-[0.25em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
          style={{
            border: "1px solid rgba(0,212,255,0.2)",
            color: "rgba(0,212,255,0.6)",
            background: "rgba(0,212,255,0.02)",
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "rgba(0,212,255,0.06)" }}
          />
          <svg className={`relative z-10 w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="relative z-10">{loading ? "SCANNING…" : "REFRESH SYSTEMS"}</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="px-4 py-2.5 text-xs font-mono"
          style={{ border: "1px solid rgba(255,34,68,0.3)", background: "rgba(255,34,68,0.06)", color: "#ff2244" }}
        >
          [ERR] {error}
        </div>
      )}

      {/* Rebalance alert */}
      {rebalanceAlert && (
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ border: "1px solid rgba(255,102,0,0.25)", background: "rgba(255,102,0,0.06)" }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse-dot"
            style={{ background: "#ff6600", boxShadow: "0 0 6px rgba(255,102,0,0.8)" }}
          />
          <p className="font-display text-xs tracking-wider uppercase" style={{ color: "#ff6600" }}>
            [ALERT] {alertCount} ASSET{alertCount !== 1 ? "S" : ""} EXCEED ±{thresholdPct}%p THRESHOLD — REBALANCING REQUIRED
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="TOTAL ASSETS (KRW)" accent="cyan"
          value={loading ? "SCANNING…" : fmtKrw(totalKrwCombined)}
          sub={loading ? "fetching prices" : "전체 자산 통합 환산"}
          detail={!loading && hasAnyValue
            ? `KRW ${fmtKrw(totalKrw)} + USD $${fmtUsdShort(totalUsd)} × ${Math.round(rate).toLocaleString("ko-KR")}`
            : !loading && !hasAnyValue ? "시세 갱신 후 표시됩니다" : undefined}
        />

        <StatCard label="TOTAL ASSETS (USD)" accent="cyan"
          value={loading ? "SCANNING…" : `$${fmtUsd(totalUsdCombined)}`}
          sub={loading ? "fetching prices" : "전체 자산 통합 환산"}
          detail={!loading && hasAnyValue
            ? `USD $${fmtUsdShort(totalUsd)} + KRW ${fmtKrw(totalKrw)} ÷ ${Math.round(rate).toLocaleString("ko-KR")}`
            : !loading && !hasAnyValue ? "시세 갱신 후 표시됩니다" : undefined}
        />

        <StatCard label="REBALANCE NEEDED" accent={alertCount > 0 ? "orange" : "cyan"}
          value={String(alertCount)}
          sub={alertCount > 0 ? `±${thresholdPct}%p 임계치 초과` : "ALL SYSTEMS NOMINAL"}
          dot={alertCount > 0}
        />

        <StatCard label="TARGET ALLOCATION" accent={targetPctAccent as "cyan" | "orange" | "red" | "amber"}
          value={`${totalTargetPct.toFixed(1)}%`}
          sub={
            targetPctStatus === "ok"    ? "100% ALLOCATED"
            : targetPctStatus === "over"  ? `EXCEEDS BY ${(totalTargetPct - 100).toFixed(1)}%p`
            : totalTargetPct === 0        ? "UNSET"
            : `${(100 - totalTargetPct).toFixed(1)}%p UNALLOCATED`
          }
        />

        {/* Threshold control */}
        <div
          className="relative group overflow-hidden h-full p-4 flex flex-col gap-2 transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(0,12,24,0.96) 0%, rgba(0,7,16,0.99) 100%)",
            border: "1px solid rgba(0,212,255,0.12)",
          }}
        >
          <div className="absolute top-0 left-0 w-3 h-3" style={{ borderTop: "1px solid rgba(0,212,255,0.5)", borderLeft: "1px solid rgba(0,212,255,0.5)" }} />
          <div className="absolute top-0 right-0 w-3 h-3" style={{ borderTop: "1px solid rgba(0,212,255,0.5)", borderRight: "1px solid rgba(0,212,255,0.5)" }} />
          <div className="absolute bottom-0 left-0 w-3 h-3" style={{ borderBottom: "1px solid rgba(0,212,255,0.5)", borderLeft: "1px solid rgba(0,212,255,0.5)" }} />
          <div className="absolute bottom-0 right-0 w-3 h-3" style={{ borderBottom: "1px solid rgba(0,212,255,0.5)", borderRight: "1px solid rgba(0,212,255,0.5)" }} />

          <p className="font-display text-[9px] uppercase tracking-[0.3em]" style={{ color: "rgba(0,212,255,0.35)" }}>
            ALERT THRESHOLD
          </p>
          <div className="flex items-center gap-2 mt-auto">
            <input
              type="range" min={1} max={10}
              value={thresholdPct}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="flex-1 h-1"
              style={{ accentColor: "#00d4ff" }}
            />
            <span
              className="font-mono text-base font-bold w-10 text-right"
              style={{ color: "#00d4ff", textShadow: "0 0 10px rgba(0,212,255,0.7)" }}
            >
              {thresholdPct}%p
            </span>
          </div>
          <p className="font-mono text-[9px]" style={{ color: "rgba(0,212,255,0.2)" }}>
            DEVIATION TRIGGER
          </p>
        </div>
      </div>

      {/* System status bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
        style={{ border: "1px solid rgba(0,212,255,0.08)", background: "rgba(0,212,255,0.02)" }}
      >
        <div className="flex flex-wrap items-center gap-5 font-mono text-[10px]">
          <span style={{ color: "rgba(0,212,255,0.35)" }}>
            ASSETS{" "}
            <span style={{ color: "#00d4ff" }}>{assets.length}</span>
          </span>

          <span style={{ color: "rgba(0,212,255,0.15)" }}>|</span>

          <span style={{ color: "rgba(0,212,255,0.35)" }}>
            FX RATE{" "}
            <span style={{ color: "#b8e0f0" }}>₩{Math.round(rate).toLocaleString("ko-KR")}</span>
            {" "}/ $1
            {exchangeRate > 0 && (
              <span style={{ color: "rgba(0,212,255,0.5)", marginLeft: "6px" }}>LIVE</span>
            )}
          </span>

          <span style={{ color: "rgba(0,212,255,0.15)" }}>|</span>

          <span style={{ color: "rgba(0,212,255,0.35)" }}>
            ALLOCATION{" "}
            <span style={{
              color: targetPctStatus === "ok" ? "#00d4ff"
                : targetPctStatus === "over" ? "#ff2244"
                : targetPctStatus === "none" ? "rgba(0,212,255,0.3)"
                : "#ffaa00",
              textShadow: targetPctStatus === "ok" ? "0 0 8px rgba(0,212,255,0.6)" : undefined,
            }}>
              {totalTargetPct.toFixed(1)}%
            </span>
            {targetPctStatus === "ok" && <span style={{ color: "rgba(0,212,255,0.5)", marginLeft: "6px" }}>✓</span>}
          </span>
        </div>

        <span className="font-mono text-[9px]" style={{ color: "rgba(0,212,255,0.2)" }}>
          {lastUpdated
            ? `LAST UPDATE: ${lastUpdated.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`
            : "AWAITING PRICE FETCH"}
        </span>
      </div>
    </div>
  );
}

// ── Format utils ──────────────────────────────────────────────────────────────

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
  accent: "cyan" | "orange" | "amber" | "red";
  dot?: boolean;
  detail?: string;
}) {
  const map = {
    cyan:   { color: "#00d4ff", rgb: "0,212,255",   glow: "rgba(0,212,255,0.7)",   border: "rgba(0,212,255,0.12)"   },
    orange: { color: "#ff6600", rgb: "255,102,0",   glow: "rgba(255,102,0,0.7)",   border: "rgba(255,102,0,0.12)"   },
    amber:  { color: "#ffaa00", rgb: "255,170,0",   glow: "rgba(255,170,0,0.7)",   border: "rgba(255,170,0,0.12)"   },
    red:    { color: "#ff2244", rgb: "255,34,68",   glow: "rgba(255,34,68,0.7)",   border: "rgba(255,34,68,0.12)"   },
  }[accent];

  return (
    <div
      className="group relative overflow-hidden h-full p-4 flex flex-col gap-1.5 transition-all duration-300 cursor-default"
      style={{
        background: "linear-gradient(135deg, rgba(0,12,24,0.96) 0%, rgba(0,7,16,0.99) 100%)",
        border: `1px solid ${map.border}`,
        boxShadow: "0 4px 24px rgba(0,0,8,0.8)",
      }}
    >
      {/* Corners */}
      <div className="absolute top-0 left-0 w-3 h-3" style={{ borderTop: `1px solid rgba(${map.rgb},0.5)`, borderLeft: `1px solid rgba(${map.rgb},0.5)` }} />
      <div className="absolute top-0 right-0 w-3 h-3" style={{ borderTop: `1px solid rgba(${map.rgb},0.5)`, borderRight: `1px solid rgba(${map.rgb},0.5)` }} />
      <div className="absolute bottom-0 left-0 w-3 h-3" style={{ borderBottom: `1px solid rgba(${map.rgb},0.5)`, borderLeft: `1px solid rgba(${map.rgb},0.5)` }} />
      <div className="absolute bottom-0 right-0 w-3 h-3" style={{ borderBottom: `1px solid rgba(${map.rgb},0.5)`, borderRight: `1px solid rgba(${map.rgb},0.5)` }} />

      {/* Hover inner glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `inset 0 0 30px rgba(${map.rgb},0.06)` }}
      />

      <p className="font-display text-[9px] uppercase tracking-[0.3em]" style={{ color: `rgba(${map.rgb},0.35)` }}>
        {label}
      </p>

      <div className="flex items-center gap-2 mt-1">
        {dot && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse-dot"
            style={{ background: "#ff6600", boxShadow: "0 0 6px rgba(255,102,0,0.8)" }}
          />
        )}
        <span
          className="font-mono text-xl font-bold leading-none animate-data-flicker"
          style={{ color: map.color, textShadow: `0 0 10px ${map.glow}` }}
        >
          {value}
        </span>
      </div>

      <p className="font-sans text-[11px]" style={{ color: `rgba(${map.rgb},0.45)` }}>
        {sub}
      </p>

      {detail && (
        <p className="font-mono text-[9px] leading-relaxed mt-0.5 break-all" style={{ color: "rgba(0,212,255,0.18)" }}>
          {detail}
        </p>
      )}
    </div>
  );
}
