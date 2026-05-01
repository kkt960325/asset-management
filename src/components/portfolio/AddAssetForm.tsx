"use client";

import { useState } from "react";
import { useAssetStore, selectTotalTargetRatio } from "@/lib/store";
import type { AssetCategory } from "@/lib/types";
import { MANUAL_CATEGORIES } from "@/lib/types";

const CATEGORIES: AssetCategory[] = [
  "미국주식", "한국주식", "해외주식",
  "국내ETF", "해외ETF", "채권",
  "Crypto", "KRX금현물", "금/원자재",
  "부동산", "현금/예금", "연금/퇴직", "보험/기타",
];

const INITIAL = {
  ticker: "",
  name: "",
  shares: "",
  category: "미국주식" as AssetCategory,
  targetRatio: "",
  manualValue: "",
};

const inputBase: React.CSSProperties = {
  background: "rgba(0,8,18,0.9)",
  border: "1px solid rgba(0,212,255,0.14)",
  color: "#b8e0f0",
  outline: "none",
  fontFamily: "var(--font-mono)",
};

export default function AddAssetForm() {
  const { assets, addAsset } = useAssetStore();
  const [form, setForm] = useState(INITIAL);
  const [added, setAdded] = useState<string | null>(null);

  const isFixed = MANUAL_CATEGORIES.has(form.category);
  const currentTotalPct = selectTotalTargetRatio(assets);
  const inputRatio = parseFloat(form.targetRatio) || 0;
  const projectedTotal = currentTotalPct + inputRatio;
  const wouldExceed = projectedTotal > 100.01;
  const remaining = Math.max(0, 100 - currentTotalPct);

  function set<K extends keyof typeof INITIAL>(key: K, value: (typeof INITIAL)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isFixed) {
      const name = form.name.trim() || form.ticker.trim();
      const ticker = (form.ticker.trim() || name).toUpperCase();
      const amount = Number(form.manualValue.replace(/,/g, ""));
      if (!ticker || isNaN(amount) || amount < 0) return;
      addAsset({
        ticker, name, shares: 1, category: form.category,
        targetRatio: Math.min(100, Math.max(0, Number(form.targetRatio) || 0)),
        manualValue: amount,
      });
      setAdded(name || ticker);
    } else {
      const ticker = form.ticker.trim().toUpperCase();
      const shares = Number(form.shares.replace(/,/g, ""));
      if (!ticker || isNaN(shares) || shares < 0) return;
      addAsset({
        ticker, name: form.name.trim() || ticker, shares, category: form.category,
        targetRatio: Math.min(100, Math.max(0, Number(form.targetRatio) || 0)),
      });
      setAdded(ticker);
    }
    setForm(INITIAL);
    setTimeout(() => setAdded(null), 2500);
  }

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
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(0,212,255,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00d4ff", boxShadow: "0 0 6px #00d4ff" }} />
          <span className="font-display text-[10px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.45)" }}>
            ADD ASSET
          </span>
          {isFixed && (
            <span
              className="font-display text-[9px] px-2 py-0.5 tracking-[0.2em] uppercase"
              style={{ border: "1px solid rgba(0,204,170,0.3)", color: "#00ccaa", background: "rgba(0,204,170,0.07)" }}
            >
              FIXED ASSET
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-display text-[9px] tracking-[0.2em] uppercase" style={{ color: "rgba(0,212,255,0.25)" }}>
            ALLOCATED
          </span>
          <span
            className="font-mono text-[11px] font-bold px-2 py-0.5"
            style={{
              color: Math.abs(currentTotalPct - 100) < 0.01 ? "#00d4ff"
                : currentTotalPct > 100 ? "#ff2244" : "rgba(0,212,255,0.5)",
              border: `1px solid ${Math.abs(currentTotalPct - 100) < 0.01 ? "rgba(0,212,255,0.3)"
                : currentTotalPct > 100 ? "rgba(255,34,68,0.3)" : "rgba(0,212,255,0.12)"}`,
              textShadow: Math.abs(currentTotalPct - 100) < 0.01 ? "0 0 8px rgba(0,212,255,0.6)" : undefined,
            }}
          >
            {currentTotalPct.toFixed(1)}%
          </span>
          {remaining > 0 && (
            <span className="font-mono text-[10px]" style={{ color: "rgba(255,170,0,0.6)" }}>
              +{remaining.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

          {/* Ticker / asset name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[9px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.35)" }}>
              {isFixed ? "ASSET ID" : "TICKER"} <span style={{ color: "#ff2244" }}>*</span>
            </label>
            <input
              type="text"
              placeholder={
                isFixed ? "GANGNAM_APT"
                : form.category === "한국주식" || form.category === "국내ETF" ? "005930"
                : form.category === "Crypto" ? "BTC"
                : form.category === "KRX금현물" ? "KRX금현물"
                : form.category === "금/원자재" ? "GC=F"
                : "AAPL"
              }
              value={form.ticker}
              onChange={(e) => set("ticker", isFixed ? e.target.value : e.target.value.toUpperCase())}
              required
              className="h-9 px-3 text-sm transition-all"
              style={{
                ...inputBase,
                caretColor: "#00d4ff",
              }}
              onFocus={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.5)"; e.target.style.boxShadow = "0 0 12px rgba(0,212,255,0.08)"; }}
              onBlur={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.14)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Name / memo */}
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[9px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.35)" }}>
              {isFixed ? "MEMO" : "NAME"}
            </label>
            <input
              type="text"
              placeholder={
                isFixed ? "OPTIONAL"
                : form.category === "한국주식" || form.category === "국내ETF" ? "삼성전자"
                : form.category === "Crypto" ? "Bitcoin"
                : form.category === "KRX금현물" ? "KRX 금 현물"
                : form.category === "금/원자재" ? "COMEX Gold"
                : "Apple Inc."
              }
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="h-9 px-3 text-sm transition-all"
              style={{ ...inputBase, fontFamily: "var(--font-sans)" }}
              onFocus={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.5)"; e.target.style.boxShadow = "0 0 12px rgba(0,212,255,0.08)"; }}
              onBlur={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.14)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[9px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.35)" }}>
              CATEGORY
            </label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value as AssetCategory)}
              className="h-9 px-3 text-sm cursor-pointer appearance-none transition-all"
              style={{ ...inputBase }}
              onFocus={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.5)"; }}
              onBlur={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.14)"; }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} style={{ background: "#000f20" }}>{c}</option>
              ))}
            </select>
          </div>

          {/* Shares / value */}
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[9px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.35)" }}>
              {isFixed ? "VALUE (₩)" : "QUANTITY"} <span style={{ color: "#ff2244" }}>*</span>
            </label>
            {isFixed ? (
              <input
                type="text" inputMode="numeric"
                placeholder="500,000,000"
                value={form.manualValue}
                onChange={(e) => set("manualValue", e.target.value)}
                required
                className="h-9 px-3 text-sm transition-all"
                style={{ ...inputBase, border: "1px solid rgba(0,204,170,0.2)", color: "#00ccaa" }}
                onFocus={(e) => { e.target.style.border = "1px solid rgba(0,204,170,0.5)"; e.target.style.boxShadow = "0 0 12px rgba(0,204,170,0.08)"; }}
                onBlur={(e) => { e.target.style.border = "1px solid rgba(0,204,170,0.2)"; e.target.style.boxShadow = "none"; }}
              />
            ) : (
              <input
                type="text" inputMode="numeric"
                placeholder="100"
                value={form.shares}
                onChange={(e) => set("shares", e.target.value)}
                required
                className="h-9 px-3 text-sm transition-all"
                style={inputBase}
                onFocus={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.5)"; e.target.style.boxShadow = "0 0 12px rgba(0,212,255,0.08)"; }}
                onBlur={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.14)"; e.target.style.boxShadow = "none"; }}
              />
            )}
          </div>

          {/* Target ratio + submit */}
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[9px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.35)" }}>
              TARGET (%)
            </label>
            <div className="flex gap-2">
              <input
                type="number" min={0} max={100} step={0.1}
                placeholder={remaining > 0 ? remaining.toFixed(1) : "0"}
                value={form.targetRatio}
                onChange={(e) => set("targetRatio", e.target.value)}
                className="h-9 flex-1 px-3 text-sm transition-all"
                style={{
                  ...inputBase,
                  border: wouldExceed ? "1px solid rgba(255,34,68,0.4)" : "1px solid rgba(0,212,255,0.14)",
                  color: wouldExceed ? "#ff2244" : "#b8e0f0",
                }}
                onFocus={(e) => { e.target.style.boxShadow = "0 0 12px rgba(0,212,255,0.08)"; }}
                onBlur={(e) => { e.target.style.boxShadow = "none"; }}
              />
              <button
                type="submit"
                className="h-9 px-4 font-display text-[10px] tracking-[0.2em] uppercase transition-all group relative overflow-hidden"
                style={{
                  border: "1px solid rgba(0,212,255,0.35)",
                  color: "#00d4ff",
                  background: "rgba(0,212,255,0.04)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(0,212,255,0.1)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(0,212,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(0,212,255,0.04)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                + ADD
              </button>
            </div>
          </div>
        </div>

        {/* Exceed warning */}
        {wouldExceed && (
          <div className="mt-3 flex items-center gap-2 text-xs font-mono animate-fade-in-up" style={{ color: "#ff2244" }}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>
              [OVERFLOW] TARGET SUM{" "}
              <span className="font-bold">{projectedTotal.toFixed(1)}%</span>
              {" "}EXCEEDS 100% — MAX REMAINING:{" "}
              <span className="font-bold">{remaining.toFixed(1)}%</span>
            </span>
          </div>
        )}

        {/* Success */}
        {added && (
          <div className="mt-3 flex items-center gap-2 text-xs font-mono animate-fade-in-up" style={{ color: "#00d4ff" }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              [OK] <span className="font-bold">{added}</span> ADDED TO PORTFOLIO
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
