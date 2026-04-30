import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

const yf = new YahooFinance();

// ── 상수 ──────────────────────────────────────────────────────────────────────
const GOLD_COMEX      = "GC=F";
const USDKRW_TICKER   = "USDKRW=X";
const GOLD_G_PER_OZ   = 31.1035;   // 1 troy oz = 31.1035 g
const USDKRW_FALLBACK = 1_400;

// ── 네이버 금융 스크래핑 대상 ─────────────────────────────────────────────────
// Yahoo Finance DB 미등재 국내 ETF: .KS 심볼 → 네이버 금융 6자리 코드
const NAVER_KS_MAP: Record<string, string> = {
  "452560.KS": "452560",   // 1Q K반도체TOP2채권혼합50  (ISA-SEMI)
  "414810.KS": "414810",   // 1Q 200액티브              (ISA-200)
  "443330.KS": "443330",   // TIGER K방산&우주           (TIGER K방산)
};

// ── 정적 폴백 단가 (Supabase 연동 전 임시 — Vercel US 서버에서 네이버 차단 대응) ──
// 실제 최신 단가로 수동 업데이트 필요. Supabase 연결 후 이 맵을 제거할 것.
const STATIC_KRW_PRICES: Record<string, number> = {
  "452560.KS": 10_200,   // ISA-SEMI  (1Q K반도체TOP2채권혼합50)
  "414810.KS": 10_500,   // ISA-200   (1Q 200액티브)
  "443330.KS": 11_000,   // TIGER K방산&우주
};

// ── 응답 타입 ─────────────────────────────────────────────────────────────────
export type PricesApiResponse = {
  prices: Record<string, { price: number; currency: string }>;
  /** 실시간 USD/KRW 환율. 조회 실패 시 폴백 값 반환 */
  exchangeRate: number;
};

// ── Yahoo Finance 단일 종목 조회 ──────────────────────────────────────────────
async function fetchYahoo(
  ticker: string
): Promise<{ ticker: string; price: number | null; currency: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = (await yf.quote(ticker)) as any;
    return {
      ticker,
      price: (quote?.regularMarketPrice as number | undefined) ?? null,
      currency: (quote?.currency as string | undefined) ?? "USD",
    };
  } catch (err) {
    console.warn(
      `[yahoo] ${ticker} 조회 실패:`,
      err instanceof Error ? err.message : String(err)
    );
    return { ticker, price: null, currency: "USD" };
  }
}

