"use client";

import { useState } from "react";
import { useAssetStore, selectRebalanceSummary } from "@/lib/store";
import type { Asset, AssetCategory } from "@/lib/types";
import type { AssetRebalanceResult } from "@/lib/rebalancer";
import { estimateSellTax, fmtTaxAmount, TAX_NOTE } from "@/lib/tax";

// ── 카테고리별 스타일 ──────────────────────────────────────────────────────────

const CAT: Record<AssetCategory, { border: string; badge: string; text: string }> = {
  "미국주식": {
    border: "border-l-sky-400",
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    text: "text-sky-400",
  },
  "Crypto": {
    border: "border-l-orange-400",
    badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    text: "text-orange-400",
  },
  "금현물": {
    border: "border-l-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    text: "text-amber-400",
  },
  "ISA-ETF": {
    border: "border-l-violet-400",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    text: "text-violet-400",
  },
  "주택청약": {
    border: "border-l-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    text: "text-emerald-400",
  },
  "IRP": {
    border: "border-l-slate-400",
    badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    text: "text-slate-400",
  },
};

// ── 포맷 유틸 ─────────────────────────────────────────────────────────────────

function fmtValue(value: number | undefined, currency: string | undefined): string {
  if (value === undefined || value === 0) return "—";
  if (currency === "KRW")
    return "₩" + Math.round(value).toLocaleString("ko-KR");
  return (
    "$" +
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function fmtShares(shares: number, category: AssetCategory): string {
  if (category === "주택청약" || category === "IRP")
    return "₩" + Math.round(shares).toLocaleString("ko-KR");
  if (category === "Crypto")
    return shares.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 8 });
  return shares.toLocaleString("en-US");
}

function deviationStyle(
  pct: number,
  threshold: number
): { text: string; bg: string } {
  const abs = Math.abs(pct);
  if (abs <= threshold * 0.5)
    return { text: "text-emerald-400", bg: "bg-emerald-500/10" };
  if (abs <= threshold)
    return { text: "text-amber-400", bg: "bg-amber-500/10" };
  return { text: "text-rose-400", bg: "bg-rose-500/10" };
}

