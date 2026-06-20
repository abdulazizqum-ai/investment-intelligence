// =============================================================================
// agents.mjs — synchronous AI agent run (v2 function, no external storage).
// Pulls live Finnhub data and asks Claude (fast Haiku model) to act as the
// multi-agent committee, returning grounded JSON. Kept lean to finish within
// Netlify's function time limit. The frontend caches results for 15 minutes.
// Educational research only — no trade execution.
// =============================================================================

const FINNHUB = 'https://finnhub.io/api/v1';
const ANTHROPIC = 'https://api.anthropic.com/v1/messages';
const H = { 'cache-control': 'public, max-age=600', 'access-control-allow-origin': '*' };

const j = async (url) => {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
};

const SCHEMA = `Return ONLY minified JSON (no markdown). Every narrative field MUST be {"en":"...","ar":"..."} with fluent Arabic. Be concise.
{"sentiment":{"aiConfidenceIndex":0-100,"marketSentiment":0-100,"label":{"en":"","ar":""}},
"news":[{"headline":{"en":"","ar":""},"summary":{"en":"","ar":""},"category":"economic|technology|geopolitical|energy|commodities|company|central_banks|political","source":"","importanceScore":0-100,"isMarketMoving":true,"affectedAssets":["stock"]}],
"causality":[{"cause":{"en":"","ar":""},"chain":[{"label":{"en":"","ar":""},"direction":"up|down|neutral"}],"directImpact":{"en":"","ar":""},"secondOrderImpact":{"en":"","ar":""},"thirdOrderImpact":{"en":"","ar":""},"beneficiaries":[""],"losers":[""],"affectedAssets":[""],"timeHorizon":"short_term|medium_term|long_term","urgencyLevel":"critical|high|medium|low","tradeOpportunityProbability":0-100}],
"recommendations":[{"ticker":"","assetType":"stock","recommendationType":"buy|hold|watch|sell","timeHorizon":"short_term|medium_term|long_term","confidenceScore":0-100,"riskScore":0-100,"urgencyScore":0-100,"entryZone":[lo,hi],"targetZone":[lo,hi],"stopLoss":0,"thesis":{"en":"","ar":""},"reason":{"en":"","ar":""},"catalyst":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"supportingAgents":["equity","growth","valuation","risk"]}],
"urgentAlerts":[{"ticker":"","assetType":"stock","alertTitle":{"en":"","ar":""},"priority":"critical|high|medium|low","urgencyScore":0-100,"confidenceScore":0-100,"riskScore":0-100,"expectedMove":{"en":"","ar":""},"timeWindow":"","reason":{"en":"","ar":""},"alternativeScenario":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"entryZone":[lo,hi],"targetZone":[lo,hi],"stopLoss":0,"supportingAgents":[""]}]}
Rules: one recommendation per provided ticker. Only emit an urgentAlert when urgencyScore>=80 AND confidenceScore>=75 AND riskScore<=65 AND >=3 supporting agents AND a clear catalyst; else none. Prefer "watch" over "buy" when data is weak. At most 3 news and 1 causality chain. Ground everything in the data.`;

const bil = (v, fb = '') =>
  v && typeof v === 'object' && (v.en || v.ar)
    ? { en: v.en || v.ar || fb, ar: v.ar || v.en || fb }
    : typeof v === 'string'
      ? { en: v, ar: v }
      : { en: fb, ar: fb };
const num = (v, d = null) => (typeof v === 'number' && isFinite(v) ? v : d);
const cp = (v) => Math.max(0, Math.min(100, Math.round(num(v, 0))));

