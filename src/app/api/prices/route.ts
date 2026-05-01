import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ── Mock prices (fallback when Yahoo Finance is blocked from cloud IPs) ───────
// Used when ALL Yahoo tickers return null (e.g. Vercel → Yahoo 429 block).
// Values are intentionally approximate; UI shows "MOCK" badge when active.
const MOCK_PRICES: Record<string, { price: number; currency: string }> = {
  // US stocks / ETFs
  "AAPL":   { price: 207.00, currency: "USD" },
  "MSFT":   { price: 415.00, currency: "USD" },
  "NVDA":   { price: 875.00, currency: "USD" },
  "TSLA":   { price: 175.00, currency: "USD" },
  "AMZN":   { price: 185.00, currency: "USD" },
  "GOOGL":  { price: 170.00, currency: "USD" },
  "GOOG":   { price: 170.00, currency: "USD" },
  "META":   { price: 510.00, currency: "USD" },
  "NFLX":   { price: 620.00, currency: "USD" },
  "SPY":    { price: 550.00, currency: "USD" },
  "QQQ":    { price: 467.00, currency: "USD" },
  "VOO":    { price: 503.00, currency: "USD" },
  "VTI":    { price: 268.00, currency: "USD" },
  "ARKK":   { price:  47.00, currency: "USD" },
  "COPX":   { price:  42.00, currency: "USD" },
  "GLD":    { price: 230.00, currency: "USD" },
  "SLV":    { price:  27.00, currency: "USD" },
  "TLT":    { price:  88.00, currency: "USD" },
  "BRK.B":  { price: 460.00, currency: "USD" },
  "JPM":    { price: 220.00, currency: "USD" },
  "V":      { price: 280.00, currency: "USD" },
  "MA":     { price: 490.00, currency: "USD" },
  "DIS":    { price: 113.00, currency: "USD" },
  "AMD":    { price: 160.00, currency: "USD" },
  "INTC":   { price:  30.00, currency: "USD" },
  // Gold futures (USD/oz → KRW/g conversion happens downstream)
  "GC=F":   { price: 3_300.00, currency: "USD" },
  // FX
  "USDKRW=X": { price: 1_400, currency: "KRW" },
};

// ── 상수 ──────────────────────────────────────────────────────────────────────
const GOLD_COMEX      = "GC=F";
const USDKRW_TICKER   = "USDKRW=X";
const GOLD_G_PER_OZ   = 31.1035;   // 1 troy oz = 31.1035 g
const USDKRW_FALLBACK = 1_400;

// ── 네이버 금융 동적 조회 ─────────────────────────────────────────────────────
// Yahoo Finance DB 미등재 국내 주식·ETF는 "{6자리코드}.KS" 형식으로 요청됨.
// .KS 접미사를 제거하고 대문자로 정규화한다 (네이버 API는 대문자 코드 사용).
function getNaverCode(ksSymbol: string): string {
  return ksSymbol.replace(/\.KS$/i, "").toUpperCase();
}

// ── 응답 타입 ─────────────────────────────────────────────────────────────────
export type PricesApiResponse = {
  prices: Record<string, { price: number; currency: string }>;
  /** 실시간 USD/KRW 환율. 조회 실패 시 폴백 값 반환 */
  exchangeRate: number;
  /** 가격을 가져오지 못한 티커 목록 (진단용) */
  failed: string[];
  /** Yahoo Finance 차단 등으로 Mock 데이터를 사용 중이면 true */
  mock?: boolean;
};

// ── Yahoo Finance 단일 종목 조회 ──────────────────────────────────────────────
// 미국주식(AAPL, COPX…), 가상자산(BTC-USD, ETH-USD, SOL-USD…), 환율(USDKRW=X),
// 금선물(GC=F) 모두 이 함수 하나로 처리됨. 가상자산은 currency:"USD"로 자동 반환.
async function fetchYahoo(
  ticker: string
): Promise<{ ticker: string; price: number | null; currency: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = (await yf.quote(ticker)) as any;
    const price = (quote?.regularMarketPrice as number | undefined) ?? null;
    if (price !== null) {
      console.log(`[yahoo] ✓ ${ticker} = ${price} ${quote?.currency ?? "USD"}`);
    } else {
      console.warn(`[yahoo] ✗ ${ticker} — regularMarketPrice null. Raw keys: ${Object.keys(quote ?? {}).join(",")}`);
    }
    return {
      ticker,
      price,
      currency: (quote?.currency as string | undefined) ?? "USD",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.split("\n").slice(0, 4).join(" | ") : "";
    console.error(`[yahoo] ✗ ${ticker} 조회 실패: ${msg} | stack: ${stack}`);
    return { ticker, price: null, currency: "USD" };
  }
}

