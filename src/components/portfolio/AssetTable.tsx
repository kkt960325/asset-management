"use client";

import { useState } from "react";
import { useAssetStore, selectRebalanceSummary } from "@/lib/store";
import type { Asset, AssetCategory } from "@/lib/types";
import { MANUAL_CATEGORIES } from "@/lib/types";
import type { AssetRebalanceResult } from "@/lib/rebalancer";
import { estimateSellTax, fmtTaxAmount, TAX_NOTE } from "@/lib/tax";
import { AssetIcon } from "@/components/ui/AssetIcon";

// ── Category styles ───────────────────────────────────────────────────────────

const CAT: Record<AssetCategory, { borderColor: string; color: string }> = {
  "미국주식": { borderColor: "#00d4ff", color: "#00d4ff" },
  "한국주식": { borderColor: "#00ff88", color: "#00ff88" },
  "해외주식": { borderColor: "#4488ff", color: "#4488ff" },
  "국내ETF":  { borderColor: "#00ccaa", color: "#00ccaa" },
  "해외ETF":  { borderColor: "#2266ff", color: "#2266ff" },
  "채권":     { borderColor: "#6699bb", color: "#6699bb" },
  "Crypto":   { borderColor: "#ffaa00", color: "#ffaa00" },
  "KRX금현물":{ borderColor: "#ff8800", color: "#ff8800" },
  "금/원자재":{ borderColor: "#ffcc00", color: "#ffcc00" },
  "부동산":   { borderColor: "#ff4466", color: "#ff4466" },
  "현금/예금":{ borderColor: "#aa88ff", color: "#aa88ff" },
  "연금/퇴직":{ borderColor: "#ff6600", color: "#ff6600" },
  "보험/기타":{ borderColor: "#ff44aa", color: "#ff44aa" },
};

// ── Format utils ──────────────────────────────────────────────────────────────

function fmtValue(value: number | undefined, currency: string | undefined): string {
  if (value === undefined || value === 0) return "—";
  if (currency === "KRW") return "₩" + Math.round(value).toLocaleString("ko-KR");
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShares(shares: number, category: AssetCategory): string {
  if (MANUAL_CATEGORIES.has(category)) return "—";
  if (category === "Crypto")
    return shares.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 8 });
  if (category === "금/원자재" || category === "KRX금현물")
    return shares.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 }) + " g";
  return shares.toLocaleString("en-US");
}

function deviationStyle(pct: number, threshold: number): { color: string; bg: string } {
  const abs = Math.abs(pct);
  if (abs <= threshold * 0.5) return { color: "#00ff88", bg: "rgba(0,255,136,0.08)" };
  if (abs <= threshold)       return { color: "#ffaa00", bg: "rgba(255,170,0,0.08)" };
  return                             { color: "#ff2244", bg: "rgba(255,34,68,0.08)" };
}

