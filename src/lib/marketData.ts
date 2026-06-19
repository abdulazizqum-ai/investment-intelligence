// =============================================================================
// marketData.ts — Live market-data layer (provider: Finnhub).
//
// Free Finnhub key (no card): https://finnhub.io/register  -> paste into .env:
//   VITE_FINNHUB_API_KEY=xxxxxxxx
//
// Design notes:
//  - Uses the free /quote endpoint (CORS-enabled, 60 req/min) which returns
//    current/open/high/low/prev-close/change for any US-listed symbol.
//  - Indices, commodities, FX and yields are premium as raw symbols on the
//    free tier, so we display liquid US-listed ETF proxies that track them
//    (SPY, QQQ, GLD, USO, UUP, FXE, ...). See marketSymbols.ts.
//  - When no key is configured every function returns null and the UI falls
//    back to the mock dataset, so the app never breaks.
// =============================================================================

const KEY = (import.meta.env.VITE_FINNHUB_API_KEY ?? '').trim();
const USE_LIVE_FLAG =
  (import.meta.env.VITE_USE_LIVE_DATA ?? 'true').toString().toLowerCase() !== 'false';

// A client-side key is only used as a local-dev fallback. In production the
// serverless proxy below keeps the key server-side.
const HAS_CLIENT_KEY = KEY.length > 8 && !KEY.startsWith('PASTE');

// Serverless proxy that hides the key (Netlify function). On hosts without the
// function (plain static / local Vite) the call 404s and we fall back to the
// client key when present.
const PROXY = '/.netlify/functions/quote';

/** Live data is considered enabled whenever the flag is on; quotes resolve via
 *  the proxy first, then the optional client key. */
export const LIVE_ENABLED = USE_LIVE_FLAG;

export interface Quote {
  symbol: string;
  current: number;
  change: number; // absolute
  percent: number; // %
  high: number;
  low: number;
  open: number;
  prevClose: number;
  at: number; // fetch timestamp (ms)
}

const BASE = 'https://finnhub.io/api/v1';

// Small in-memory cache to avoid hammering the rate limit across components.
const cache = new Map<string, { q: Quote; ts: number }>();
const CACHE_MS = 10_000;

function parse(d: any, symbol: string): Quote | null {
  // Finnhub returns zeros for unknown/closed-no-data symbols.
  if (d == null || (d.c === 0 && d.pc === 0)) return null;
  return {
    symbol,
    current: d.c,
    change: d.d ?? 0,
    percent: d.dp ?? 0,
    high: d.h ?? 0,
    low: d.l ?? 0,
    open: d.o ?? 0,
    prevClose: d.pc ?? 0,
    at: Date.now(),
  };
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  if (!LIVE_ENABLED) return null;
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.q;

  // 1) Try the serverless proxy (key hidden server-side).
  try {
    const res = await fetch(`${PROXY}?symbol=${encodeURIComponent(symbol)}`);
    if (res.ok) {
      const q = parse(await res.json(), symbol);
      if (q) {
        cache.set(symbol, { q, ts: Date.now() });
        return q;
      }
    }
  } catch {
    /* fall through to client key */
  }

  // 2) Fallback: direct call with a client key (local dev / static deploys).
  if (HAS_CLIENT_KEY) {
    try {
      const res = await fetch(
        `${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${KEY}`,
      );
      if (!res.ok) return null;
      const q = parse(await res.json(), symbol);
      if (q) cache.set(symbol, { q, ts: Date.now() });
      return q;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getQuotes(
  symbols: string[],
): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  if (!LIVE_ENABLED) return out;
  const results = await Promise.all(symbols.map((s) => getQuote(s)));
  results.forEach((q, i) => {
    if (q) out[symbols[i]] = q;
  });
  return out;
}

/** Company profile (logo, name, exchange) — used by the detail modal. */
export async function getProfile(
  symbol: string,
): Promise<{ name?: string; exchange?: string; logo?: string; currency?: string } | null> {
  if (!LIVE_ENABLED) return null;
  try {
    const res = await fetch(
      `${BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${KEY}`,
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d || Object.keys(d).length === 0) return null;
    return { name: d.name, exchange: d.exchange, logo: d.logo, currency: d.currency };
  } catch {
    return null;
  }
}
