"use client";

import { useState } from "react";
import { useAssetStore, selectTotalTargetRatio } from "@/lib/store";
import type { AssetCategory } from "@/lib/types";

const CATEGORIES: AssetCategory[] = ["미국주식", "금현물", "ISA-ETF", "주택청약", "IRP"];

const INITIAL = {
  ticker: "",
  name: "",
  shares: "",
  category: "미국주식" as AssetCategory,
  targetRatio: "",
};

export default function AddAssetForm() {
  const { assets, addAsset } = useAssetStore();
  const [form, setForm] = useState(INITIAL);
  const [added, setAdded] = useState<string | null>(null);

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
    const ticker = form.ticker.trim().toUpperCase();
    const shares = Number(form.shares.replace(/,/g, ""));
    if (!ticker || isNaN(shares) || shares < 0) return;

    addAsset({
      ticker,
      name: form.name.trim() || ticker,
      shares,
      category: form.category,
      targetRatio: Math.min(100, Math.max(0, Number(form.targetRatio) || 0)),
    });

    setAdded(ticker);
    setForm(INITIAL);
    setTimeout(() => setAdded(null), 2500);
  }

  return (
    <div className="rounded-xl border border-[#1a2540] bg-[#0c1121] overflow-hidden animate-fade-in-up">
      {/* 헤더 */}
      <div className="px-5 py-3.5 border-b border-[#1a2540] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#8392b0]">
            새로운 종목 추가
          </span>
        </div>

        {/* 목표 배분 현황 뱃지 */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#3a4a6a]">현재 배분 합계</span>
          <span
            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${
              Math.abs(currentTotalPct - 100) < 0.01
                ? "text-emerald-400 bg-emerald-500/10"
                : currentTotalPct > 100
                ? "text-rose-400 bg-rose-500/10"
                : "text-[#8392b0] bg-[#1a2540]"
            }`}
          >
            {currentTotalPct.toFixed(1)}%
          </span>
          {remaining > 0 && (
            <span className="text-[10px] text-[#3a4a6a]">
              잔여{" "}
              <span className="font-mono text-amber-400">{remaining.toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 티커 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#3a4a6a] font-semibold">
              티커 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="AAPL"
              value={form.ticker}
              onChange={(e) => set("ticker", e.target.value.toUpperCase())}
              required
              className="h-9 bg-[#111827] border border-[#1a2540] rounded-lg px-3 font-mono text-sm text-[#e2e8f8] placeholder-[#3a4a6a] focus:outline-none focus:border-sky-500/50 focus:bg-[#0d1828] transition-all"
            />
          </div>

          {/* 종목명 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#3a4a6a] font-semibold">
              종목명
            </label>
            <input
              type="text"
              placeholder="Apple Inc."
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="h-9 bg-[#111827] border border-[#1a2540] rounded-lg px-3 text-sm text-[#e2e8f8] placeholder-[#3a4a6a] focus:outline-none focus:border-sky-500/50 focus:bg-[#0d1828] transition-all"
            />
          </div>

          {/* 카테고리 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#3a4a6a] font-semibold">
              카테고리
            </label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value as AssetCategory)}
              className="h-9 bg-[#111827] border border-[#1a2540] rounded-lg px-3 text-sm text-[#e2e8f8] focus:outline-none focus:border-sky-500/50 focus:bg-[#0d1828] transition-all appearance-none cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 보유수량 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#3a4a6a] font-semibold">
              보유수량 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="100"
              value={form.shares}
              onChange={(e) => set("shares", e.target.value)}
              required
              className="h-9 bg-[#111827] border border-[#1a2540] rounded-lg px-3 font-mono text-sm text-[#e2e8f8] placeholder-[#3a4a6a] focus:outline-none focus:border-sky-500/50 focus:bg-[#0d1828] transition-all"
            />
          </div>

          {/* 목표비중 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#3a4a6a] font-semibold">
              목표비중 (%)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder={remaining > 0 ? remaining.toFixed(1) : "0"}
                value={form.targetRatio}
                onChange={(e) => set("targetRatio", e.target.value)}
                className={`h-9 flex-1 bg-[#111827] border rounded-lg px-3 font-mono text-sm text-[#e2e8f8] placeholder-[#3a4a6a] focus:outline-none transition-all ${
                  wouldExceed
                    ? "border-rose-500/50 focus:border-rose-400"
                    : "border-[#1a2540] focus:border-sky-500/50 focus:bg-[#0d1828]"
                }`}
              />
              <button
                type="submit"
                className="h-9 px-4 bg-sky-500/15 border border-sky-500/30 rounded-lg text-sky-400 text-xs font-semibold hover:bg-sky-500/25 hover:border-sky-400/60 active:scale-95 transition-all whitespace-nowrap"
              >
                + 추가
              </button>
            </div>
          </div>
        </div>

        {/* 초과 경고 */}
        {wouldExceed && (
          <div className="mt-3 flex items-center gap-2 text-rose-400 text-xs animate-fade-in-up">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>
              목표비중 합계가{" "}
              <span className="font-mono font-semibold">{projectedTotal.toFixed(1)}%</span>
              로 100%를 초과합니다.{" "}
              <span className="font-mono">{remaining.toFixed(1)}%</span> 이하로 입력하세요.
            </span>
          </div>
        )}

        {/* 성공 메시지 */}
        {added && (
          <div className="mt-3 flex items-center gap-2 text-emerald-400 text-xs animate-fade-in-up">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              <span className="font-mono font-semibold">{added}</span> 종목이 추가되었습니다.
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