function statusBadge(result: AssetRebalanceResult, threshold: number): { label: string; color: string; bg: string; border: string } {
  if (result.targetWeight === 0)
    return { label: "UNSET",  color: "rgba(0,212,255,0.3)", bg: "rgba(0,212,255,0.04)", border: "transparent" };
  const abs = Math.abs(result.deviationPct);
  if (result.needsRebalancing) {
    return result.rebalanceAmount > 0
      ? { label: "BUY",  color: "#00d4ff", bg: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.25)" }
      : { label: "SELL", color: "#ff2244", bg: "rgba(255,34,68,0.08)", border: "rgba(255,34,68,0.25)" };
  }
  if (abs > threshold * 0.5)
    return { label: "WATCH", color: "#ffaa00", bg: "rgba(255,170,0,0.08)", border: "rgba(255,170,0,0.25)" };
  return   { label: "OK",   color: "#00ff88", bg: "rgba(0,255,136,0.08)", border: "rgba(0,255,136,0.2)" };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssetTable({ loading = false }: { loading?: boolean }) {
  const { assets, thresholdPct, updateShares, updateAsset, removeAsset, updateManualValue, exchangeRate } =
    useAssetStore();
  const summary = selectRebalanceSummary(assets, thresholdPct, exchangeRate);
  const resultMap = Object.fromEntries(summary.results.map((r) => [r.id, r]));

  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [editingRatio, setEditingRatio] = useState<{ id: string; value: string } | null>(null);
  const [editingManual, setEditingManual] = useState<{ id: string; value: string } | null>(null);
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
    setEditingManual(null);
  }
  function startEditManual(asset: Asset) {
    setEditingManual({ id: asset.id, value: String(asset.manualValue ?? asset.currentValue ?? 0) });
    setEditing(null);
    setEditingRatio(null);
  }
  function commitEditManual() {
    if (!editingManual) return;
    const n = Number(editingManual.value.replace(/[,₩\s]/g, ""));
    if (!isNaN(n) && n >= 0) updateManualValue(editingManual.id, n);
    setEditingManual(null);
  }
  function commitEditRatio() {
    if (!editingRatio) return;
    const n = parseFloat(editingRatio.value);
    const clamped = isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
    updateAsset(editingRatio.id, { targetRatio: clamped });
    setEditingRatio(null);
  }
  function confirmDelete(id: string) {
    if (deletingId === id) { removeAsset(id); setDeletingId(null); }
    else { setDeletingId(id); setTimeout(() => setDeletingId(null), 3000); }
  }

  const ORDER: AssetCategory[] = [
    "미국주식", "한국주식", "해외주식", "국내ETF", "해외ETF",
    "채권", "Crypto", "KRX금현물", "금/원자재", "부동산", "현금/예금", "연금/퇴직", "보험/기타",
  ];
  const sorted = [...assets].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));

  const inputStyle: React.CSSProperties = {
    background: "rgba(0,8,18,0.9)",
    border: "1px solid rgba(0,212,255,0.3)",
    color: "#b8e0f0",
    fontFamily: "var(--font-mono)",
    outline: "none",
  };

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
      <div className="absolute top-0 inset-x-0 h-px z-10"
        style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)" }} />
      {/* Scan line */}
      <div className="absolute inset-x-0 h-px z-10 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)",
          animation: "hud-scan 8s linear infinite",
          top: "-2px",
        }}
      />
      {/* Corners */}
      <div className="absolute top-0 left-0 w-3 h-3 z-10" style={{ borderTop: "1px solid rgba(0,212,255,0.5)", borderLeft: "1px solid rgba(0,212,255,0.5)" }} />
      <div className="absolute top-0 right-0 w-3 h-3 z-10" style={{ borderTop: "1px solid rgba(0,212,255,0.5)", borderRight: "1px solid rgba(0,212,255,0.5)" }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 z-10" style={{ borderBottom: "1px solid rgba(0,212,255,0.5)", borderLeft: "1px solid rgba(0,212,255,0.5)" }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 z-10" style={{ borderBottom: "1px solid rgba(0,212,255,0.5)", borderRight: "1px solid rgba(0,212,255,0.5)" }} />

      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00d4ff", boxShadow: "0 0 6px #00d4ff" }} />
          <span className="font-display text-[10px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.45)" }}>
            ASSET REGISTRY
          </span>
        </div>
        <span className="font-mono text-[9px]" style={{ color: "rgba(0,212,255,0.2)" }}>
          {assets.length} RECORDS
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1060px]">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
              {["TICKER", "NAME", "CATEGORY", "QTY", "VALUE", "WEIGHT", "TARGET", "DEVIATION", "REBALANCE", "STATUS", "ACTION"].map((h) => (
                <th key={h} className="px-4 py-3 text-left whitespace-nowrap">
                  <span className="font-display text-[9px] tracking-[0.3em] uppercase" style={{ color: "rgba(0,212,255,0.28)" }}>
                    {h}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((asset) => {
              const cat = CAT[asset.category];
              const result = resultMap[asset.id];
              const isEditing = editing?.id === asset.id;
              const isEditingRatio = editingRatio?.id === asset.id;
              const isDeleting = deletingId === asset.id;
              const isFixedAsset = MANUAL_CATEGORIES.has(asset.category);
              const isEditingManualThis = editingManual?.id === asset.id;
              const hasPriceData = asset.currentValue !== undefined;
              const devStyle = result && hasPriceData && !isFixedAsset
                ? deviationStyle(result.deviationPct, thresholdPct)
                : { color: "rgba(0,212,255,0.2)", bg: "" };
              const status = isFixedAsset
                ? { label: "FIXED", color: "#00ccaa", bg: "rgba(0,204,170,0.08)", border: "rgba(0,204,170,0.25)" }
                : result && hasPriceData
                ? statusBadge(result, thresholdPct)
                : { label: "—", color: "rgba(0,212,255,0.2)", bg: "", border: "transparent" };

              return (
                <tr
                  key={asset.id}
                  className="row-hover transition-colors"
                  style={{
                    borderBottom: "1px solid rgba(0,212,255,0.05)",
                    borderLeft: `2px solid ${cat.borderColor}`,
                    background: isDeleting ? "rgba(255,34,68,0.04)" : undefined,
                  }}
                >
                  {/* Ticker */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <AssetIcon ticker={asset.ticker} category={asset.category} size={24} />
                      <span className="font-mono font-bold text-sm" style={{ color: cat.color }}>
                        {asset.ticker}
                      </span>
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs max-w-[160px] truncate block" style={{ color: "rgba(184,224,240,0.55)" }}>
                      {asset.name}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className="inline-block px-2 py-0.5 font-display text-[9px] tracking-[0.15em] uppercase"
                      style={{
                        color: cat.color,
                        border: `1px solid ${cat.color}33`,
                        background: `${cat.color}0d`,
                      }}
                    >
                      {asset.category}
                    </span>
                  </td>

                  {/* Quantity */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus type="text"
                          value={editing.value}
                          onChange={(e) => setEditing({ id: asset.id, value: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                          className="w-24 px-2 py-1 text-xs"
                          style={inputStyle}
                        />
                        <button onClick={commitEdit} style={{ color: "#00ff88" }}><CheckIcon /></button>
                        <button onClick={() => setEditing(null)} style={{ color: "#ff2244" }}><XIcon /></button>
                      </div>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: "#b8e0f0" }}>
                        {fmtShares(asset.shares, asset.category)}
                      </span>
                    )}
                  </td>

                  {/* Value */}
                  <td className="px-4 py-3.5 text-right">
                    {isFixedAsset ? (
                      isEditingManualThis ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            autoFocus type="text" inputMode="numeric"
                            value={editingManual!.value}
                            onChange={(e) => setEditingManual({ id: asset.id, value: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") commitEditManual(); if (e.key === "Escape") setEditingManual(null); }}
                            onBlur={commitEditManual}
                            className="w-36 px-2 py-1 text-xs text-right"
                            style={{ ...inputStyle, border: "1px solid rgba(0,204,170,0.35)", color: "#00ccaa" }}
                          />
                        </div>
                      ) : (
                        <button onClick={() => startEditManual(asset)} title="클릭하여 금액 수정"
                          className="group flex flex-col items-end gap-0.5 w-full">
                          <span className="font-mono text-xs group-hover:text-[#00ccaa] transition-colors" style={{ color: "#b8e0f0" }}>
                            {asset.currentValue !== undefined && asset.currentValue > 0
                              ? `₩${Math.round(asset.currentValue).toLocaleString("ko-KR")}`
                              : "—"}
                          </span>
                          <span className="font-mono text-[9px] italic" style={{ color: "rgba(0,204,170,0.35)" }}>
                            ✎ EDIT
                          </span>
                        </button>
                      )
                    ) : (asset.currentValue !== undefined && !isNaN(asset.currentValue) && asset.currentValue > 0) ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-mono text-xs" style={{ color: "#b8e0f0" }}>
                          {fmtValue(asset.currentValue, asset.currency)}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: "rgba(0,212,255,0.3)" }}>
                          {asset.currency === "USD"
                            ? `(₩${Math.round(asset.currentValue * exchangeRate).toLocaleString("ko-KR")})`
                            : `($${(asset.currentValue / exchangeRate).toLocaleString("en-US", { maximumFractionDigits: 0 })})`}
                        </span>
                      </div>
                    ) : (asset.currentValue !== undefined && isNaN(asset.currentValue)) ? (
                      // Price was received but parseFloat() failed — visible parse error
                      <span
                        className="font-mono text-xs font-bold"
                        style={{ color: "#ff2244" }}
                        title="가격 파싱 오류 — 콘솔에서 debugAssets()로 진단"
                      >
                        ERR
                      </span>
                    ) : loading ? (
                      // Skeleton shimmer while fetching
                      <div className="flex flex-col items-end gap-1">
                        <div className="h-3 w-20 rounded-sm animate-pulse"
                          style={{ background: "rgba(0,212,255,0.08)" }} />
                        <div className="h-2.5 w-14 rounded-sm animate-pulse"
                          style={{ background: "rgba(0,212,255,0.05)", animationDelay: "150ms" }} />
                      </div>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: "rgba(0,212,255,0.2)" }}>
                        —
                      </span>
                    )}
                  </td>

                  {/* Current weight */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {result && result.currentWeight > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(0,212,255,0.1)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(result.currentWeight * 100 * 2, 100)}%`,
                              background: cat.color,
                              boxShadow: `0 0 4px ${cat.color}`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs" style={{ color: "#b8e0f0" }}>
                          {(result.currentWeight * 100).toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: "rgba(0,212,255,0.2)" }}>—</span>
                    )}
                  </td>

                  {/* Target ratio */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {isEditingRatio ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus type="number" min={0} max={100} step={0.1}
                          value={editingRatio.value}
                          onChange={(e) => setEditingRatio({ id: asset.id, value: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); commitEditRatio(); } if (e.key === "Escape") setEditingRatio(null); }}
                          onBlur={commitEditRatio}
                          className="w-20 px-2 py-1 text-xs"
                          style={{ ...inputStyle, border: "1px solid rgba(170,136,255,0.4)" }}
                        />
                        <span className="font-mono text-xs" style={{ color: "rgba(0,212,255,0.3)" }}>%</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditRatio(asset)}
                        title="클릭하여 목표비중 입력"
                        className="group flex items-center justify-between gap-2 w-full px-2 py-1 transition-all"
                        style={{ border: "1px solid transparent" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.border = "1px solid rgba(170,136,255,0.25)";
                          (e.currentTarget as HTMLElement).style.background = "rgba(170,136,255,0.05)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        {asset.targetRatio > 0 ? (
                          <span className="font-mono text-xs" style={{ color: "#b8e0f0" }}>
                            {asset.targetRatio.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="font-mono text-xs italic" style={{ color: "rgba(0,212,255,0.2)" }}>
                            SET TARGET
                          </span>
                        )}
                        <span className="opacity-0 group-hover:opacity-70 transition-opacity" style={{ color: "#aa88ff" }}>
                          <PencilTinyIcon />
                        </span>
                      </button>
                    )}
                  </td>

                  {/* Deviation */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {result && asset.targetRatio > 0 && asset.currentValue !== undefined && !isFixedAsset ? (
                      <span
                        className="inline-block font-mono text-xs px-1.5 py-0.5"
                        style={{ background: devStyle.bg, color: devStyle.color }}
                      >
                        {result.deviationPct >= 0 ? "+" : ""}
                        {result.deviationPct.toFixed(2)}%p
                      </span>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: "rgba(0,212,255,0.2)" }}>—</span>
                    )}
                  </td>

                  {/* Rebalance */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {result && asset.targetRatio > 0 && asset.currentValue !== undefined && !isFixedAsset ? (
                      <RebalanceCell
                        asset={asset} result={result} exchangeRate={exchangeRate}
                        onShowTooltip={(id, x, y) => setTooltip({ id, x, y })}
                        onHideTooltip={() => setTooltip(null)}
                      />
                    ) : (
                      <span className="font-mono text-xs" style={{ color: "rgba(0,212,255,0.2)" }}>—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className="inline-block font-display text-[9px] tracking-[0.15em] uppercase px-2 py-0.5"
                      style={{ color: status.color, background: status.bg, border: `1px solid ${status.border}` }}
                    >
                      {status.label}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {!isEditing && !isFixedAsset && (
                        <button
                          onClick={() => startEdit(asset)}
                          title="수량 수정"
                          className="p-1.5 transition-all"
                          style={{ color: "rgba(0,212,255,0.3)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "#00d4ff";
                            (e.currentTarget as HTMLElement).style.background = "rgba(0,212,255,0.08)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "rgba(0,212,255,0.3)";
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                        >
                          <PencilIcon />
                        </button>
                      )}
                      <button
                        onClick={() => confirmDelete(asset.id)}
                        title={isDeleting ? "한 번 더 클릭 시 삭제" : "삭제"}
                        className={`p-1.5 transition-all ${isDeleting ? "animate-pulse" : ""}`}
                        style={{
                          color: isDeleting ? "#ff2244" : "rgba(0,212,255,0.3)",
                          background: isDeleting ? "rgba(255,34,68,0.12)" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isDeleting) {
                            (e.currentTarget as HTMLElement).style.color = "#ff2244";
                            (e.currentTarget as HTMLElement).style.background = "rgba(255,34,68,0.08)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDeleting) {
                            (e.currentTarget as HTMLElement).style.color = "rgba(0,212,255,0.3)";
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                          }
                        }}
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
        <div className="py-16 text-center">
          <p className="font-display text-xs tracking-[0.3em] uppercase" style={{ color: "rgba(0,212,255,0.25)" }}>
            NO ASSETS IN REGISTRY
          </p>
          <p className="font-mono text-[10px] mt-2" style={{ color: "rgba(0,212,255,0.15)" }}>
            USE ADD ASSET PANEL TO INITIALIZE PORTFOLIO
          </p>
        </div>
      )}

      {/* Tax tooltip */}
      {tooltip && (() => {
        const asset = sorted.find((a) => a.id === tooltip.id);
        const result = asset ? resultMap[asset.id] : null;
        if (!asset || !result || result.rebalanceAmount >= 0) return null;
        const absKrw = Math.abs(result.rebalanceAmount);
        const sellValue = asset.currency === "USD" ? absKrw / exchangeRate : absKrw;
        const tax = estimateSellTax(sellValue, asset.category, asset.currency ?? "KRW");
        return <TaxTooltip asset={asset} tax={tax} x={tooltip.x} y={tooltip.y} onClose={() => setTooltip(null)} />;
      })()}
    </div>
  );
}

// ── Rebalance cell ────────────────────────────────────────────────────────────

type RebalanceCellProps = {
  asset: Asset;
  result: AssetRebalanceResult;
  exchangeRate: number;
  onShowTooltip: (id: string, x: number, y: number) => void;
  onHideTooltip: () => void;
};

function RebalanceCell({ asset, result, exchangeRate, onShowTooltip, onHideTooltip }: RebalanceCellProps) {
  const isSell = result.rebalanceAmount < 0;
  const absKrw = Math.abs(result.rebalanceAmount);
  const amount = asset.currency === "USD" ? absKrw / exchangeRate : absKrw;
  const amountCurrency = asset.currency ?? "KRW";
  const tax = isSell ? estimateSellTax(amount, asset.category, amountCurrency) : null;
  const amtDisplay = isSell ? `-${fmtValue(amount, amountCurrency)}` : `+${fmtValue(amount, amountCurrency)}`;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-xs" style={{ color: isSell ? "#ff2244" : "#00d4ff" }}>
        {amtDisplay}
      </span>
      {tax && isSell && (
        tax.applicable ? (
          <button
            className="font-mono text-[10px] text-left transition-colors cursor-help"
            style={{ color: "rgba(255,34,68,0.55)", textDecoration: "underline dotted rgba(255,34,68,0.4)" }}
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onShowTooltip(asset.id, rect.left, rect.bottom + 6);
              (e.currentTarget as HTMLElement).style.color = "#ff2244";
            }}
            onMouseLeave={(e) => {
              onHideTooltip();
              (e.currentTarget as HTMLElement).style.color = "rgba(255,34,68,0.55)";
            }}
          >
            TAX -{fmtTaxAmount(tax.estimatedTax, tax.currency)}
          </button>
        ) : (
          <span className="font-mono text-[10px]" style={{ color: "rgba(170,136,255,0.5)" }}>TAX-FREE</span>
        )
      )}
    </div>
  );
}

// ── Tax tooltip ───────────────────────────────────────────────────────────────

type TaxTooltipProps = {
  asset: Asset;
  tax: ReturnType<typeof estimateSellTax>;
  x: number;
  y: number;
  onClose: () => void;
};

function TaxTooltip({ asset, tax, x, y }: TaxTooltipProps) {
  const rows: { label: string; value: string; color?: string }[] = [
    { label: "SELL VALUE",   value: fmtTaxAmount(tax.sellValue, tax.currency),       color: "#b8e0f0" },
    { label: "DEDUCTION",    value: fmtTaxAmount(tax.deductionLimit, tax.currency),   color: "#00ff88" },
    { label: "TAXABLE GAIN", value: fmtTaxAmount(tax.taxableGain, tax.currency),      color: "#ffaa00" },
    { label: `TAX RATE ${(tax.taxRate * 100).toFixed(0)}%`, value: `-${fmtTaxAmount(tax.estimatedTax, tax.currency)}`, color: "#ff2244" },
    { label: "DEDUCT REMAINING", value: fmtTaxAmount(tax.deductionRemaining, tax.currency), color: tax.deductionRemaining > 0 ? "#00ff88" : "rgba(0,212,255,0.3)" },
  ];
  return (
    <div
      className="fixed z-50 p-4 min-w-[230px] pointer-events-none"
      style={{
        left: Math.min(x, window.innerWidth - 250),
        top: y,
        background: "rgba(0,8,18,0.98)",
        border: "1px solid rgba(0,212,255,0.2)",
        boxShadow: "0 0 30px rgba(0,0,8,0.9), 0 0 0 1px rgba(0,212,255,0.04)",
      }}
    >
      <p className="font-display text-[9px] tracking-[0.35em] uppercase mb-3" style={{ color: "rgba(0,212,255,0.4)" }}>
        {asset.ticker} TAX ESTIMATE
      </p>
      <div className="space-y-1.5 mb-3">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between items-center gap-6">
            <span className="font-display text-[9px] tracking-[0.1em] uppercase" style={{ color: "rgba(0,212,255,0.4)" }}>
              {row.label}
            </span>
            <span className="font-mono text-[11px]" style={{ color: row.color ?? "#b8e0f0" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <div className="pt-2.5" style={{ borderTop: "1px solid rgba(0,212,255,0.1)" }}>
        <p className="font-mono text-[9px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(0,212,255,0.3)" }}>
          {TAX_NOTE[asset.category]}
        </p>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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
