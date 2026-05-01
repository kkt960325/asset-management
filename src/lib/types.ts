export type AssetCategory =
  | "미국주식"    // US equities → Yahoo Finance USD
  | "한국주식"    // KRX equities → Naver Finance KRW
  | "해외주식"    // International equities (ex-US, ex-KR) → Yahoo USD
  | "국내ETF"     // Korean ETFs → Naver Finance KRW
  | "해외ETF"     // Overseas ETFs → Yahoo USD
  | "채권"        // Bonds (any exchange, auto-detected by ticker)
  | "Crypto"      // Cryptocurrency → Binance / CoinGecko
  | "KRX금현물"   // KRX 금시장 금 현물 → 비과세 (Yahoo GC=F → KRW/g)
  | "금/원자재"   // 실물금·골드뱅킹·원자재 선물 → Yahoo (GC=F, CL=F …)
  | "부동산"      // Real Estate → manual entry
  | "현금/예금"   // Cash & Deposits → manual entry
  | "연금/퇴직"   // Pension & Retirement → manual entry
  | "보험/기타";  // Insurance & Miscellaneous → manual entry

/** 시장 시세 없이 사용자가 직접 평가금액을 입력하는 카테고리 */
export const MANUAL_CATEGORIES = new Set<AssetCategory>([
  "부동산",
  "현금/예금",
  "연금/퇴직",
  "보험/기타",
]);

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  /** 보유 수량. 수동 자산(MANUAL_CATEGORIES)은 1 고정, 금 관련 카테고리는 g 단위 */
  shares: number;
  category: AssetCategory;
  /** 목표 비중 (0–100, %) */
  targetRatio: number;
  /** 단가. 시장 자산만 존재, 수동 자산은 undefined */
  currentPrice?: number;
  /** 평가금액 = shares × currentPrice. 수동 자산은 manualValue 사용 */
  currentValue?: number;
  /** 가격 통화 (USD | KRW) */
  currency?: string;
  /** 수동 자산 전용: 사용자가 직접 입력한 KRW 평가금액. 시세 갱신 시 초기화 안 됨 */
  manualValue?: number;
}

/** addAsset 호출 시 id·시세 필드는 store에서 자동 처리 */
export type NewAssetInput = Omit<Asset, "id" | "currentPrice" | "currentValue" | "currency">;

/** Route Handler(/api/prices)가 반환하는 단일 종목 시세 */
export type PriceData = {
  price: number;
  currency: string;
};

/** 시세 갱신 시점의 포트폴리오 총액 스냅샷 */
export type ValueSnapshot = {
  /** Unix timestamp (ms) */
  ts: number;
  /** KRW 자산 평가금액 합산 */
  totalKrw: number;
  /** USD 자산 평가금액 합산 */
  totalUsd: number;
};
