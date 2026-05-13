import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const runtime = "nodejs";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** Yahoo chart API 응답 타입 */
export type ChartApiResponse = {
  ticker: string;
  currency: string;
  currentPrice: number | null;
  /** [timestamp_ms, open, high, low, close, volume] */
  candles: Array<[number, number, number, number, number, number]>;
  error?: string;
};

/**
 * Yahoo Finance에서 과거 가격 차트 데이터를 가져온다.
 * GET /api/chart?ticker=AAPL&range=6mo&interval=1d
 *
 * 지원 range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y
 * 지원 interval: 1m, 5m, 15m, 1h, 1d, 1wk, 1mo
 */
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim();
  const range = req.nextUrl.searchParams.get("range") ?? "6mo";
  const interval = req.nextUrl.searchParams.get("interval") ?? "1d";

  if (!ticker) {
    return NextResponse.json<ChartApiResponse>(
      { ticker: "", currency: "USD", currentPrice: null, candles: [], error: "ticker is required" },
      { status: 400 }
    );
  }

  try {
    // yahoo-finance2 chart() 또는 historical() 사용
    // chart()가 더 풍부한 데이터를 제공하지만, 호환성을 위해 historical() 사용
    const now = new Date();
    const period2 = now;

    // range → period1 계산
    const period1 = new Date(now);
    switch (range) {
      case "1d":  period1.setDate(period1.getDate() - 1); break;
      case "5d":  period1.setDate(period1.getDate() - 5); break;
      case "1mo": period1.setMonth(period1.getMonth() - 1); break;
      case "3mo": period1.setMonth(period1.getMonth() - 3); break;
      case "6mo": period1.setMonth(period1.getMonth() - 6); break;
      case "1y":  period1.setFullYear(period1.getFullYear() - 1); break;
      case "2y":  period1.setFullYear(period1.getFullYear() - 2); break;
      case "5y":  period1.setFullYear(period1.getFullYear() - 5); break;
      default:    period1.setMonth(period1.getMonth() - 6); break;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [histData, quoteData] = await Promise.allSettled([
      yf.chart(ticker, {
        period1,
        period2,
        interval: interval as "1d" | "1wk" | "1mo",
      }),
      yf.quote(ticker),
    ]);

    let candles: Array<[number, number, number, number, number, number]> = [];
    let currency = "USD";
    let currentPrice: number | null = null;

    // chart 데이터 처리
    if (histData.status === "fulfilled" && histData.value) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chartResult = histData.value as any;
      const quotes = chartResult.quotes ?? [];
      currency = chartResult.meta?.currency ?? "USD";

      for (const q of quotes) {
        if (q.date && q.close != null) {
          candles.push([
            new Date(q.date).getTime(),
            q.open ?? q.close,
            q.high ?? q.close,
            q.low ?? q.close,
            q.close,
            q.volume ?? 0,
          ]);
        }
      }
    }

    // quote 데이터로 현재가 확보
    if (quoteData.status === "fulfilled" && quoteData.value) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q = quoteData.value as any;
      currentPrice = q.regularMarketPrice ?? null;
      if (q.currency) currency = q.currency;
    }

    // candle 없으면 quote의 현재가라도 반환
    if (candles.length === 0 && currentPrice !== null) {
      candles = [[Date.now(), currentPrice, currentPrice, currentPrice, currentPrice, 0]];
    }

    console.log(`[chart] ✓ ${ticker}: ${candles.length} candles, price=${currentPrice}, currency=${currency}`);

    return NextResponse.json<ChartApiResponse>({
      ticker,
      currency,
      currentPrice,
      candles,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[chart] ✗ ${ticker} 조회 실패: ${msg}`);

    return NextResponse.json<ChartApiResponse>(
      { ticker, currency: "USD", currentPrice: null, candles: [], error: msg },
      { status: 500 }
    );
  }
}
