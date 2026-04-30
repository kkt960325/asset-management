"use client";

import { useCallback, useState } from "react";
import { useAssetStore } from "./store";
import type { PriceData } from "./types";
import type { PricesApiResponse } from "@/app/api/prices/route";

/**
 * 내부 ticker → Yahoo Finance 심볼 매핑.
 *
 * 한국 ETF는 KRX 6자리 코드 + ".KS" 형식.
 * KRX금현물은 GC=F(COMEX 금 선물, USD/oz) → route.ts에서 KRW/g으로 환산.
 */
export const YAHOO_TICKER_MAP: Record<string, string> = {
  // KRX 금현물
  "KRX금현물":  "GC=F",
  // ISA 계좌 ETF (KOSPI 상장, .KS 접미사)
  "ISA-SEMI":   "452560.KS",   // 1Q K반도체TOP2채권혼합50
  "ISA-200":    "414810.KS",   // 1Q 200액티브
  "TIGER K방산": "443330.KS",  // TIGER K방산&우주
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
