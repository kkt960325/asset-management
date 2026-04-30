import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const runtime = "nodejs";

const yf = new YahooFinance();

// ── 상수 ──────────────────────────────────────────────────────────────────────
const GOLD_COMEX = "GC=F";
const USDKRW_TICKER = "USDKRW=X";
const GOLD_G_PER_OZ = 31.1035;   // 1 troy oz = 31.1035 g (정확한 환산)
const USDKRW_FALLBACK = 1_400;   // Yahoo 환율 조회 실패 시 사용

// ── 응답 타입 ─────────────────────────────────────────────────────────────────
export type PricesApiResponse = {
  prices: Record<string, { price: number; currency: string }>;
  /** 실시간 USD/KRW 환율. 조회 실패 시 폴백 값 반환 */
  exchangeRate: number;
};

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

  if (tickers.length === 0) {
    return NextResponse.json<PricesApiResponse>({ prices: {}, exchangeRate: USDKRW_FALLBACK });
  }

  // USDKRW=X 는 환율 표시 및 금현물 환산에 항상 필요
  const fetchList: string[] = Array.from(new Set([...tickers, USDKRW_TICKER]));

  const settled = await Promise.allSettled(fetchList.map(fetchOne));

  const rawPrices: Record<string, { price: number; currency: string }> = {};
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value.price !== null) {
      rawPrices[r.value.ticker] = { price: r.value.price, currency: r.value.currency };
    }
  }

  const exchangeRate = rawPrices[USDKRW_TICKER]?.price ?? USDKRW_FALLBACK;

  // GC=F(USD/oz) → KRW/g 변환
  // KRX 금현물 shares 단위는 g(그램). 1 troy oz = 31.1035 g
  // price(KRW/g) = goldUSD/oz ÷ 31.1035 g/oz × USD/KRW 환율
  if (rawPrices[GOLD_COMEX]) {
    rawPrices[GOLD_COMEX] = {
      price: (rawPrices[GOLD_COMEX].price / GOLD_G_PER_OZ) * exchangeRate,
      currency: "KRW",
    };
  }

  // 응답: 요청된 티커만 포함 (USDKRW=X 는 exchangeRate 필드로 별도 반환)
  const prices: Record<string, { price: number; currency: string }> = {};
  for (const ticker of tickers) {
    if (rawPrices[ticker]) prices[ticker] = rawPrices[ticker];
  }

  return NextResponse.json<PricesApiResponse>({ prices, exchangeRate });
}
