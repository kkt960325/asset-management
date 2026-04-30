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
}> {
  const internalToYahoo: Record<string, string> = Object.fromEntries(
    marketAssets.map(({ ticker, category }) => {
      const mapped = YAHOO_TICKER_MAP[ticker];
      if (mapped) return [ticker, mapped];
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

  const { prices: rawPrices, exchangeRate }: PricesApiResponse = await res.json();

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

  return { priceMap: sanitized, exchangeRate };
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
      const marketAssets = assets
        .filter((a) => !NON_MARKET_CATEGORIES.has(a.category))
        .map((a) => ({ ticker: a.ticker, category: a.category }));

      const { priceMap, exchangeRate } = await fetchAssetPrices(marketAssets);
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