function normalize(p) {
  const now = new Date().toISOString();
  return {
    generatedAt: now,
    news: (p.news || []).map((n, i) => ({
      id: `lnews-${i}`, headline: bil(n.headline), summary: bil(n.summary),
      category: n.category || 'company', source: n.source || 'AI synthesis', publishedAt: now,
      importanceScore: cp(n.importanceScore), isMarketMoving: !!n.isMarketMoving,
      affectedAssets: Array.isArray(n.affectedAssets) ? n.affectedAssets : ['stock'],
      analyzedBy: ['global_news', 'market_causality'],
    })),
    causality: (p.causality || []).map((c, i) => ({
      id: `lchain-${i}`, eventId: `levt-${i}`, cause: bil(c.cause),
      chain: (c.chain || []).map((nd) => ({ label: bil(nd.label), direction: nd.direction || 'neutral' })),
      directImpact: bil(c.directImpact), secondOrderImpact: bil(c.secondOrderImpact), thirdOrderImpact: bil(c.thirdOrderImpact),
      beneficiaries: c.beneficiaries || [], losers: c.losers || [], affectedAssets: c.affectedAssets || [],
      timeHorizon: c.timeHorizon || 'short_term', urgencyLevel: c.urgencyLevel || 'medium',
      tradeOpportunityProbability: cp(c.tradeOpportunityProbability),
    })),
    recommendations: (p.recommendations || []).map((r, i) => ({
      id: `lrec-${i}`, assetId: `asset-${(r.ticker || '').toLowerCase()}`, ticker: r.ticker || '',
      assetType: r.assetType || 'stock', recommendationType: r.recommendationType || 'watch',
      timeHorizon: r.timeHorizon || 'medium_term', confidenceScore: cp(r.confidenceScore), riskScore: cp(r.riskScore), urgencyScore: cp(r.urgencyScore),
      entryZone: Array.isArray(r.entryZone) ? r.entryZone : null, targetZone: Array.isArray(r.targetZone) ? r.targetZone : null,
      stopLoss: num(r.stopLoss), thesis: bil(r.thesis), reason: bil(r.reason), catalyst: bil(r.catalyst),
      invalidationConditions: bil(r.invalidationConditions), relatedNewsId: null, causalityChainId: null,
      supportingAgents: r.supportingAgents || [], agentOutputs: [],
      status: r.recommendationType === 'buy' || r.recommendationType === 'sell' ? 'approved' : 'active',
      expiresAt: null, createdAt: now, updatedAt: now,
    })),
    urgentAlerts: (p.urgentAlerts || []).map((a, i) => ({
      id: `lalert-${i}`, recommendationId: null, ticker: a.ticker || '', assetType: a.assetType || 'stock',
      alertTitle: bil(a.alertTitle), priority: a.priority || 'high', urgencyScore: cp(a.urgencyScore), confidenceScore: cp(a.confidenceScore), riskScore: cp(a.riskScore),
      expectedMove: bil(a.expectedMove), timeWindow: a.timeWindow || '', reason: bil(a.reason), relatedNewsId: null, impactChainId: null,
      entryZone: Array.isArray(a.entryZone) ? a.entryZone : null, targetZone: Array.isArray(a.targetZone) ? a.targetZone : null,
      stopLoss: num(a.stopLoss), alternativeScenario: bil(a.alternativeScenario), invalidationConditions: bil(a.invalidationConditions),
      supportingAgents: a.supportingAgents || [], deliveryChannels: ['in_app', 'email'], status: 'new', createdAt: now, expiresAt: null,
    })),
    sentiment: {
      aiConfidenceIndex: cp(p.sentiment?.aiConfidenceIndex ?? 70),
      marketSentiment: cp(p.sentiment?.marketSentiment ?? 50),
      sentimentLabel: bil(p.sentiment?.label, 'Neutral'),
    },
  };
}

export default async () => {
  const fkey = process.env.FINNHUB_API_KEY;
  const akey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001';
  if (!fkey || !akey) {
    return Response.json({ status: 'error', detail: 'server keys not configured' }, { headers: H });
  }

  const tickers = (process.env.AGENT_TICKERS || 'NVDA,MSFT,AMD')
    .split(',').map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 3);

  try {
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

    const res = await fetch(ANTHROPIC, {
      method: 'POST',
      headers: { 'x-api-key': akey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 1600,
        system: 'You are an investment intelligence multi-agent system for educational research only (no trade execution). Output strictly valid minified JSON per the schema with fluent Arabic in every {en,ar} field.',
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) {
      return Response.json({ status: 'error', detail: (await res.text()).slice(0, 200) }, { headers: H });
    }
    const out = await res.json();
    const text = (out.content || []).map((c) => c.text || '').join('');
    const s = text.indexOf('{');
    const e = text.lastIndexOf('}');
    if (s < 0 || e < 0) return Response.json({ status: 'error', detail: 'no json' }, { headers: H });
    const result = normalize(JSON.parse(text.slice(s, e + 1)));
    return Response.json(result, { headers: H });
  } catch (err) {
    return Response.json({ status: 'error', detail: String(err).slice(0, 200) }, { headers: H });
  }
};
