import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Asset, AssetCategory, NewAssetInput, PriceData, ValueSnapshot } from "./types";
import { calcRebalance, type RebalanceSummary } from "./rebalancer";

// ── 초기 자산 데이터 ──────────────────────────────────────────────────────────

const initialAssets: Asset[] = [

];

// ── 스토어 타입 ───────────────────────────────────────────────────────────────

type AssetStore = {
  assets: Asset[];

  /** 리밸런싱 알림 임계치 (퍼센트포인트, 기본 3 → ±3%p) */
  thresholdPct: number;
  /** 임계치를 초과한 자산이 하나라도 있으면 true */
  rebalanceAlert: boolean;

  addAsset: (input: NewAssetInput) => void;
  updateShares: (id: string, shares: number) => void;
  updateAsset: (id: string, updates: Partial<Omit<Asset, "id">>) => void;
  removeAsset: (id: string) => void;
  setTargetRatios: (ratios: Record<string, number>) => void;
  /**
   * ticker → PriceData 맵으로 currentPrice / currentValue / currency 일괄 갱신.
   * 갱신 후 rebalanceAlert를 자동으로 재계산한다.
   */
  updatePrices: (prices: Record<string, PriceData>) => void;
  /**
   * 임계치 변경. 변경 즉시 rebalanceAlert를 재계산한다.
   * @param pct 퍼센트포인트 (예: 3 → ±3%p)
   */
  setThreshold: (pct: number) => void;

  /** 시세 갱신 시점의 총액을 valueHistory에 추가 (최대 200개 유지) */
  recordSnapshot: () => void;
  /** 히스토리 전체 삭제 */
  clearHistory: () => void;
  /** 총액 추이 히스토리 */
  valueHistory: ValueSnapshot[];
};

// ── 스토어 생성 (persist로 localStorage 영속화) ───────────────────────────────

export const useAssetStore = create<AssetStore>()(
  persist(
    (set) => ({
      assets: initialAssets,
      thresholdPct: 3,
      rebalanceAlert: false,
      valueHistory: [],

      addAsset: (input) =>
        set((state) => {
          const id = `${input.ticker}-${Date.now()}`;
          const updatedAssets = [...state.assets, { id, ...input }];
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct).needsRebalancing,
          };
        }),

      updateShares: (id, shares) =>
        set((state) => {
          const updatedAssets = state.assets.map((a) => (a.id === id ? { ...a, shares } : a));
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct).needsRebalancing,
          };
        }),

      updateAsset: (id, updates) =>
        set((state) => {
          const updatedAssets = state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a));
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct).needsRebalancing,
          };
        }),

      removeAsset: (id) =>
        set((state) => {
          const updatedAssets = state.assets.filter((a) => a.id !== id);
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct).needsRebalancing,
          };
        }),

      setTargetRatios: (ratios) =>
        set((state) => {
          const updatedAssets = state.assets.map((a) =>
            ratios[a.id] !== undefined ? { ...a, targetRatio: ratios[a.id] } : a
          );
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct).needsRebalancing,
          };
        }),

      updatePrices: (prices) =>
        set((state) => {
          const updatedAssets = state.assets.map((a) => {
            const data = prices[a.ticker];
            if (!data) return a;
            return {
              ...a,
              currentPrice: data.price,
              currentValue: a.shares * data.price,
              currency: data.currency,
            };
          });
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct).needsRebalancing,
          };
        }),

      setThreshold: (pct) =>
        set((state) => ({
          thresholdPct: pct,
          rebalanceAlert: calcRebalance(state.assets, pct).needsRebalancing,
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

      clearHistory: () => set({ valueHistory: [] }),
    }),
    {
      name: "asset-management-store",
      version: 1,
    }
  )
);

// ── 셀렉터 ────────────────────────────────────────────────────────────────────

export const selectByCategory = (assets: Asset[], category: AssetCategory) =>
  assets.filter((a) => a.category === category);

export const selectTotalTargetRatio = (assets: Asset[]) =>
  assets.reduce((sum, a) => sum + a.targetRatio, 0);

/** 전체 평가금액 합산. USD 자산은 환율 미적용이므로 참고용으로만 사용 */
export const selectTotalCurrentValue = (assets: Asset[]) =>
  assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0);

/** 리밸런싱 계산 결과 전체. 컴포넌트에서 calcRebalance를 직접 호출하는 대신 사용 */
export const selectRebalanceSummary = (
  assets: Asset[],
  thresholdPct: number
): RebalanceSummary => calcRebalance(assets, thresholdPct);
