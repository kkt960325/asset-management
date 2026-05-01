import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Asset, AssetCategory, NewAssetInput, PriceData, ValueSnapshot } from "./types";
import { MANUAL_CATEGORIES } from "./types";
import { calcRebalance, type RebalanceSummary } from "./rebalancer";

// ── Ticker normalization ──────────────────────────────────────────────────────
// Strips exchange suffixes (.KS, .KQ, .KN) and crypto suffix (-USD), uppercases.
// Used in updatePrices to match API response keys to store asset tickers
// regardless of case or suffix variations.
function normalizeTicker(t: string): string {
  return t
    .toUpperCase()
    .replace(/\.(KS|KQ|KN)$/i, "")
    .replace(/-USD$/i, "");
}

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

  /** 마지막 시세 조회 성공 시각 (Unix ms) */
  lastPriceUpdate: number | null;
  setLastPriceUpdate: (ts: number) => void;

  /** 전체 자산 표시 통화 */
  displayCurrency: "KRW" | "USD";
  setDisplayCurrency: (c: "KRW" | "USD") => void;

  addAsset: (input: NewAssetInput) => void;
  updateShares: (id: string, shares: number) => void;
  updateAsset: (id: string, updates: Partial<Omit<Asset, "id">>) => void;
  removeAsset: (id: string) => void;
  setTargetRatios: (ratios: Record<string, number>) => void;
  updateManualValue: (id: string, value: number) => void;
  updatePrices: (prices: Record<string, PriceData>) => void;
  /** 시세 조회 자산의 캐시된 가격 필드를 초기화 — SYNC 강제 재계산에 사용 */
  clearMarketPrices: () => void;
  setThreshold: (pct: number) => void;

  recordSnapshot: () => void;
  clearHistory: () => void;
  valueHistory: ValueSnapshot[];

  /** 현재 포트폴리오를 JSON 문자열로 내보내기 */
  exportPortfolio: () => string;
  /** JSON 문자열에서 포트폴리오 복원 — 기존 자산을 덮어씀 */
  importPortfolio: (json: string) => void;
};

// ── 스토어 (localStorage 전체 영속화) ────────────────────────────────────────

export const useAssetStore = create<AssetStore>()(
  persist(
    (set, get) => ({
      assets: [],
      thresholdPct: 3,
      rebalanceAlert: false,
      exchangeRate: 1_400,
      valueHistory: [],
      lastPriceUpdate: null,
      displayCurrency: "KRW",

      setExchangeRate: (rate) => set({ exchangeRate: rate }),
      setLastPriceUpdate: (ts) => set({ lastPriceUpdate: ts }),
      setDisplayCurrency: (c) => set({ displayCurrency: c }),

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
          // Build normalized lookup so matching is case-insensitive and suffix-tolerant.
          // Each API price key is stored under: exact, uppercase, and fully normalized form.
          const lookup = new Map<string, PriceData>();
          for (const [key, data] of Object.entries(prices)) {
            lookup.set(key, data);                  // exact (as returned by API)
            lookup.set(key.toUpperCase(), data);    // uppercase variant
            lookup.set(normalizeTicker(key), data); // strip .KS/.KQ/-USD + uppercase
          }

          // ── E2E 트레이스 로그 ─────────────────────────────────────────────────
          console.group("[updatePrices] E2E 매칭 진단");
          console.log("  API 가격 맵 keys:", Object.keys(prices));
          const marketTickers = state.assets
            .filter((a) => !MANUAL_CATEGORIES.has(a.category))
            .map((a) => a.ticker);
          console.log("  Store 시장자산 tickers:", marketTickers);

          const updated = state.assets.map((a) => {
            // Skip categories that are always manually valued — no market price lookup
            if (MANUAL_CATEGORIES.has(a.category)) return a;

            // Try progressively looser matches:
            // 1. exact ticker  2. ticker + "-USD" (crypto fallback)
            // 3. uppercase     4. fully normalized (suffix-stripped)
            const data =
              lookup.get(a.ticker) ??
              lookup.get(`${a.ticker}-USD`) ??
              lookup.get(a.ticker.toUpperCase()) ??
              lookup.get(normalizeTicker(a.ticker));

            // No price found → keep existing currentValue (preserves last-known data)
            if (!data) {
              console.warn(
                `  ✗ Match Fail: "${a.ticker}" ` +
                `(tried: exact / "${a.ticker}-USD" / "${a.ticker.toUpperCase()}" / "${normalizeTicker(a.ticker)}")`
              );
              return a;
            }

            // Force numeric type — guard against string prices from any JSON edge case
            const rawPrice = parseFloat(String(data.price));
            if (isNaN(rawPrice)) {
              console.error(`  ✗ Parse Error: "${a.ticker}" data.price="${data.price}" → NaN`);
              // Tag as parse error; UI shows "ERR" so the issue is visible and traceable
              return { ...a, currentPrice: NaN as number, currentValue: NaN as number };
            }

            const cv = (a.shares ?? 0) * rawPrice;
            console.log(`  ✓ "${a.ticker}" → price=${rawPrice} ${data.currency}, shares=${a.shares ?? 0}, value=${cv}`);
            return {
              ...a,
              currentPrice: rawPrice,
              currentValue: cv,
              currency: data.currency,
            };
          });

          console.groupEnd();

          return {
            assets: updated,
            rebalanceAlert: calcRebalance(updated, state.thresholdPct, state.exchangeRate).needsRebalancing,
          };
        }),

      clearMarketPrices: () =>
        set((state) => ({
          assets: state.assets.map((a) =>
            MANUAL_CATEGORIES.has(a.category)
              ? a
              : { ...a, currentPrice: undefined, currentValue: undefined, currency: undefined }
          ),
        })),

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

      exportPortfolio: () => {
        const { assets, thresholdPct } = get();
        return JSON.stringify(
          { _seunghanist: 1, exportedAt: new Date().toISOString(), thresholdPct, assets },
          null,
          2
        );
      },

      importPortfolio: (json: string) => {
        const data = JSON.parse(json) as { assets?: Asset[]; thresholdPct?: number };
        if (!Array.isArray(data.assets)) throw new Error("유효하지 않은 포트폴리오 파일입니다.");
        const rate = get().exchangeRate;
        set({
          assets: data.assets,
          thresholdPct: data.thresholdPct ?? 3,
          rebalanceAlert: calcRebalance(data.assets, data.thresholdPct ?? 3, rate).needsRebalancing,
        });
      },
    }),
    {
      name: "asset-management-store",
      version: 8,
      migrate: (persistedState: unknown, version: number) => {
        let s = persistedState as { assets?: Asset[]; [key: string]: unknown };

        if (version <= 6) {
          const OLD_TO_NEW: Record<string, AssetCategory> = {
            "미국주식": "미국주식",
            "금현물":   "KRX금현물",
            "ISA-ETF":  "국내ETF",
            "주택청약": "현금/예금",
            "IRP":      "연금/퇴직",
            "Crypto":   "Crypto",
            "부동산":   "부동산",
          };
          s = {
            ...s,
            assets: (s.assets ?? []).map((a: Asset) => ({
              ...a,
              category: OLD_TO_NEW[a.category] ?? "보험/기타",
            })),
          };
        }

        if (version === 7) {
          s = {
            ...s,
            assets: (s.assets ?? []).map((a: Asset) => ({
              ...a,
              category:
                a.ticker === "KRX금현물" && a.category === "금/원자재"
                  ? ("KRX금현물" as AssetCategory)
                  : a.category,
            })),
          };
        }

        return s;
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
