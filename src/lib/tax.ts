import type { AssetCategory } from "./types";

// ── 세율 ──────────────────────────────────────────────────────────────────────

export const TAX_RATE: Record<AssetCategory, number> = {
  "미국주식":   0.22,    // 해외주식 양도소득세 22% (세율 20% + 지방세 2%)
  "한국주식":   0,       // 소액주주 양도차익 비과세 (대주주 제외)
  "해외주식":   0.22,    // 해외주식 양도소득세 22%
  "국내ETF":    0,       // 국내 ETF 매매차익 배당소득세 15.4% (단, ISA·연금 계좌 내 비과세)
  "해외ETF":    0.22,    // 해외 ETF 양도소득세 22%
  "채권":       0.154,   // 채권 이자소득세 15.4% (세율 14% + 지방세 1.4%)
  "Crypto":     0.22,    // 가상자산 양도소득세 22%
  "KRX금현물":  0,       // KRX 금시장 양도차익 비과세 (소득세법 §94 ①1호 제외)
  "금/원자재":  0.22,    // 기타소득세 22% (실물금·골드뱅킹·원자재 매매차익)
  "부동산":     0,       // 양도소득세 구조 복잡 — 별도 계산 필요
  "현금/예금":  0.154,   // 이자소득세 15.4%
  "연금/퇴직":  0.165,   // 기타소득세 16.5% (IRP·연금저축 해지 시)
  "보험/기타":  0,       // 보험 차익·기타 — 상품별 상이
};

/** 연간 기본공제 — 해외주식·금현물 등 양도차익 (원) */
export const ANNUAL_DEDUCTION_KRW = 2_500_000;

/** 원/달러 참고 환율 (세금 추정 전용) */
const USD_KRW_APPROX = 1_400;

/** 달러 기준 연간 기본공제 */
export const ANNUAL_DEDUCTION_USD = ANNUAL_DEDUCTION_KRW / USD_KRW_APPROX;

// ── 결과 타입 ─────────────────────────────────────────────────────────────────

export type TaxEstimate = {
  applicable: boolean;
  taxRate: number;
  sellValue: number;
  deductionLimit: number;
  taxableGain: number;
  estimatedTax: number;
  deductionRemaining: number;
  currency: string;
};

/** 카테고리별 세금 안내 문구 */
export const TAX_NOTE: Record<AssetCategory, string> = {
  "미국주식":
    "해외주식 양도소득세 22% (세율 20% + 지방세 2%).\n연간 기본공제 ₩2,500,000 적용.\n(USD 기준 약 $1,786 — 참고용 근사 환율)",
  "한국주식":
    "소액주주 주식 양도차익은 비과세입니다.\n대주주(지분 1% 이상 또는 시가 10억 초과)는 양도소득세 대상.",
  "해외주식":
    "해외주식 양도소득세 22% (세율 20% + 지방세 2%).\n연간 기본공제 ₩2,500,000 적용.",
  "국내ETF":
    "국내 ETF 매매차익은 배당소득세 15.4% 과세.\nISA·연금저축·IRP 계좌 내 보유 시 비과세 또는 분리과세 혜택 적용.",
  "해외ETF":
    "해외 상장 ETF는 해외주식 양도소득세 22% 적용.\n연간 기본공제 ₩2,500,000 적용.",
  "채권":
    "채권 이자소득세 15.4% (세율 14% + 지방세 1.4%).\n매매차익은 비과세이며, 이자(표면 수익)에만 세금이 부과됩니다.",
  "Crypto":
    "가상자산 양도소득세 22% (세율 20% + 지방세 2%).\n연간 기본공제 ₩2,500,000 적용.\n※ 실제 과세 시점·세율은 법령 변동에 따라 다를 수 있음.",
  "KRX금현물":
    "KRX(한국거래소) 금시장을 통한 금 현물 거래는 양도소득세 비과세입니다.\n(소득세법 제94조 제1항 제1호 열거 자산에서 제외)\n실물 인출 시 부가가치세(10%)가 부과될 수 있습니다.",
  "금/원자재":
    "실물금·골드뱅킹·원자재 선물 매매차익은 기타소득세 22% 적용.\n연간 기본공제 ₩2,500,000 적용.\n⚠️ KRX 금현물 계좌 거래는 '금/원자재'가 아닌 'KRX금현물' 카테고리를 사용하세요.",
  "부동산":
    "부동산 양도소득세는 보유기간·주택수·지역 등에 따라 복잡하게 산정됩니다.\n정확한 세금은 세무사 상담을 권장합니다.",
  "현금/예금":
    "이자소득세 15.4% (세율 14% + 지방세 1.4%) 적용.\nISA 계좌 편입 시 200만 원(서민형 400만 원)까지 비과세.",
  "연금/퇴직":
    "IRP·연금저축 중도해지 시 기타소득세 16.5% 적용.\n55세 이후 연금 수령 시 연금소득세 3.3~5.5%로 분리과세 가능.",
  "보험/기타":
    "보험 차익은 10년 이상 보유 시 비과세 혜택이 적용될 수 있습니다.\n상품별 조건이 상이하므로 약관을 확인하세요.",
};

// ── 핵심 계산 함수 ────────────────────────────────────────────────────────────

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

// ── 포맷 유틸 ─────────────────────────────────────────────────────────────────

export function fmtTaxAmount(amount: number, currency: string): string {
  if (currency === "USD") {
    return "$" + amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return "₩" + Math.round(amount).toLocaleString("ko-KR");
}