// ── 네이버 금융 현재가 조회 ────────────────────────────────────────────────────
// Primary: 모바일 JSON API (IP 차단 가능성 낮음, 파싱 불필요)
// Fallback: PC 웹 HTML 스크래핑
async function fetchNaver(
  ticker: string
): Promise<{ ticker: string; price: number | null; currency: string }> {
  const code = getNaverCode(ticker);
  if (!code) return { ticker, price: null, currency: "KRW" };

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

// ── 가상자산 시세 조회 (Yahoo Finance 완전 미사용) ────────────────────────────
// 심볼 → CoinGecko ID 매핑 (미등록 심볼은 소문자를 ID로 대체 시도)
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC:    "bitcoin",
  ETH:    "ethereum",
  SOL:    "solana",
  BNB:    "binancecoin",
  XRP:    "ripple",
  ADA:    "cardano",
  AVAX:   "avalanche-2",
  DOT:    "polkadot",
  LINK:   "chainlink",
  UNI:    "uniswap",
  ATOM:   "cosmos",
  LTC:    "litecoin",
  NEAR:   "near",
  TAO:    "bittensor",
  SUI:    "sui",
  APT:    "aptos",
  OP:     "optimism",
  ARB:    "arbitrum",
  INJ:    "injective-protocol",
  RENDER: "render-token",
  FET:    "fetch-ai",
  WIF:    "dogwifcoin",
  PEPE:   "pepe",
  DOGE:   "dogecoin",
  SHIB:   "shiba-inu",
  MATIC:  "matic-network",
  TRX:    "tron",
  TON:    "the-open-network",
};

/**
 * 모든 Crypto 티커 시세 조회.
 *
 * 순서: Binance 병렬(1차) → 실패 코인만 CoinGecko 배치(2차, 429 시 1회 재시도)
 * Binance는 데이터센터 IP 차단이 없고 429도 없음 — 주력 소스로 사용.
 * CoinGecko free tier는 공유 IP에서 429가 자주 발생하므로 보조 소스로 사용.
 *
 * ticker 형식: "BTC-USD", "TAO-USD" (api.ts에서 변환된 Yahoo 스타일)
 * 반환 currency: "USD" (원화 환산은 rebalancer.ts에서 처리)
 */
