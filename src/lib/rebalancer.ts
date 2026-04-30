import type { Asset } from "./types";

// ── 결과 타입 ─────────────────────────────────────────────────────────────────

export type AssetRebalanceResult = {
  id: string;
  ticker: string;
  name: string;
  /** 현재 평가금액 V_i (currentValue 없는 자산은 0) */
  currentValue: number;
  /** 현재 비중 W_i = V_i / V_total (0–1 소수). V_total = 0이면 0 */
  currentWeight: number;
  /** 목표 비중 W_target = targetRatio / 100 (0–1 소수) */
  targetWeight: number;
  /** 비중 괴리 W_i − W_target (0–1 소수). 양수 = 초과, 음수 = 부족 */
  weightDeviation: number;
  /** 비중 괴리율 (퍼센트포인트). 양수 = 초과, 음수 = 부족 */
  deviationPct: number;
  /**
   * 리밸런싱 필요 금액 ΔV_i = (W_target − W_i) × V_total
   * 양수 = 매수, 음수 = 매도
   */
  rebalanceAmount: number;
  /**
   * 임계치 초과 여부.
   * targetRatio > 0 인 자산에 한해 |deviationPct| > thresholdPct 이면 true.
   * targetRatio = 0 (목표 미설정)은 알림 대상에서 제외.
   */
  needsRebalancing: boolean;
};

export type RebalanceSummary = {
  /** 전체 평가금액 합산. USD·KRW 혼재 시 환율 환산 없이 단순 합산됨 */
  totalValue: number;
  results: AssetRebalanceResult[];
  /** 임계치를 초과한 자산이 하나라도 있으면 true */
  needsRebalancing: boolean;
  /** 사용자 설정 임계치 (퍼센트포인트, 예: 3 → ±3%p) */
  thresholdPct: number;
};

// ── 핵심 계산 함수 ────────────────────────────────────────────────────────────

/**
 * 포트폴리오 리밸런싱 계산.
 *
 * @param assets     스토어의 자산 배열
 * @param thresholdPct  알림 임계치 (퍼센트포인트, 예: 3 → ±3%p)
 *
 * @example
 * const summary = calcRebalance(assets, 3);
 * summary.needsRebalancing;       // 알림 발생 여부
 * summary.results[0].deviationPct // 첫 번째 자산의 괴리율(%)
 */
export function calcRebalance(
  assets: Asset[],
  thresholdPct: number
): RebalanceSummary {
  const totalValue = assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0);

  const results: AssetRebalanceResult[] = assets.map((a) => {
    const currentValue = a.currentValue ?? 0;
    const currentWeight = totalValue > 0 ? currentValue / totalValue : 0;
    const targetWeight = a.targetRatio / 100;
    const weightDeviation = currentWeight - targetWeight;
    const deviationPct = weightDeviation * 100;
    const rebalanceAmount =
      totalValue > 0 ? (targetWeight - currentWeight) * totalValue : 0;
    const needsRebalancing =
      a.targetRatio > 0 && Math.abs(deviationPct) > thresholdPct;

    return {
      id: a.id,
      ticker: a.ticker,
      name: a.name,
      currentValue,
      currentWeight,
      targetWeight,
      weightDeviation,
      deviationPct,
      rebalanceAmount,
      needsRebalancing,
    };
  });

  return {
    totalValue,
    results,
    needsRebalancing: results.some((r) => r.needsRebalancing),
    thresholdPct,
  };
}

// ── 보조 유틸 ─────────────────────────────────────────────────────────────────

/** 목표 비중 합계가 100%인지 검증. 설정 UI에서 저장 전 사용 */
export function validateTargetRatios(assets: Asset[]): {
  valid: boolean;
  totalTargetPct: number;
} {
  const totalTargetPct = assets.reduce((sum, a) => sum + a.targetRatio, 0);
  return { valid: Math.abs(totalTargetPct - 100) < 0.01, totalTargetPct };
}

/** 매수/매도 금액이 큰 순으로 정렬된 결과 반환 (UI 우선순위 표시용) */
export function sortByUrgency(
  results: AssetRebalanceResult[]
): AssetRebalanceResult[] {
  return [...results].sort(
    (a, b) => Math.abs(b.rebalanceAmount) - Math.abs(a.rebalanceAmount)
  );
}
