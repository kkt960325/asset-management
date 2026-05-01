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
        ticker,
        name,
        shares: 1,
        category: form.category,
        targetRatio: Math.min(100, Math.max(0, Number(form.targetRatio) || 0)),
        manualValue: amount,
      });
      setAdded(name || ticker);
    } else {
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
    }

    setForm(INITIAL);
    setTimeout(() => setAdded(null), 2500);
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a1c2d]/80 backdrop-blur-sm overflow-hidden animate-fade-in-up">
      {/* 헤더 */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00c389]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#787e88]">
            새로운 종목 추가
          </span>
          {isFixed && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold">
              고정 자산
            </span>
          )}
        </div>

        {/* 목표 배분 현황 뱃지 */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#787e88]/50">현재 배분 합계</span>
          <span
            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${
              Math.abs(currentTotalPct - 100) < 0.01
                ? "text-[#00c389] bg-[#00c389]/10"
                : currentTotalPct > 100
                ? "text-rose-400 bg-rose-500/10"
                : "text-[#787e88] bg-white/[0.04]"
            }`}
          >
            {currentTotalPct.toFixed(1)}%
          </span>
          {remaining > 0 && (
            <span className="text-[10px] text-[#787e88]/50">
              잔여{" "}
              <span className="font-mono text-[#f59e0b]">{remaining.toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 티커 / 자산명 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#787e88]/60 font-semibold">
              {isFixed ? "자산명" : "티커"} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder={
                isFixed ? "강남 아파트"
                : form.category === "한국주식" || form.category === "국내ETF" ? "005930"
                : form.category === "Crypto" ? "BTC"
                : form.category === "KRX금현물" ? "KRX금현물"
                : form.category === "금/원자재" ? "GC=F"
                : "AAPL"
              }
              value={form.ticker}
              onChange={(e) => set("ticker", isFixed ? e.target.value : e.target.value.toUpperCase())}
              required
              className="h-9 bg-[#030e18] border border-white/[0.08] rounded-lg px-3 font-mono text-sm text-[#edeff9] placeholder-[#787e88]/40 focus:outline-none focus:border-[#00c389]/50 transition-all"
            />
          </div>

          {/* 종목명 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#787e88]/60 font-semibold">
              {isFixed ? "메모" : "종목명"}
            </label>
            <input
              type="text"
              placeholder={
                isFixed ? "선택 입력"
                : form.category === "한국주식" || form.category === "국내ETF" ? "삼성전자"
                : form.category === "Crypto" ? "Bitcoin"
                : form.category === "KRX금현물" ? "KRX 금 현물"
                : form.category === "금/원자재" ? "COMEX Gold"
                : "Apple Inc."
              }
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="h-9 bg-[#030e18] border border-white/[0.08] rounded-lg px-3 text-sm text-[#edeff9] placeholder-[#787e88]/40 focus:outline-none focus:border-[#00c389]/50 transition-all"
            />
          </div>

          {/* 카테고리 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#787e88]/60 font-semibold">
              카테고리
            </label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value as AssetCategory)}
              className="h-9 bg-[#030e18] border border-white/[0.08] rounded-lg px-3 text-sm text-[#edeff9] focus:outline-none focus:border-[#00c389]/50 transition-all appearance-none cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 보유수량 / 평가금액 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#787e88]/60 font-semibold">
              {isFixed ? "평가금액 (₩)" : "보유수량"} <span className="text-rose-500">*</span>
            </label>
            {isFixed ? (
              <input
                type="text"
                inputMode="numeric"
                placeholder="500,000,000"
                value={form.manualValue}
                onChange={(e) => set("manualValue", e.target.value)}
                required
                className="h-9 bg-[#030e18] border border-teal-500/30 rounded-lg px-3 font-mono text-sm text-teal-300 placeholder-[#787e88]/40 focus:outline-none focus:border-teal-400/60 transition-all"
              />
            ) : (
              <input
                type="text"
                inputMode="numeric"
                placeholder="100"
                value={form.shares}
                onChange={(e) => set("shares", e.target.value)}
                required
                className="h-9 bg-[#030e18] border border-white/[0.08] rounded-lg px-3 font-mono text-sm text-[#edeff9] placeholder-[#787e88]/40 focus:outline-none focus:border-[#00c389]/50 transition-all"
              />
            )}
          </div>

          {/* 목표비중 + 제출 버튼 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#787e88]/60 font-semibold">
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
                className={`h-9 flex-1 bg-[#030e18] border rounded-lg px-3 font-mono text-sm text-[#edeff9] placeholder-[#787e88]/40 focus:outline-none transition-all ${
                  wouldExceed
                    ? "border-rose-500/50 focus:border-rose-400"
                    : "border-white/[0.08] focus:border-[#00c389]/50"
                }`}
              />
              <button
                type="submit"
                className="h-9 px-4 bg-[#00c389]/15 border border-[#00c389]/30 rounded-lg text-[#00c389] text-xs font-semibold hover:bg-[#00c389]/25 hover:border-[#00c389]/60 active:scale-95 transition-all whitespace-nowrap"
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
          <div className="mt-3 flex items-center gap-2 text-[#00c389] text-xs animate-fade-in-up">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              <span className="font-mono font-semibold">{added}</span> 자산이 추가되었습니다.
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