// ── 네이버 금융 현재가 조회 ────────────────────────────────────────────────────
// Primary: 모바일 JSON API (IP 차단 가능성 낮음, 파싱 불필요)
// Fallback: PC 웹 HTML 스크래핑
async function fetchNaver(
  ticker: string
): Promise<{ ticker: string; price: number | null; currency: string }> {
  const code = NAVER_KS_MAP[ticker];
  if (!code) return { ticker, price: null, currency: "KRW" };

  // ── 0차: 정적 단가 즉시 반환 (네이버 차단 환경 대응) ─────────────────────────
  if (ticker in STATIC_KRW_PRICES) {
    return { ticker, price: STATIC_KRW_PRICES[ticker], currency: "KRW" };
  }

  // ── 1차: 모바일 JSON API ───────────────────────────────────────────────────
  try {
    const mobileUrl = `https://m.stock.naver.com/api/stock/${code}/basic`;
    const res = await fetch(mobileUrl, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "application/json",
        Referer: "https://m.stock.naver.com/",
      },
    });
    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      // closePrice (장 마감) 또는 현재가 필드 — 쉼표 포함 문자열일 수 있음
      const raw: string | undefined =
        data?.closePrice ?? data?.currentPrice ?? data?.stockEndPrice;
      if (raw) {
        const price = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
        if (!isNaN(price) && price >= 100) {
          return { ticker, price, currency: "KRW" };
        }
      }
    }
    console.warn(`[naver-mobile] ${ticker}(${code}) JSON 파싱 실패 — HTML 폴백`);
  } catch (err) {
    console.warn(
      `[naver-mobile] ${ticker}(${code}) 요청 실패:`,
      err instanceof Error ? err.message : String(err)
    );
  }

  // ── 2차: PC 웹 HTML 스크래핑 ──────────────────────────────────────────────
  try {
    const url = `https://finance.naver.com/item/main.naver?code=${code}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://finance.naver.com/",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // 네이버 금융 페이지 인코딩 처리 (EUC-KR 또는 UTF-8)
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "";
    const charset =
      contentType.match(/charset=([^\s;]+)/i)?.[1]?.toLowerCase() ?? "utf-8";
    const html = new TextDecoder(
      charset === "euc-kr" ? "euc-kr" : "utf-8"
    ).decode(buffer);

    const $ = cheerio.load(html);

    // 현재가 선택자 — 우선순위 순으로 시도
    const candidates: string[] = [
      $("#_nowVal").first().text(),
      $("div.today p.no_today span.blind").first().text(),
      $("div.today .no_today em").first().text(),
      $("div.today strong em").first().text(),
      $(".today em").first().text(),
    ];

    for (const raw of candidates) {
      const digits = raw.replace(/[^0-9]/g, "");
      if (digits.length >= 2) {
        const price = parseInt(digits, 10);
        if (!isNaN(price) && price >= 100) {
          return { ticker, price, currency: "KRW" };
        }
      }
    }

    throw new Error(
      `가격 파싱 실패 — 시도 결과: [${candidates
        .map((c) => `"${c.trim().slice(0, 30)}"`)
        .join(", ")}]`
    );
  } catch (err) {
    console.warn(
      `[naver-html] ${ticker}(${code}) 조회 실패:`,
      err instanceof Error ? err.message : String(err)
    );
    return { ticker, price: null, currency: "KRW" };
  }
}

// ── Route Handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("tickers") ?? "";
  const tickers = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tickers.length === 0) {
    return NextResponse.json<PricesApiResponse>({
      prices: {},
      exchangeRate: USDKRW_FALLBACK,
    });
  }

  // ── 소스별 분리 ───────────────────────────────────────────────────────────
  const naverTickers = tickers.filter((t) => t in NAVER_KS_MAP);
  const yahooOnlyTickers = tickers.filter((t) => !(t in NAVER_KS_MAP));

  // Yahoo: USDKRW=X 는 환율 산출 및 금현물 변환에 항상 필요
  const yahooFetchList: string[] = Array.from(
    new Set([...yahooOnlyTickers, USDKRW_TICKER])
  );

  // ── 병렬 조회 ─────────────────────────────────────────────────────────────
  const [yahooResults, naverResults] = await Promise.all([
    Promise.allSettled(yahooFetchList.map(fetchYahoo)),
    Promise.allSettled(naverTickers.map(fetchNaver)),
  ]);

  const rawPrices: Record<string, { price: number; currency: string }> = {};
  for (const r of [...yahooResults, ...naverResults]) {
    if (r.status === "fulfilled" && r.value.price !== null) {
      rawPrices[r.value.ticker] = {
        price: r.value.price,
        currency: r.value.currency,
      };
    }
    // rejected / price:null → 해당 종목 제외 → 클라이언트에서 이전 가격 유지
  }

  const exchangeRate = rawPrices[USDKRW_TICKER]?.price ?? USDKRW_FALLBACK;

  // GC=F: USD/oz → KRW/g
  // 예) $3,300/oz ÷ 31.1035 g/oz = $106.1/g × 1,400 KRW/USD = ₩148,526/g
  // store.updatePrices: currentValue = shares(g) × ₩/g → 단순 곱셈, ×1000 없음
  if (rawPrices[GOLD_COMEX]) {
    rawPrices[GOLD_COMEX] = {
      price: (rawPrices[GOLD_COMEX].price / GOLD_G_PER_OZ) * exchangeRate,
      currency: "KRW",
    };
  }

  // 요청된 티커만 응답 (USDKRW=X 는 exchangeRate 필드로 별도 반환)
  const prices: Record<string, { price: number; currency: string }> = {};
  for (const ticker of tickers) {
    if (rawPrices[ticker]) prices[ticker] = rawPrices[ticker];
  }

  return NextResponse.json<PricesApiResponse>({ prices, exchangeRate });
}
