"use client";

import { useCallback, useState } from "react";
import { useAssetStore } from "./store";
import type { PriceData } from "./types";
import type { PricesApiResponse } from "@/app/api/prices/route";

/**
 * 내부 ticker → Yahoo Finance 심볼 매핑.
 *
 * KRX금현물: GC=F(COMEX 금 선물, USD/oz) → route.ts에서 KRW/g으로 환산
 */
export const YAHOO_TICKER_MAP: Record<string, string> = {
  "KRX금현물": "GC=F",
  // "TIGER K방산": "305720.KS", // KRX 코드 확인 필요
  // "ISA-SEMI":    "453810.KS", // KRX 코드 확인 필요
  // "ISA-200":     "481460.KS", // KRX 코드 확인 필요
};

/** 시세 조회 대상에서 제외할 카테고리 (잔액 = 평가금액) */
const NON_MARKET_CATEGORIES = new Set(["주택청약", "IRP"]);

/**
 * 내부 ticker 배열의 현재가와 실시간 환율을 Route Handler(/api/prices)를 통해 조회한다.
 *
 * @returns `{ priceMap, exchangeRate }` — priceMap은 조회 성공한 종목만 포함
 */
export async function fetchAssetPrices(tickers: string[]): Promise<{
  priceMap: Record<string, PriceData>;
  exchangeRate: number;
}> {
  const internalToYahoo: Record<string, string> = Object.fromEntries(
    tickers.map((t) => [t, YAHOO_TICKER_MAP[t] ?? t])
  );
  const yahooToInternal: Record<string, string> = Object.fromEntries(
    Object.entries(internalToYahoo).map(([internal, yahoo]) => [yahoo, internal])
  );

  const yahooTickers = Object.values(internalToYahoo);
  const params = new URLSearchParams({ tickers: yahooTickers.join(",") });

  const res = await fetch(`/api/prices?${params}`);
  if (!res.ok) throw new Error(`가격 조회 실패: HTTP ${res.status}`);

  const { prices: rawPrices, exchangeRate }: PricesApiResponse = await res.json();

  // Yahoo 심볼 → 내부 ticker로 역매핑
  const priceMap: Record<string, PriceData> = Object.fromEntries(
    Object.entries(rawPrices).map(([yahooSymbol, data]) => [
      yahooToInternal[yahooSymbol] ?? yahooSymbol,
      data,
    ])
  );

  return { priceMap, exchangeRate };
}

/**
 * 포트폴리오 페이지에서 사용하는 시세 조회 훅.
 * `refresh()`를 호출하면 현재가 + 환율을 가져와 store를 업데이트한다.
 */
export function useAssetPrices() {
  const { assets, updatePrices, setExchangeRate, recordSnapshot } = useAssetStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const marketTickers = assets
        .filter((a) => !NON_MARKET_CATEGORIES.has(a.category))
        .map((a) => a.ticker);

      const { priceMap, exchangeRate } = await fetchAssetPrices(marketTickers);
      updatePrices(priceMap);
      setExchangeRate(exchangeRate);
      recordSnapshot();
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [assets, updatePrices, setExchangeRate, recordSnapshot]);

  return { refresh, loading, error, lastUpdated };
}
