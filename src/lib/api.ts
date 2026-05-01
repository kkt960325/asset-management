"use client";

import { useCallback, useState } from "react";
import { useAssetStore } from "./store";
import type { PriceData } from "./types";
import type { PricesApiResponse } from "@/app/api/prices/route";

// ── Client-side debug cache ──────────────────────────────────────────────────
// Populated on every successful price fetch so window.debugAssets() can inspect
// the last API response vs. what was actually stored.
let _lastDebugInfo: {
  priceMap: Record<string, PriceData>;
  failed: string[];
  fetchedAt: Date;
  mock?: boolean;
} | null = null;

export function getLastDebugInfo() {
  return _lastDebugInfo;
}

/**
 * 내부 ticker → Yahoo Finance 심볼 매핑.
 *
 * KRX 6자리 숫자 코드(예: 005930)는 자동으로 ".KS" 접미사가 붙어 네이버 금융으로 조회됨.
 * 이 맵에는 특수 변환이 필요한 심볼만 등록한다.
 */
export const YAHOO_TICKER_MAP: Record<string, string> = {
  // KRX 금현물 — GC=F(COMEX USD/oz) → route.ts에서 KRW/g으로 환산
  "KRX금현물": "GC=F",
};

/** KRX 6자리 숫자 코드인지 확인 (한국 주식·ETF 자동 인식) */
function isKrxCode(ticker: string): boolean {
  return /^\d{6}$/.test(ticker);
}

/** 시세 조회 대상에서 제외할 카테고리 (manualValue = 평가금액) */
const NON_MARKET_CATEGORIES = new Set(["부동산", "현금/예금", "연금/퇴직", "보험/기타"]);

type AssetForPrice = { ticker: string; category: string };

/**
 * 자산 배열의 현재가와 실시간 환율을 Route Handler(/api/prices)를 통해 조회한다.
 * Crypto 카테고리는 Yahoo Finance 형식(-USD 접미사)으로 자동 변환된다.
 *
 * @returns `{ priceMap, exchangeRate }` — priceMap은 조회 성공한 종목만 포함
 */
export async function fetchAssetPrices(marketAssets: AssetForPrice[]): Promise<{
  priceMap: Record<string, PriceData>;
  exchangeRate: number;
  failed: string[];
  mock?: boolean;
}> {
  const internalToYahoo: Record<string, string> = Object.fromEntries(
    marketAssets.map(({ ticker, category }) => {
      const mapped = YAHOO_TICKER_MAP[ticker];
      if (mapped) return [ticker, mapped];
      // KRX 6자리 코드 → 자동으로 .KS 심볼로 변환 (네이버 금융 조회)
      if (isKrxCode(ticker)) return [ticker, `${ticker}.KS`];
      // Crypto: "BTC" → "BTC-USD", "BTC-USD" → "BTC-USD" (이미 있으면 그대로)
      if (category === "Crypto") {
        return [ticker, ticker.includes("-") ? ticker : `${ticker}-USD`];
      }
      return [ticker, ticker];
    })
  );
  const yahooToInternal: Record<string, string> = Object.fromEntries(
    Object.entries(internalToYahoo).map(([internal, yahoo]) => [yahoo, internal])
  );

  const yahooTickers = Object.values(internalToYahoo);
  const params = new URLSearchParams({ tickers: yahooTickers.join(",") });

  const res = await fetch(`/api/prices?${params}`);
  if (!res.ok) throw new Error(`가격 조회 실패: HTTP ${res.status}`);

  const { prices: rawPrices, exchangeRate, failed = [], mock }: PricesApiResponse = await res.json();
  if (mock) console.warn("[api] ⚠ Yahoo Finance 차단 — Mock 데이터 사용 중");

  // Yahoo 심볼 → 내부 ticker로 역매핑
  const priceMap: Record<string, PriceData> = Object.fromEntries(
    Object.entries(rawPrices).map(([yahooSymbol, data]) => [
      yahooToInternal[yahooSymbol] ?? yahooSymbol,
      data,
    ])
  );

  // 안전망: route.ts에서 이미 -USD를 제거하지만, 혹시 남아있는 키도 제거
  const sanitized: Record<string, PriceData> = {};
  for (const [k, v] of Object.entries(priceMap)) {
    sanitized[k.endsWith("-USD") ? k.replace(/-USD$/, "") : k] = v;
  }

  return { priceMap: sanitized, exchangeRate, failed, mock };
}

/**
 * 포트폴리오 페이지에서 사용하는 시세 조회 훅.
 * `refresh()`를 호출하면 현재가 + 환율을 가져와 store를 업데이트한다.
 */
export function useAssetPrices() {
  const { assets, updatePrices, setExchangeRate, recordSnapshot, setLastPriceUpdate } =
    useAssetStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const marketAssets = assets
        .filter((a) => !NON_MARKET_CATEGORIES.has(a.category))
        .map((a) => ({ ticker: a.ticker, category: a.category }));

      const { priceMap, exchangeRate, failed, mock } = await fetchAssetPrices(marketAssets);
      updatePrices(priceMap);
      setExchangeRate(exchangeRate);
      recordSnapshot();
      const now = new Date();
      setLastUpdated(now);
      setLastPriceUpdate(now.getTime());
      setUsingMock(!!mock);
      // Cache for window.debugAssets() diagnostic
      _lastDebugInfo = { priceMap, failed, fetchedAt: now, mock };
      // Surface partial failures as a soft warning (non-blocking)
      if (mock) {
        setError("Yahoo Finance 차단 감지 — Mock 데이터로 표시 중 (실제 시세 아님)");
      } else if (failed.length > 0) {
        setError(`일부 시세 조회 실패: ${failed.join(", ")} — 나머지 자산은 정상 업데이트됨`);
      }
    } catch (e) {
      // Store prices are NOT cleared — existing values remain as last-known data
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [assets, updatePrices, setExchangeRate, recordSnapshot, setLastPriceUpdate]);

  return { refresh, loading, error, lastUpdated, usingMock, assets };
}
