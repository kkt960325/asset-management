"use client";

import { useCallback, useState } from "react";
import { useAssetStore } from "./store";
import type { PriceData } from "./types";

/**
 * 내부 ticker → Yahoo Finance 심볼 매핑.
 *
 * 한국 ETF는 "{KRX 6자리 코드}.KS" 형식을 사용한다.
 * ISA-SEMI / ISA-200 / TIGER K방산 코드는 KRX 공시 후 교체 필요.
 *
 * KRX금현물: GC=F(COMEX 금 선물, USD/oz) → shares(kg) × 32.1507(oz/kg) × price × USD/KRW 로 환산
 */
export const YAHOO_TICKER_MAP: Record<string, string> = {
  "KRX금현물":   "GC=F",       // COMEX 금 선물(USD/oz) — 금현물 근사치, 환율 환산 별도 필요
  // "TIGER K방산": "305720.KS", // KRX 코드 확인 필요
  // "ISA-SEMI":    "453810.KS", // KRX 코드 확인 필요
  // "ISA-200":     "481460.KS", // KRX 코드 확인 필요
};

/** 시세 조회 대상에서 제외할 카테고리 (잔액 = 평가금액) */
const NON_MARKET_CATEGORIES = new Set(["주택청약", "IRP"]);

/**
 * 내부 ticker 배열의 현재가를 Route Handler(/api/prices)를 통해 조회한다.
 * CORS 없이 서버에서 Yahoo Finance를 호출하고, 실패한 종목은 결과에서 제외된다.
 *
 * @returns ticker → PriceData 맵 (조회 성공한 종목만 포함)
 */
export async function fetchAssetPrices(
  tickers: string[]
): Promise<Record<string, PriceData>> {
  // 내부 ticker → Yahoo 심볼로 변환하고, 역방향 맵도 함께 생성
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

  const raw: Record<string, PriceData> = await res.json();

  // Yahoo 심볼 → 내부 ticker로 역매핑하여 반환
  return Object.fromEntries(
    Object.entries(raw).map(([yahooSymbol, data]) => [
      yahooToInternal[yahooSymbol] ?? yahooSymbol,
      data,
    ])
  );
}

/**
 * 포트폴리오 페이지에서 사용하는 시세 조회 훅.
 * `refresh()`를 호출하면 시장 자산의 현재가를 가져와 store의 currentValue를 업데이트한다.
 *
 * @example
 * const { refresh, loading, error, lastUpdated } = useAssetPrices();
 * useEffect(() => { refresh(); }, []);
 */
export function useAssetPrices() {
  const { assets, updatePrices, recordSnapshot } = useAssetStore();
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

      const priceMap = await fetchAssetPrices(marketTickers);
      updatePrices(priceMap);
      recordSnapshot();
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [assets, updatePrices, recordSnapshot]);

  return { refresh, loading, error, lastUpdated };
}