function statusBadge(
  result: AssetRebalanceResult,
  threshold: number
): { label: string; cls: string } {
  if (result.targetWeight === 0)
    return { label: "미설정", cls: "text-[#8392b0] bg-[#1a2540]" };
  const abs = Math.abs(result.deviationPct);
  if (result.needsRebalancing) {
    const isBuy = result.rebalanceAmount > 0;
    return isBuy
      ? { label: "매수 필요", cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" }
      : { label: "매도 필요", cls: "text-rose-400 bg-rose-500/10 border border-rose-500/20" };
  }
  if (abs > threshold * 0.5)
    return { label: "주의", cls: "text-amber-400 bg-amber-500/10 border border-amber-500/20" };
  return { label: "정상", cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" };
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AssetTable() {
  const { assets, thresholdPct, updateShares, updateAsset, removeAsset, exchangeRate } = useAssetStore();
  const summary = selectRebalanceSummary(assets, thresholdPct, exchangeRate);
  const resultMap = Object.fromEntries(summary.results.map((r) => [r.id, r]));

  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [editingRatio, setEditingRatio] = useState<{ id: string; value: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number } | null>(null);

  function startEdit(asset: Asset) {
    setEditing({ id: asset.id, value: String(asset.shares) });
    setEditingRatio(null);
  }

  function commitEdit() {
    if (!editing) return;
    const n = Number(editing.value.replace(/,/g, ""));
    if (!isNaN(n) && n >= 0) updateShares(editing.id, n);
    setEditing(null);
  }

  function startEditRatio(asset: Asset) {
    setEditingRatio({ id: asset.id, value: asset.targetRatio > 0 ? String(asset.targetRatio) : "" });
    setEditing(null);
  }

  function commitEditRatio() {
    if (!editingRatio) return;
    const n = parseFloat(editingRatio.value);
    const clamped = isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
    updateAsset(editingRatio.id, { targetRatio: clamped });
    setEditingRatio(null);
  }

  function confirmDelete(id: string) {
    if (deletingId === id) {
      removeAsset(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  }

  // 카테고리 순서로 정렬
  const ORDER: AssetCategory[] = ["미국주식", "Crypto", "금현물", "ISA-ETF", "주택청약", "IRP"];
  const sorted = [...assets].sort(
    (a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category)
  );

  return (
    <div className="rounded-xl border border-[#1a2540] bg-[#0c1121] overflow-hidden animate-fade-in-up">
      {/* 헤더 */}
      <div className="px-5 py-3.5 border-b border-[#1a2540] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#8392b0]">
            보유 자산 목록
          </span>
        </div>
        <span className="font-mono text-xs text-[#3a4a6a]">{assets.length} items</span>
      </div>

      {/* 테이블 래퍼 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1060px]">
          <thead>
            <tr className="border-b border-[#1a2540]">
              {[
                "티커",
                "종목명",
                "카테고리",
                "보유수량",
                "평가금액",
                "현재비중",
                "목표비중",
                "괴리율",
                "리밸런싱",
                "상태",
                "액션",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#3a4a6a] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111827]">
            {sorted.map((asset) => {
              const cat = CAT[asset.category];
              const result = resultMap[asset.id];
              const isEditing = editing?.id === asset.id;
              const isEditingRatio = editingRatio?.id === asset.id;
              const isDeleting = deletingId === asset.id;
              const hasPriceData = asset.currentValue !== undefined;
              const devStyle = result && hasPriceData
                ? deviationStyle(result.deviationPct, thresholdPct)
                : { text: "text-[#3a4a6a]", bg: "" };
              const status = result && hasPriceData
                ? statusBadge(result, thresholdPct)
                : asset.currentValue === undefined
                ? { label: "시세없음", cls: "text-[#3a4a6a] bg-[#0c1121] border border-[#1a2540]" }
                : { label: "—", cls: "text-[#3a4a6a]" };

              return (
                <tr
                  key={asset.id}
                  className={`row-hover border-l-2 ${cat.border} transition-colors ${
                    isDeleting ? "bg-rose-500/5" : ""
                  }`}
                >
                  {/* 티커 */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="font-mono font-semibold text-[#e2e8f8] text-sm">
                      {asset.ticker}
                    </span>
                  </td>

                  {/* 종목명 */}
                  <td className="px-4 py-3.5">
                    <span className="text-[#8392b0] text-xs max-w-[160px] truncate block">
                      {asset.name}
                    </span>
                  </td>

                  {/* 카테고리 */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cat.badge}`}
                    >
                      {asset.category}
                    </span>
                  </td>

                  {/* 보유수량 (인라인 편집) */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={editing.value}
                          onChange={(e) => setEditing({ id: asset.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="w-24 bg-[#111827] border border-sky-500/40 rounded-md px-2 py-1 font-mono text-xs text-[#e2e8f8] focus:outline-none focus:border-sky-400"
                        />
                        <button
                          onClick={commitEdit}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="저장"
                        >
                          <CheckIcon />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-rose-400 hover:text-rose-300 transition-colors"
                          title="취소"
                        >
                          <XIcon />
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-[#e2e8f8]">
                        {fmtShares(asset.shares, asset.category)}
                      </span>
                    )}
                  </td>

                  {/* 평가금액 */}
                  <td className="px-4 py-3.5 text-right">
                    {asset.currentValue && asset.currentValue > 0 ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-mono text-xs text-[#e2e8f8]">
                          {fmtValue(asset.currentValue, asset.currency)}
                        </span>
                        <span className="font-mono text-[10px] text-[#3a4a6a]">
                          {asset.currency === "USD"
                            ? `(₩${Math.round(asset.currentValue * exchangeRate).toLocaleString("ko-KR")})`
                            : `($${(asset.currentValue / exchangeRate).toLocaleString("en-US", { maximumFractionDigits: 0 })})`}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-[#3a4a6a]">—</span>
                    )}
                  </td>

                  {/* 현재비중 */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {result && result.currentWeight > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-[#1a2540] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cat.text.replace("text-", "bg-")}`}
                            style={{ width: `${Math.min(result.currentWeight * 100 * 2, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-[#e2e8f8]">
                          {(result.currentWeight * 100).toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-[#3a4a6a]">—</span>
                    )}
                  </td>

                  {/* 목표비중 (클릭 편집) */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {isEditingRatio ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={editingRatio.value}
                          onChange={(e) =>
                            setEditingRatio({ id: asset.id, value: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Tab") {
                              e.preventDefault();
                              commitEditRatio();
                            }
                            if (e.key === "Escape") setEditingRatio(null);
                          }}
                          onBlur={commitEditRatio}
                          className="w-20 bg-[#111827] border border-violet-500/40 rounded-md px-2 py-1 font-mono text-xs text-[#e2e8f8] focus:outline-none focus:border-violet-400"
                        />
                        <span className="text-[#3a4a6a] text-xs">%</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditRatio(asset)}
                        title="클릭하여 목표비중 입력"
                        className="group flex items-center justify-between gap-2 w-full px-2 py-1 rounded border border-transparent hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                      >
                        {asset.targetRatio > 0 ? (
                          <span className="font-mono text-xs text-[#e2e8f8] group-hover:text-violet-300 transition-colors">
                            {asset.targetRatio.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-[#3a4a6a] group-hover:text-violet-400 transition-colors italic">
                            클릭하여 설정
                          </span>
                        )}
                        <span className="opacity-0 group-hover:opacity-80 transition-opacity text-violet-400 flex-shrink-0">
                          <PencilTinyIcon />
                        </span>
                      </button>
                    )}
                  </td>

                  {/* 괴리율 — 시세 미조회 종목은 표시 안 함 (0원으로 매수 지시 방지) */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {result && asset.targetRatio > 0 && asset.currentValue !== undefined ? (
                      <span
                        className={`inline-block font-mono text-xs px-1.5 py-0.5 rounded ${devStyle.bg} ${devStyle.text}`}
                      >
                        {result.deviationPct >= 0 ? "+" : ""}
                        {result.deviationPct.toFixed(2)}%p
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-[#3a4a6a]">—</span>
                    )}
                  </td>

                  {/* 리밸런싱 — 시세 미조회 종목은 표시 안 함 (0원으로 매수 지시 방지) */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {result && asset.targetRatio > 0 && asset.currentValue !== undefined ? (
                      <RebalanceCell
                        asset={asset}
                        result={result}
                        exchangeRate={exchangeRate}
                        onShowTooltip={(id, x, y) => setTooltip({ id, x, y })}
                        onHideTooltip={() => setTooltip(null)}
                      />
                    ) : (
                      <span className="font-mono text-xs text-[#3a4a6a]">—</span>
                    )}
                  </td>

                  {/* 상태 */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  </td>

                  {/* 액션 */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(asset)}
                          title="수량 수정"
                          className="p-1.5 rounded-md text-[#3a4a6a] hover:text-sky-400 hover:bg-sky-500/10 transition-all"
                        >
                          <PencilIcon />
                        </button>
                      )}
                      <button
                        onClick={() => confirmDelete(asset.id)}
                        title={isDeleting ? "한 번 더 클릭 시 삭제" : "삭제"}
                        className={`p-1.5 rounded-md transition-all ${
                          isDeleting
                            ? "text-rose-400 bg-rose-500/20 animate-pulse"
                            : "text-[#3a4a6a] hover:text-rose-400 hover:bg-rose-500/10"
                        }`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {assets.length === 0 && (
        <div className="py-16 text-center text-[#3a4a6a] text-sm">
          보유 자산이 없습니다. 아래에서 종목을 추가하세요.
        </div>
      )}

      {/* 세금 툴팁 — overflow-x-auto 밖에서 fixed 렌더 */}
      {tooltip && (() => {
        const asset = sorted.find((a) => a.id === tooltip.id);
        const result = asset ? resultMap[asset.id] : null;
        if (!asset || !result || result.rebalanceAmount >= 0) return null;
        const absKrw = Math.abs(result.rebalanceAmount);
        const sellValue = asset.currency === "USD" ? absKrw / exchangeRate : absKrw;
        const tax = estimateSellTax(sellValue, asset.category, asset.currency ?? "KRW");
        return (
          <TaxTooltip
            asset={asset}
            tax={tax}
            x={tooltip.x}
            y={tooltip.y}
            onClose={() => setTooltip(null)}
          />
        );
      })()}
    </div>
  );
}

// ── 리밸런싱 셀 ──────────────────────────────────────────────────────────────

type RebalanceCellProps = {
  asset: Asset;
  result: AssetRebalanceResult;
  exchangeRate: number;
  onShowTooltip: (id: string, x: number, y: number) => void;
  onHideTooltip: () => void;
};

function RebalanceCell({ asset, result, exchangeRate, onShowTooltip, onHideTooltip }: RebalanceCellProps) {
  const isSell = result.rebalanceAmount < 0;
  // rebalanceAmount is KRW-normalized; convert back to asset currency for display
  const absKrw = Math.abs(result.rebalanceAmount);
  const amount = asset.currency === "USD" ? absKrw / exchangeRate : absKrw;
  const amountCurrency = asset.currency ?? "KRW";
  const tax = isSell
    ? estimateSellTax(amount, asset.category, amountCurrency)
    : null;

  const amtDisplay = isSell
    ? `-${fmtValue(amount, amountCurrency)}`
    : `+${fmtValue(amount, amountCurrency)}`;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`font-mono text-xs ${isSell ? "text-rose-400" : "text-emerald-400"}`}>
        {amtDisplay}
      </span>
      {tax && isSell && (
        tax.applicable ? (
          <button
            className="font-mono text-[10px] text-rose-400/70 hover:text-rose-300 transition-colors text-left cursor-help underline decoration-dotted decoration-rose-400/40 underline-offset-2"
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onShowTooltip(asset.id, rect.left, rect.bottom + 6);
            }}
            onMouseLeave={onHideTooltip}
          >
            세금 -{fmtTaxAmount(tax.estimatedTax, tax.currency)}
          </button>
        ) : (
          <span className="font-mono text-[10px] text-violet-400/60">비과세 (ISA)</span>
        )
      )}
    </div>
  );
}

// ── 세금 툴팁 ─────────────────────────────────────────────────────────────────

type TaxTooltipProps = {
  asset: Asset;
  tax: ReturnType<typeof estimateSellTax>;
  x: number;
  y: number;
  onClose: () => void;
};

function TaxTooltip({ asset, tax, x, y }: TaxTooltipProps) {
  const rows: { label: string; value: string; cls?: string }[] = [
    {
      label: "매도 예상",
      value: fmtTaxAmount(tax.sellValue, tax.currency),
      cls: "text-[#e2e8f8]",
    },
    {
      label: "연간 공제 한도",
      value: fmtTaxAmount(tax.deductionLimit, tax.currency),
      cls: "text-emerald-400",
    },
    {
      label: "과세 표준",
      value: fmtTaxAmount(tax.taxableGain, tax.currency),
      cls: "text-amber-400",
    },
    {
      label: `예상 세금 (${(tax.taxRate * 100).toFixed(0)}%)`,
      value: `-${fmtTaxAmount(tax.estimatedTax, tax.currency)}`,
      cls: "text-rose-400 font-semibold",
    },
    {
      label: "공제 잔여액",
      value: fmtTaxAmount(tax.deductionRemaining, tax.currency),
      cls: tax.deductionRemaining > 0 ? "text-emerald-400" : "text-[#3a4a6a]",
    },
  ];

  return (
    <div
      className="fixed z-50 bg-[#070b12] border border-[#1a2540] rounded-xl shadow-2xl p-4 min-w-[230px] pointer-events-none"
      style={{ left: Math.min(x, window.innerWidth - 250), top: y }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3a4a6a] mb-3">
        {asset.ticker} 세금 간이 추정
      </p>
      <div className="space-y-1.5 mb-3">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between items-center gap-6">
            <span className="text-[#8392b0] text-[11px]">{row.label}</span>
            <span className={`font-mono text-[11px] ${row.cls ?? "text-[#e2e8f8]"}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-[#1a2540] pt-2.5">
        <p className="text-[#3a4a6a] text-[10px] leading-relaxed whitespace-pre-line">
          {TAX_NOTE[asset.category]}
        </p>
      </div>
    </div>
  );
}

// ── 아이콘 ────────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function PencilTinyIcon() {
  return (
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
        d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
