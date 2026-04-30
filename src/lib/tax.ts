import type { AssetCategory } from "./types";

// ── 세율 ──────────────────────────────────────────────────────────────────────

/**
 * 카테고리별 실효 세율 (지방소득세 포함).
 *
 * 미국주식 / 금현물: 양도소득세·기타소득세 20% + 지방소득세 2% = 22%
 * ISA-ETF           : ISA 계좌 내 비과세 (0%)
 * 주택청약 / IRP    : 매도형 자산 아님 (0%)
 */
export const TAX_RATE: Record<AssetCategory, number> = {
  "미국주식": 0.22,
  "금현물":   0.22,
  "ISA-ETF":  0,
  "주택청약": 0,
  "IRP":      0,
  "Crypto":   0.22,
};

/** 연간 기본공제 — 해외주식·금현물 양도차익 (원) */
export const ANNUAL_DEDUCTION_KRW = 2_500_000;

/** 원/달러 참고 환율 (세금 추정 전용, 실제 신고 시 거래일 환율 적용) */
const USD_KRW_APPROX = 1_400;

/** 달러 기준 연간 기본공제 */
export const ANNUAL_DEDUCTION_USD = ANNUAL_DEDUCTION_KRW / USD_KRW_APPROX;

// ── 결과 타입 ─────────────────────────────────────────────────────────────────

export type TaxEstimate = {
  /** 세금 계산 대상 여부 (세율 > 0 이고 매도 금액 > 0) */
  applicable: boolean;
  /** 적용 세율 (0–1) */
  taxRate: number;
  /** 매도 예상 금액 (통화는 currency 필드 참조) */
  sellValue: number;
  /** 연간 기본공제 한도 (통화 기준) */
  deductionLimit: number;
  /** 공제 적용 후 과세 대상 금액 */
  taxableGain: number;
  /** 예상 세금 = taxableGain × taxRate */
  estimatedTax: number;
  /** 이번 매도 후 남는 공제 잔여액 */
  deductionRemaining: number;
  /** 통화 코드 */
  currency: string;
};

/** 카테고리별 세금 안내 문구 */
export const TAX_NOTE: Record<AssetCategory, string> = {
  "미국주식": "해외주식 양도소득세 22% (세율 20% + 지방세 2%).\n연간 기본공제 ₩2,500,000 적용.\n(USD 기준 약 $1,786 — 참고용 근사 환율)",
  "금현물":   "금 현물 기타소득세 22% (세율 20% + 지방세 2%).\n연간 기본공제 ₩2,500,000 적용.",
  "ISA-ETF":  "ISA 계좌 내 매매차익은 비과세 혜택이 적용됩니다.",
  "주택청약": "청약저축은 자유 매도 불가 상품입니다.",
  "IRP":      "IRP 해지 시 기타소득세 16.5%가 적용됩니다.",
  "Crypto":   "가상자산 양도소득세 22% (세율 20% + 지방세 2%).\n연간 기본공제 ₩2,500,000 적용.\n※ 실제 과세 시점·세율은 법령 변동에 따라 다를 수 있음.",
};

// ── 핵심 계산 함수 ────────────────────────────────────────────────────────────

/**
 * 매도 신호 발생 시 예상 세금 간이 추정.
 *
 * sellValue 는 실제 양도차익이 아닌 매도 예상 금액을 기준으로 한
 * 보수적(최대) 추정치입니다. 실제 세금은 매입 단가 적용 후 결정됩니다.
 *
 * @param sellValue   매도 예상 금액 (절댓값, 자산 통화 기준)
 * @param category    자산 카테고리
 * @param currency    통화 코드 ("KRW" | "USD")
 */
export function estimateSellTax(
  sellValue: number,
  category: AssetCategory,
  currency: string = "KRW"
): TaxEstimate {
  const taxRate = TAX_RATE[category];
  const deductionLimit =
    currency === "USD" ? ANNUAL_DEDUCTION_USD : ANNUAL_DEDUCTION_KRW;

  if (taxRate === 0 || sellValue <= 0) {
    return {
      applicable: false,
      taxRate: 0,
      sellValue,
      deductionLimit,
      taxableGain: 0,
      estimatedTax: 0,
      deductionRemaining: deductionLimit,
      currency,
    };
  }

  const taxableGain = Math.max(0, sellValue - deductionLimit);
  const estimatedTax = taxableGain * taxRate;
  const deductionRemaining = Math.max(0, deductionLimit - sellValue);

  return {
    applicable: true,
    taxRate,
    sellValue,
    deductionLimit,
    taxableGain,
    estimatedTax,
    deductionRemaining,
    currency,
  };
}

// ── 포맷 유틸 (컴포넌트에서 재사용) ───────────────────────────────────────────

export function fmtTaxAmount(amount: number, currency: string): string {
  if (currency === "USD") {
    return "$" + amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return "₩" + Math.round(amount).toLocaleString("ko-KR");
}
