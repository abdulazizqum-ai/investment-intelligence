// =============================================================================
// ask.mjs — Inquiry chat (v2, streaming). Flow: an Inquiry Agent routes the
// question to the most relevant specialist agent, the specialist analyzes using
// real market data + the latest scan, the CIO reviews/approves, then a final
// bilingual answer is returned. Streams the model's JSON to avoid timeouts.
// Educational research only — no trade execution.
// =============================================================================

const FINNHUB = 'https://finnhub.io/api/v1';
const ANTHROPIC = 'https://api.anthropic.com/v1/messages';
const H = { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'no-store' };

const MAP = {
  gold: 'GLD', silver: 'SLV', oil: 'USO', crude: 'USO', 'natural gas': 'UNG', gas: 'UNG', copper: 'CPER',
  dollar: 'UUP', nasdaq: 'QQQ', 'sp500': 'SPY', 's&p': 'SPY', dow: 'DIA', treasuries: 'IEF', bonds: 'IEF',
  'ذهب': 'GLD', 'الذهب': 'GLD', 'فضة': 'SLV', 'نفط': 'USO', 'النفط': 'USO', 'نحاس': 'CPER', 'دولار': 'UUP', 'غاز': 'UNG', 'سندات': 'IEF',
};

const j = async (url) => { try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; } };

const SCHEMA = `Output ONLY minified JSON. Bilingual {"en":"","ar":""} with fluent Arabic.
{"routedAgentId":"<one of: metals,energy,agriculture,currency,equity,rates_bonds,macro,geopolitical,growth,valuation,smart_money,emerging_companies,risk,financial_analyst>","routedAgentName":{"en":"","ar":""},"agentAnalysis":{"en":"","ar":""},"cioVerdict":"approved|revised|rejected","cioNote":{"en":"","ar":""},"recommendation":"buy|hold|watch|sell|n/a","confidence":0-100,"risk":0-100,"answer":{"en":"","ar":""}}
The Inquiry Agent routes to the single most relevant specialist agent. That agent writes agentAnalysis grounded in the provided data. The CIO reviews it (approve/revise/reject) with cioNote. answer = the final user-facing reply (clear, balanced, 2-4 sentences) including a clear stance and the key risk. Never guarantee returns; this is educational research, not financial advice.`;

export default async (req) => {
  const fkey = process.env.FINNHUB_API_KEY;
  const akey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001';
  if (!akey) return new Response(JSON.stringify({ error: 'no llm key' }), { status: 200, headers: H });

  // Read question (POST json or GET ?q=)
  let question = '';
  try {
    if (req.method === 'POST') question = (await req.json())?.question || '';
    else question = new URL(req.url).searchParams.get('q') || '';
  } catch {
    /* ignore */
  }
  question = String(question).slice(0, 500);
  if (!question.trim()) return new Response(JSON.stringify({ error: 'empty question' }), { status: 200, headers: H });

  // Detect a relevant symbol and fetch a live quote for grounding.
  const ql = question.toLowerCase();
  const syms = new Set();
  for (const k of Object.keys(MAP)) if (MAP[k] && ql.includes(k)) syms.add(MAP[k]);
  (question.match(/\b[A-Z]{2,5}\b/g) || []).slice(0, 3).forEach((t) => syms.add(t));
  const quotes = [];
  if (fkey) {
    for (const s of [...syms].slice(0, 3)) {
      const q = await j(`${FINNHUB}/quote?symbol=${s}&token=${fkey}`);
      if (q && q.c) quotes.push({ symbol: s, price: q.c, changePct: q.dp });
    }
  }

  // Pull the latest market scan for context.
  let snapshot = null;
  const SB = process.env.SUPABASE_URL; const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (SB && SK) {
    try {
      const r = await fetch(`${SB}/rest/v1/agent_cache?key=eq.latest&select=data`, { headers: { apikey: SK, authorization: `Bearer ${SK}` } });
      if (r.ok) {
        const rows = await r.json();
        const d = rows[0]?.data;
        if (d) snapshot = {
          sentiment: d.sentiment?.sentimentLabel?.en,
          assetClasses: (d.assetClasses || []).map((a) => ({ type: a.assetType, trend: a.trend, rec: a.recommendation })),
          topRecs: (d.recommendations || []).slice(0, 4).map((r2) => ({ ticker: r2.ticker, type: r2.recommendationType, thesis: r2.thesis?.en })),
          news: (d.news || []).slice(0, 3).map((n) => n.headline?.en),
        };
      }
    } catch { /* ignore */ }
  }

  const userContent =
    `User question: "${question}"\n` +
    `Live quotes: ${JSON.stringify(quotes)}\n` +
    `Current market scan: ${JSON.stringify(snapshot)}\n\n` +
    SCHEMA;

  const upstream = await fetch(ANTHROPIC, {
    method: 'POST',
    headers: { 'x-api-key': akey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: 1500, stream: true,
      system: 'You are an investment intelligence multi-agent system (Inquiry Agent + specialist agents + CIO) for educational research only (no trade execution). Output strictly valid minified JSON per the schema with fluent Arabic in every {en,ar} field.',
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: 'llm error', detail: upstream.body ? (await upstream.text()).slice(0, 200) : 'no body' }), { status: 200, headers: H });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      const dec = new TextDecoder(); const enc = new TextEncoder();
      let buf = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try { const ev = JSON.parse(data); if (ev.type === 'content_block_delta' && ev.delta?.text) controller.enqueue(enc.encode(ev.delta.text)); } catch { /* partial */ }
          }
        }
      } catch { /* end */ } finally { controller.close(); }
    },
  });
  return new Response(stream, { status: 200, headers: H });
};
