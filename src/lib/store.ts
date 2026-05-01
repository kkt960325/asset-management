import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Asset, AssetCategory, NewAssetInput, PriceData, ValueSnapshot } from "./types";
import { MANUAL_CATEGORIES } from "./types";
import { calcRebalance, type RebalanceSummary } from "./rebalancer";

// ── 스토어 타입 ───────────────────────────────────────────────────────────────

type AssetStore = {
  assets: Asset[];

  /** 리밸런싱 알림 임계치 (퍼센트포인트, 기본 3 → ±3%p) */
  thresholdPct: number;
  /** 임계치를 초과한 자산이 하나라도 있으면 true */
  rebalanceAlert: boolean;
  /** 실시간 USD/KRW 환율 */
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;

  addAsset: (input: NewAssetInput) => void;
  updateShares: (id: string, shares: number) => void;
  updateAsset: (id: string, updates: Partial<Omit<Asset, "id">>) => void;
  removeAsset: (id: string) => void;
  setTargetRatios: (ratios: Record<string, number>) => void;
  updateManualValue: (id: string, value: number) => void;
  updatePrices: (prices: Record<string, PriceData>) => void;
  setThreshold: (pct: number) => void;

  recordSnapshot: () => void;
  clearHistory: () => void;
  valueHistory: ValueSnapshot[];
};

// ── 스토어 (localStorage 전체 영속화) ────────────────────────────────────────

export const useAssetStore = create<AssetStore>()(
  persist(
    (set) => ({
      assets: [],
      thresholdPct: 3,
      rebalanceAlert: false,
      exchangeRate: 1_400,
      valueHistory: [],

      setExchangeRate: (rate) => set({ exchangeRate: rate }),

      addAsset: (input) =>
        set((state) => {
          const id = `${input.ticker}-${Date.now()}`;
          const isFixed = MANUAL_CATEGORIES.has(input.category);
          const newAsset = isFixed
            ? {
                id,
                ...input,
                shares: 1,
                manualValue: input.manualValue ?? 0,
                currentValue: input.manualValue ?? 0,
                currency: "KRW" as const,
              }
            : { id, ...input };
          const updated = [...state.assets, newAsset];
          return {
            assets: updated,
            rebalanceAlert: calcRebalance(updated, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      updateShares: (id, shares) =>
        set((state) => {
          const updated = state.assets.map((a) => (a.id === id ? { ...a, shares } : a));
          return {
            assets: updated,
            rebalanceAlert: calcRebalance(updated, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      updateAsset: (id, updates) =>
        set((state) => {
          const updated = state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a));
          return {
            assets: updated,
            rebalanceAlert: calcRebalance(updated, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      removeAsset: (id) =>
        set((state) => {
          const updated = state.assets.filter((a) => a.id !== id);
          return {
            assets: updated,
            rebalanceAlert: calcRebalance(updated, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      setTargetRatios: (ratios) =>
        set((state) => {
          const updated = state.assets.map((a) =>
            ratios[a.id] !== undefined ? { ...a, targetRatio: ratios[a.id] } : a
          );
          return {
            assets: updated,
            rebalanceAlert: calcRebalance(updated, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      updateManualValue: (id, value) =>
        set((state) => {
          const updated = state.assets.map((a) =>
            a.id === id
              ? { ...a, manualValue: value, currentValue: value, currency: "KRW" as const }
              : a
          );
          return {
            assets: updated,
            rebalanceAlert: calcRebalance(updated, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      updatePrices: (prices) =>
        set((state) => {
          const updated = state.assets.map((a) => {
            if (a.manualValue !== undefined) return a;
            const data = prices[a.ticker] ?? prices[`${a.ticker}-USD`];
            if (!data) return a;
            return {
              ...a,
              currentPrice: data.price,
              currentValue: a.shares * data.price,
              currency: data.currency,
            };
          });
          return {
            assets: updated,
            rebalanceAlert: calcRebalance(updated, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      setThreshold: (pct) =>
        set((state) => ({
          thresholdPct: pct,
          rebalanceAlert: calcRebalance(state.assets, pct, state.exchangeRate).needsRebalancing,
        })),

      recordSnapshot: () =>
        set((state) => {
          const totalKrw = state.assets
            .filter((a) => a.currency === "KRW")
            .reduce((s, a) => s + (a.currentValue ?? 0), 0);
          const totalUsd = state.assets
            .filter((a) => a.currency === "USD")
            .reduce((s, a) => s + (a.currentValue ?? 0), 0);
          if (totalKrw === 0 && totalUsd === 0) return state;
          const next: ValueSnapshot = { ts: Date.now(), totalKrw, totalUsd };
          return { valueHistory: [...state.valueHistory, next].slice(-200) };
        }),

      clearHistory: () =>
        set((state) => {
          const totalKrw = state.assets
            .filter((a) => a.currency === "KRW")
            .reduce((s, a) => s + (a.currentValue ?? 0), 0);
          const totalUsd = state.assets
            .filter((a) => a.currency === "USD")
            .reduce((s, a) => s + (a.currentValue ?? 0), 0);
          if (totalKrw === 0 && totalUsd === 0) return { valueHistory: [] };
          const seed: ValueSnapshot = { ts: Date.now(), totalKrw, totalUsd };
          return { valueHistory: [seed] };
        }),
    }),
    {
      name: "asset-management-store",
      version: 7,
      migrate: (persistedState: unknown, version: number) => {
        if (version <= 6) {
          // v6 → v7: 카테고리 이름 마이그레이션
          const OLD_TO_NEW: Record<string, AssetCategory> = {
            "미국주식": "미국주식",
            "금현물":   "금/원자재",
            "ISA-ETF":  "국내ETF",
            "주택청약": "현금/예금",
            "IRP":      "연금/퇴직",
            "Crypto":   "Crypto",
            "부동산":   "부동산",
          };
          const s = persistedState as { assets?: Asset[]; [key: string]: unknown };
          return {
            ...s,
            assets: (s.assets ?? []).map((a: Asset) => ({
              ...a,
              category: OLD_TO_NEW[a.category] ?? "보험/기타",
            })),
          };
        }
        return persistedState;
      },
    }
  )
);

// ── 셀렉터 ────────────────────────────────────────────────────────────────────

export const selectByCategory = (assets: Asset[], category: AssetCategory) =>
  assets.filter((a) => a.category === category);

export const selectTotalTargetRatio = (assets: Asset[]) =>
  assets.reduce((sum, a) => sum + a.targetRatio, 0);

export const selectTotalCurrentValue = (assets: Asset[]) =>
  assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0);

export const selectRebalanceSummary = (
  assets: Asset[],
  thresholdPct: number,
  exchangeRate = 1
): RebalanceSummary => calcRebalance(assets, thresholdPct, exchangeRate);
