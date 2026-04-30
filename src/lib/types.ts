export type AssetCategory =
  | "미국주식"
  | "금현물"
  | "ISA-ETF"
  | "주택청약"
  | "IRP"
  | "Crypto"
  | "부동산";

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  /** 보유 수량. 주택청약·IRP는 잔액(원)을 그대로 저장. 부동산은 1 고정 */
  shares: number;
  category: AssetCategory;
  /** 목표 비중 (0–100, %) */
  targetRatio: number;
  /** 단가. 시장 자산만 존재, 비시장 자산은 undefined */
  currentPrice?: number;
  /** 평가금액 = shares × currentPrice. 비시장 자산은 shares 값이 곧 평가금액 */
  currentValue?: number;
  /** 가격 통화 (USD | KRW). 미국주식은 USD, 한국 자산은 KRW */
  currency?: string;
  /** 부동산 전용: 사용자가 직접 입력한 KRW 평가금액. 시세 갱신 시 초기화 안 됨 */
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
