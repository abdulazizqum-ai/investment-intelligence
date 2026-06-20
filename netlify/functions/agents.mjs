// =============================================================================
// agents.mjs — streaming AI agent run (v2 function).
// Streams Claude's output so data keeps flowing and Netlify never hits the
// inactivity timeout. Returns the model's raw JSON text; the client parses +
// normalizes it (see src/data/liveAgents.ts). Educational research only.
// =============================================================================

const FINNHUB = 'https://finnhub.io/api/v1';
const ANTHROPIC = 'https://api.anthropic.com/v1/messages';

const j = async (url) => {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
};

const SCHEMA = `Output ONLY minified JSON (no markdown, no prose). Every narrative field MUST be {"en":"...","ar":"..."} with fluent Arabic. Be concise.
{"sentiment":{"aiConfidenceIndex":0-100,"marketSentiment":0-100,"label":{"en":"","ar":""}},
"news":[{"headline":{"en":"","ar":""},"summary":{"en":"","ar":""},"category":"economic|technology|geopolitical|energy|commodities|company|central_banks|political","source":"","importanceScore":0-100,"isMarketMoving":true,"affectedAssets":["stock"]}],
"causality":[{"cause":{"en":"","ar":""},"chain":[{"label":{"en":"","ar":""},"direction":"up|down|neutral"}],"directImpact":{"en":"","ar":""},"secondOrderImpact":{"en":"","ar":""},"thirdOrderImpact":{"en":"","ar":""},"beneficiaries":[""],"losers":[""],"affectedAssets":[""],"timeHorizon":"short_term|medium_term|long_term","urgencyLevel":"critical|high|medium|low","tradeOpportunityProbability":0-100}],
"recommendations":[{"ticker":"","assetType":"stock","recommendationType":"buy|hold|watch|sell","timeHorizon":"short_term|medium_term|long_term","confidenceScore":0-100,"riskScore":0-100,"urgencyScore":0-100,"entryZone":[lo,hi],"targetZone":[lo,hi],"stopLoss":0,"thesis":{"en":"","ar":""},"reason":{"en":"","ar":""},"catalyst":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"supportingAgents":["equity","growth","valuation","risk"]}],
"urgentAlerts":[{"ticker":"","assetType":"stock","alertTitle":{"en":"","ar":""},"priority":"critical|high|medium|low","urgencyScore":0-100,"confidenceScore":0-100,"riskScore":0-100,"expectedMove":{"en":"","ar":""},"timeWindow":"","reason":{"en":"","ar":""},"alternativeScenario":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"entryZone":[lo,hi],"targetZone":[lo,hi],"stopLoss":0,"supportingAgents":[""]}]}
Rules: one recommendation per provided ticker. Only emit an urgentAlert when urgencyScore>=80 AND confidenceScore>=75 AND riskScore<=65 AND >=3 supporting agents AND a clear catalyst; else none. Prefer "watch" over "buy" when data is weak. At most 3 news and 1 causality chain. Ground everything in the data.`;

export default async () => {
  const fkey = process.env.FINNHUB_API_KEY;
  const akey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001';
  const H = { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'no-store' };

  if (!fkey || !akey) {
    return new Response(JSON.stringify({ error: 'server keys not configured' }), { status: 200, headers: H });
  }

  const tickers = (process.env.AGENT_TICKERS || 'NVDA,MSFT,AMD')
    .split(',').map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 3);

  // Gather live data (fast).
  const general = (await j(`${FINNHUB}/news?category=general&token=${fkey}`)) || [];
  const quotes = await Promise.all(
    tickers.map(async (t) => {
      const q = await j(`${FINNHUB}/quote?symbol=${t}&token=${fkey}`);
      return { ticker: t, price: q?.c ?? null, changePct: q?.dp ?? null, dayHigh: q?.h ?? null, dayLow: q?.l ?? null };
    }),
  );
  const marketNews = general.slice(0, 5).map((n) => ({ headline: n.headline, source: n.source }));

  const userContent =
    `Today: ${new Date().toISOString().slice(0, 10)}.\n` +
    `Act as a 20-agent investment committee. Analyze ONLY this real data.\n` +
    `MARKET NEWS: ${JSON.stringify(marketNews)}\nQUOTES: ${JSON.stringify(quotes)}\n\n` +
    SCHEMA;

  const upstream = await fetch(ANTHROPIC, {
    method: 'POST',
    headers: { 'x-api-key': akey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 1600,
      stream: true,
      system: 'You are an investment intelligence multi-agent system for educational research only (no trade execution). Output strictly valid minified JSON per the schema with fluent Arabic in every {en,ar} field.',
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = upstream.body ? (await upstream.text()).slice(0, 200) : 'no body';
    return new Response(JSON.stringify({ error: 'llm error', detail }), { status: 200, headers: H });
  }

  // Transform Anthropic SSE -> plain concatenated text deltas (keeps the
  // connection active so Netlify does not time out).
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      const enc = new TextEncoder();
      let buf = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const ev = JSON.parse(data);
              if (ev.type === 'content_block_delta' && ev.delta?.text) {
                controller.enqueue(enc.encode(ev.delta.text));
              }
            } catch {
              /* ignore partial */
            }
          }
        }
      } catch {
        /* upstream ended */
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { status: 200, headers: H });
};
