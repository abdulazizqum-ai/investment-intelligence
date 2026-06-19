// Netlify serverless function — proxies Finnhub /quote so the API key stays
// server-side (set FINNHUB_API_KEY in Netlify → Site settings → Environment
// variables). The browser never sees the key.
export async function handler(event) {
  const symbol = event.queryStringParameters?.symbol;
  const key = process.env.FINNHUB_API_KEY;

  if (!symbol) {
    return { statusCode: 400, body: JSON.stringify({ error: 'missing symbol' }) };
  }
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: 'server key not configured' }) };
  }

  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
    );
    const body = await r.text();
    return {
      statusCode: r.status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=10',
        'access-control-allow-origin': '*',
      },
      body,
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'upstream error' }) };
  }
}
