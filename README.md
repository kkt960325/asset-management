# SEUNGHANIST — Open-Source Asset Management Terminal

> A J.A.R.V.I.S.-inspired personal finance dashboard. Track stocks, crypto, gold, real estate, and cash across KRW/USD in one HUD interface. All data lives in your browser — no account, no server, no tracking.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkkt960325%2Fasset-management)

---

## Features

- **Real-time prices** — US stocks & ETFs (Yahoo Finance), KRX stocks (Naver Finance), Crypto (Binance / CoinGecko), Gold futures (COMEX GC=F)
- **13 asset categories** — 미국주식, 한국주식, 해외주식, 국내ETF, 해외ETF, 채권, Crypto, KRX금현물, 금/원자재, 부동산, 현금/예금, 연금/퇴직, 보험/기타
- **KRX 금현물 세율 분리** — KRX 금현물 계좌 특별 세율(0%) 별도 처리
- **Rebalancing alerts** — configurable deviation threshold (1–10 %p)
- **Portfolio history chart** — value over time (KRW + USD dual axis)
- **Asset allocation pie chart** — by category, interactive hover
- **Tax estimation tooltips** — per-category estimated tax on gains
- **KRW ⇄ USD currency toggle** — switch all values between currencies live
- **Export / Import** — save & restore your portfolio as a portable JSON file
- **Zero-server privacy** — everything stored in `localStorage`, nothing leaves your browser

---

## One-Click Deploy

Click the button above or use this URL to clone & deploy instantly to your own Vercel account:

```
https://vercel.com/new/clone?repository-url=https://github.com/kkt960325/asset-management
```

No environment variables required. The app works out of the box.

---

## Local Development

```bash
git clone https://github.com/kkt960325/asset-management.git
cd asset-management
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Requirements

- Node.js 18+
- npm 9+

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion 12 |
| Charts | Recharts |
| State | Zustand v5 (localStorage persist) |
| Fonts | Orbitron · Rajdhani · JetBrains Mono |
| Price APIs | Yahoo Finance · Naver Finance · Binance · CoinGecko |

---

## Privacy

- No backend, no database, no analytics
- All portfolio data is stored exclusively in **your browser's localStorage**
- No data is transmitted to any server except the price APIs (tickers only, no amounts)
- Exporting creates a local JSON file — nothing is uploaded

---

## License

MIT — use freely, attribution appreciated.
