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
  /** 실시간 USD/KRW 환율 (시세 갱신 시 업데이트, 초기값은 폴백 환율) */
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;

  addAsset: (input: NewAssetInput) => void;
  updateShares: (id: string, shares: number) => void;
  updateAsset: (id: string, updates: Partial<Omit<Asset, "id">>) => void;
  removeAsset: (id: string) => void;
  setTargetRatios: (ratios: Record<string, number>) => void;
  /** 부동산 전용: manualValue와 currentValue를 동시에 갱신. 시세 갱신 시 유지 */
  updateManualValue: (id: string, value: number) => void;
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
      exchangeRate: 1_400,
      valueHistory: [],

      setExchangeRate: (rate) => set({ exchangeRate: rate }),

      addAsset: (input) =>
        set((state) => {
          const id = `${input.ticker}-${Date.now()}`;
          const isFixed = input.category === "부동산";
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
          const updatedAssets = [...state.assets, newAsset];
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      updateShares: (id, shares) =>
        set((state) => {
          const updatedAssets = state.assets.map((a) => (a.id === id ? { ...a, shares } : a));
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      updateAsset: (id, updates) =>
        set((state) => {
          const updatedAssets = state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a));
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      removeAsset: (id) =>
        set((state) => {
          const updatedAssets = state.assets.filter((a) => a.id !== id);
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      setTargetRatios: (ratios) =>
        set((state) => {
          const updatedAssets = state.assets.map((a) =>
            ratios[a.id] !== undefined ? { ...a, targetRatio: ratios[a.id] } : a
          );
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      updateManualValue: (id, value) =>
        set((state) => {
          const updatedAssets = state.assets.map((a) =>
            a.id === id
              ? { ...a, manualValue: value, currentValue: value, currency: "KRW" as const }
              : a
          );
          return {
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      updatePrices: (prices) =>
        set((state) => {
          const updatedAssets = state.assets.map((a) => {
            // 부동산: manualValue 보존, 시세 갱신 시 무시
            if (a.manualValue !== undefined) return a;
            // 1차: 정확한 티커 매칭 / 2차: "ticker-USD" 폴백 (Crypto 안전망)
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
            assets: updatedAssets,
            rebalanceAlert: calcRebalance(updatedAssets, state.thresholdPct, state.exchangeRate).needsRebalancing,
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

          // 초기화 즉시 현재 정확한 총액을 첫 포인트로 기록
          const seed: ValueSnapshot = { ts: Date.now(), totalKrw, totalUsd };
          return { valueHistory: [seed] };
        }),
    }),
    {
      name: "asset-management-store",
      version: 4,
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
  thresholdPct: number,
  exchangeRate = 1
): RebalanceSummary => calcRebalance(assets, thresholdPct, exchangeRate);