async function fetchAllCrypto(
  tickers: string[]
): Promise<Array<{ ticker: string; price: number | null; currency: string }>> {
  if (tickers.length === 0) return [];

  // "BTC-USD" → base "BTC", CoinGecko id "bitcoin"
  const tickerToBase: Record<string, string> = {};
  const baseToTicker: Record<string, string> = {};
  const baseToId:     Record<string, string> = {};
  const idToBase:     Record<string, string> = {};

  for (const ticker of tickers) {
    const base = ticker.replace(/-USD$/i, "").toUpperCase();
    const id   = COINGECKO_ID_MAP[base] ?? base.toLowerCase();
    tickerToBase[ticker] = base;
    baseToTicker[base]   = ticker;
    baseToId[base]       = id;
    idToBase[id]         = base;
  }

  const priceByBase: Record<string, number | null> = Object.fromEntries(
    Object.keys(baseToTicker).map((b) => [b, null])
  );

  // ── 1차: Binance 병렬 (429 없음, 데이터센터 IP 차단 없음) ──────────────
  console.log(`[crypto] Binance 1차 시도: ${Object.keys(priceByBase).join(", ")}`);
  await Promise.all(
    Object.keys(priceByBase).map(async (base) => {
      const symbol = `${base}USDT`;
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
          { cache: "no-store" }
        );
        console.log(`[crypto] Binance HTTP ${res.status} (${symbol})`);
        if (res.ok) {
          const data = (await res.json()) as { price?: string };
          const price = parseFloat(data.price ?? "");
          if (!isNaN(price) && price > 0) {
            priceByBase[base] = price;
            console.log(`[crypto] ✓ Binance  ${baseToTicker[base]} (${symbol}): $${price}`);
          } else {
            console.warn(`[crypto] ✗ Binance  ${symbol}: 유효하지 않은 가격`);
          }
        } else {
          console.warn(`[crypto] ✗ Binance  ${symbol}: HTTP ${res.status}`);
        }
      } catch (err) {
        console.warn(`[crypto] Binance 예외 (${symbol}):`, err instanceof Error ? err.message : String(err));
      }
    })
  );

  // ── 2차: Binance 실패 코인 → CoinGecko 배치 (429 시 1.5초 후 재시도) ──
  const missingBases = Object.keys(priceByBase).filter((b) => priceByBase[b] === null);
  if (missingBases.length > 0) {
    const ids = missingBases.map((b) => baseToId[b]).join(",");
    const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    console.log(`[crypto] CoinGecko 배치 폴백 → ids=${ids}`);

    const tryCoinGecko = async (): Promise<boolean> => {
      try {
        const res = await fetch(cgUrl, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        console.log(`[crypto] CoinGecko HTTP ${res.status}`);
        if (res.status === 429) return false; // 재시도 신호
        if (!res.ok) {
          console.warn(`[crypto] CoinGecko 오류 HTTP ${res.status}`);
          return true;
        }
        const data = (await res.json()) as Record<string, { usd?: number }>;
        console.log(`[crypto] CoinGecko 응답:`, JSON.stringify(data));
        for (const base of missingBases) {
          const id    = baseToId[base];
          const price = data[id]?.usd;
          if (typeof price === "number" && price > 0) {
            priceByBase[base] = price;
            console.log(`[crypto] ✓ CoinGecko  ${baseToTicker[base]} (${id}): $${price}`);
          } else {
            console.warn(`[crypto] ✗ CoinGecko  ${baseToTicker[base]} (${id}): 가격 없음`);
          }
        }
        return true;
      } catch (err) {
        console.warn("[crypto] CoinGecko 예외:", err instanceof Error ? err.message : String(err));
        return true;
      }
    };

    const ok = await tryCoinGecko();
    if (!ok) {
      // 429 → 1.5초 대기 후 재시도
      console.log("[crypto] CoinGecko 429 — 1.5초 후 재시도");
      await new Promise((r) => setTimeout(r, 1500));
      await tryCoinGecko();
    }
  }

  // 최종 결과 조립
  return tickers.map((ticker) => {
    const base  = tickerToBase[ticker];
    const price = priceByBase[base] ?? null;
    if (price === null) {
      console.warn(`[crypto] 최종 실패: ${ticker} (${base}) — Binance + CoinGecko 모두 불가`);
    } else {
      console.log(`[crypto] 최종 성공: ${ticker} (${base}) = $${price}`);
    }
    return { ticker, price, currency: "USD" as const };
  });
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
      failed: [],
    });
  }

  // ── 소스별 분리 ───────────────────────────────────────────────────────────
  // .KS 접미사 = 한국 주식·ETF → 네이버 금융으로 조회
  const naverTickers = tickers.filter((t) => t.endsWith(".KS"));
  // Crypto: -USD 접미사. USDKRW=X·GC=F 등은 제외. Yahoo 미사용.
  const cryptoTickers = tickers.filter(
    (t) => t.endsWith("-USD") && t !== USDKRW_TICKER && !t.endsWith(".KS")
  );
  const yahooOnlyTickers = tickers.filter(
    (t) => !t.endsWith(".KS") && !cryptoTickers.includes(t)
  );

  // Yahoo: USDKRW=X 는 환율 산출 및 금현물 변환에 항상 필요
  const yahooFetchList: string[] = Array.from(
    new Set([...yahooOnlyTickers, USDKRW_TICKER])
  );

  console.log(`[prices] 요청 tickers: [${tickers.join(", ")}]`);
  console.log(`[prices] yahoo=${yahooFetchList.length} naver=${naverTickers.length} crypto=${cryptoTickers.length}`);

  // ── 소스별 병렬 조회 (Crypto는 CoinGecko 배치→Binance 폴백, Yahoo 미사용) ──
  const [yahooResults, naverResults, cryptoBatch] = await Promise.all([
    Promise.allSettled(yahooFetchList.map(fetchYahoo)),
    Promise.allSettled(naverTickers.map(fetchNaver)),
    fetchAllCrypto(cryptoTickers),                // 배치 함수, 내부에서 로그 처리
  ]);

  const rawPrices: Record<string, { price: number; currency: string }> = {};

  for (const r of [...yahooResults, ...naverResults]) {
    if (r.status === "fulfilled" && r.value.price !== null) {
      rawPrices[r.value.ticker] = { price: r.value.price, currency: r.value.currency };
    }
  }
  for (const r of cryptoBatch) {
    if (r.price !== null) {
      rawPrices[r.ticker] = { price: r.price, currency: r.currency };
    }
  }

  // ── Mock fallback: Yahoo 전체 차단 감지 ───────────────────────────────────
  // yahooOnlyTickers(FX, 미국주식, 금선물) 중 단 하나도 성공하지 못했으면
  // MOCK_PRICES에서 채워서 화면에 숫자가 뜨도록 보장함.
  // 주의: USDKRW=X mock=1400이 사용되므로 exchangeRate 계산에도 반영됨.
  const yahooSuccessCount = yahooFetchList.filter(
    (t) => rawPrices[t] !== undefined
  ).length;
  let usingMock = false;

  if (yahooSuccessCount === 0 && yahooFetchList.length > 0) {
    usingMock = true;
    console.error(
      `[prices] ⚠ Yahoo Finance 전체 차단 — ${yahooFetchList.length}개 티커 Mock 데이터 대체 적용`
    );
    for (const ticker of yahooFetchList) {
      if (!rawPrices[ticker] && MOCK_PRICES[ticker]) {
        rawPrices[ticker] = MOCK_PRICES[ticker];
        console.log(`[prices] mock → ${ticker} = ${MOCK_PRICES[ticker].price}`);
      }
    }
  }

  const exchangeRate = rawPrices[USDKRW_TICKER]?.price ?? USDKRW_FALLBACK;

  // GC=F: USD/oz → KRW/g
  // 예) $3,300/oz ÷ 31.1035 g/oz = $106.1/g × 1,400 KRW/USD = ₩148,526/g
  // store.updatePrices: currentValue = shares(g) × ₩/g → 단순 곱셈, ×1000 없음
  if (rawPrices[GOLD_COMEX]) {
    const goldUsdPerOz = rawPrices[GOLD_COMEX].price;
    const krwPerGram = (goldUsdPerOz / GOLD_G_PER_OZ) * exchangeRate;
    console.log(
      `[gold] GC=F raw = ${goldUsdPerOz} USD/oz | exchangeRate = ${exchangeRate} | KRW/g = ${krwPerGram.toFixed(0)}`
    );
    // Fallback if calculation yields invalid value (e.g., null price from Yahoo)
    if (!isFinite(krwPerGram) || krwPerGram <= 0) {
      const fallback = (3_300 / GOLD_G_PER_OZ) * USDKRW_FALLBACK;
      console.error(`[gold] KRW/g 이상값 (${krwPerGram}) — 폴백 ${fallback.toFixed(0)} KRW/g 사용`);
      rawPrices[GOLD_COMEX] = { price: fallback, currency: "KRW" };
    } else {
      rawPrices[GOLD_COMEX] = { price: krwPerGram, currency: "KRW" };
    }
  }

  // 요청된 티커만 응답 (USDKRW=X 는 exchangeRate 필드로 별도 반환)
  // Crypto 티커는 -USD 접미사를 제거해서 반환 (BTC-USD → BTC)
  // → 프론트엔드 ticker("BTC")와 키가 정확히 일치하도록 보장
  const prices: Record<string, { price: number; currency: string }> = {};
  const failed: string[] = [];

  for (const ticker of tickers) {
    if (ticker === USDKRW_TICKER) continue;
    const outKey =
      ticker.endsWith("-USD") && ticker !== USDKRW_TICKER
        ? ticker.replace(/-USD$/, "")
        : ticker;
    if (!rawPrices[ticker]) {
      failed.push(outKey);
      console.warn(`[prices] 가격 없음: ${ticker}`);
    } else {
      prices[outKey] = rawPrices[ticker];
    }
  }

  console.log(`[prices] 최종 응답 keys: [${Object.keys(prices).join(", ")}]`);
  if (failed.length > 0) {
    console.warn(`[prices] 가격 조회 실패 티커: [${failed.join(", ")}]`);
  }
  // E2E 트레이스: 최종 응답 JSON 전체 출력 (서버 로그에서 확인 가능)
  console.log("[prices] 최종 응답 JSON:", JSON.stringify({ prices, exchangeRate, failed, mock: usingMock || undefined }));
  return NextResponse.json<PricesApiResponse>({ prices, exchangeRate, failed, mock: usingMock || undefined });
}
