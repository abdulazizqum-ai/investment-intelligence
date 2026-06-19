# Investment Intelligence — Multi-Agent System (MVP)

AI multi-agent investment **research** platform. It connects news, geopolitics,
macro, asset moves, company growth, financials, valuation, risk and smart-money
activity into actionable research, opportunity alerts and **urgent
high-conviction alerts**.

> ⚠️ **Educational research only — not financial advice. The platform never
> executes trades.**

## Highlights

- 20 simulated AI agents (CIO, Global News, Geopolitical, Market Causality,
  Macro, Rates & Bonds, Equity, Metals, Energy, Agriculture, Currency, Emerging
  Companies, Growth, Financial Analyst, Valuation, Smart Money, Risk,
  Recommendation, Committee, Urgent Alert).
- **Urgent Opportunity engine** with a strict gate: urgency ≥ 80, confidence ≥ 75,
  risk ≤ 65, ≥ 3 supporting agents, a clear catalyst and an invalidation
  condition — otherwise it downgrades to a **Watch** alert.
- 13 screens: Login, Dashboard, Recommendations, Urgent Alerts, Risk Dashboard,
  News & Events, Market Causality, Emerging Companies, Company Analysis, Asset
  Classes, Agent Control Center, Alerts, Settings.
- **Bilingual EN/AR** with automatic RTL, dark mode, responsive layout.
- Charts (Recharts), tables (TanStack Table), in-app notifications, email-alert
  placeholder, Telegram/WhatsApp placeholders.

## Tech stack

React + Vite + TypeScript · Tailwind CSS · Supabase (Auth + Postgres) ·
i18next · Recharts · TanStack Table · lucide-react.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

### Demo mode (default)
With `VITE_USE_SUPABASE=false` the app runs entirely on the local mock agent
engine + mock data. Sign in with **any email and a 4+ character password**.

### Enable real Supabase
1. Open `.env` and set:
   ```
   VITE_SUPABASE_URL=https://cidfuxgwivxjodushmnl.supabase.co
   VITE_SUPABASE_ANON_KEY=<your anon public key>
   VITE_USE_SUPABASE=true
   ```
   (The project URL is already filled in; paste your **anon/public** key.)
2. In the Supabase SQL editor run, in order:
   - `supabase/migrations/0001_init.sql`  (schema + RLS)
   - `supabase/seed.sql`                  (demonstration data)
3. Restart `npm run dev`. Login now uses Supabase Auth and data loads from
   Postgres. (Switch each `dataService` method to its Supabase query at the
   marked `TODO(supabase)` lines — the return shapes already match.)

### Enable live market data (Finnhub)
1. Get a **free** key (no credit card): https://finnhub.io/register
2. In `.env` set:
   ```
   VITE_FINNHUB_API_KEY=your-key
   VITE_USE_LIVE_DATA=true
   ```
3. Restart `npm run dev`. The Dashboard "Market Overview" and the Asset Classes
   page show **live** prices (15s polling) and a green ● LIVE badge. Click any
   instrument — or a recommendation's ticker — to open a live price detail
   (current / open / high / low / prev-close / change).

How symbols work: Finnhub's free tier covers US stocks, ETFs and forex via the
CORS-enabled `/quote` endpoint. Indices, commodities, yields and FX are shown
through liquid ETF proxies (S&P 500→SPY, NASDAQ→QQQ, Gold→GLD, WTI→USO,
USD→UUP, EUR→FXE, …) defined in `src/lib/marketSymbols.ts`. Plain equities
(NVDA, etc.) query directly. Without a key the app stays on mock data and shows
an amber ○ MOCK badge — nothing breaks.

Security note: a frontend key is visible to site users. For production, proxy
Finnhub through a Supabase Edge Function and call that from `marketData.ts`
instead of embedding the key.

## Project structure

```
src/
  types.ts                 Core strongly-typed data model (bilingual fields)
  lib/
    mockAgentEngine.ts     Scoring rules: urgency/confidence/risk/noise/consensus
    config.ts              Supabase enable flag
    supabaseClient.ts      Lazy Supabase client
    format.ts              Formatting + color tokens
    useAsync.ts            Tiny data-loading hook
  data/
    mockData.ts            5 demo scenarios driven by the engine
    dataService.ts         Single data layer (mock now, Supabase-ready)
  context/                 Auth + Locale/Theme providers
  components/              Layout, cards, ui primitives, notifications, disclaimer
  pages/                   13 screens
  i18n/                    EN + AR resources
supabase/
  migrations/0001_init.sql 23 tables + RLS
  seed.sql                 Seed matching the mock scenarios
```

## Demonstration scenarios (mock data)

1. **Critical urgent opportunity** — `NVDA` AI-contract catalyst (passes the full gate).
2. **Watchlist opportunity** — `ZSCL` (insufficient conviction → Watch).
3. **High-growth, low-noise emerging company** — `QBIT` ("Alpha Early Signal").
4. **High-risk rejected recommendation** — `BMCR` (rejected by CIO).
5. **Geopolitical event across asset classes** — oil chokepoint causality chain.

## Urgent alert logic (single source of truth)

`src/lib/mockAgentEngine.ts → URGENT_ALERT_RULES` and `runEngine()`.
Urgency score = weighted confidence + abnormal volume + news impact + agent
consensus + catalyst + time sensitivity + move probability, clamped to 100.

## Noise Level (emerging companies)

- `growth_score ≥ 80 && media_mentions < 15` → **Alpha Early Signal**
- `growth_score < 50 && media_mentions > 70` → **Late Hype**
- otherwise → **Fairly Priced**

## Roadmap placeholders

Real LLM orchestration, news/market/financial APIs, background workers (n8n /
cron), Telegram & WhatsApp delivery, Supabase Realtime push.
