import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// yahoo-finance2는 Node.js 런타임 필요 (edge 런타임 미지원)
export const runtime = "nodejs";

// v3 API: 반드시 new YahooFinance() 인스턴스를 사용해야 함
const yf = new YahooFinance();

// ── KRX 금현물 환산 상수 ──────────────────────────────────────────────────────
// GC=F : COMEX 금 선물 (USD/troy oz). KRX 금현물 단위 = 1 kg.
// 환산 : price(USD/oz) × 32.1507(oz/kg) × USD/KRW → KRW/kg
const GOLD_COMEX = "GC=F";
const USDKRW_TICKER = "USDKRW=X";
const GOLD_OZ_PER_KG = 32.1507;
const USDKRW_FALLBACK = 1_400; // Yahoo 환율 조회 실패 시 사용

async function fetchOne(ticker: string): Promise<{ ticker: string; price: number | null; currency: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quote = (await yf.quote(ticker)) as any;
  return {
    ticker,
    price: (quote?.regularMarketPrice as number | undefined) ?? null,
    currency: (quote?.currency as string | undefined) ?? "USD",
  };
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("tickers") ?? "";
  const tickers = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tickers.length === 0) return NextResponse.json({});

  // 금현물이 포함된 경우 USD/KRW 환율도 함께 조회
  const needsGoldConvert = tickers.includes(GOLD_COMEX);
  const fetchList: string[] = needsGoldConvert
    ? Array.from(new Set([...tickers, USDKRW_TICKER]))
    : tickers;

  const settled = await Promise.allSettled(fetchList.map(fetchOne));

  // 결과 맵 구성
  const rawPrices: Record<string, { price: number; currency: string }> = {};
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value.price !== null) {
      rawPrices[r.value.ticker] = { price: r.value.price, currency: r.value.currency };
    }
  }

  // GC=F(USD/oz) → KRW/kg 변환
  if (needsGoldConvert && rawPrices[GOLD_COMEX]) {
    const usdKrw = rawPrices[USDKRW_TICKER]?.price ?? USDKRW_FALLBACK;
    rawPrices[GOLD_COMEX] = {
      price: rawPrices[GOLD_COMEX].price * GOLD_OZ_PER_KG * usdKrw,
      currency: "KRW",
    };
  }

  // 응답에서 USDKRW=X 는 제외 (내부 계산용 헬퍼)
  const prices: Record<string, { price: number; currency: string }> = {};
  for (const ticker of tickers) {
    if (rawPrices[ticker]) prices[ticker] = rawPrices[ticker];
  }

  return NextResponse.json(prices);
}
