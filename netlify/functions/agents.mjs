// =============================================================================
// netlify/functions/agents.mjs
// Real AI agent engine: pulls live data from Finnhub, then asks Claude to act
// as the multi-agent investment system and return structured, grounded output.
// Keys are read from server-side env (ANTHROPIC_API_KEY, FINNHUB_API_KEY).
// Educational research only — no trade execution.
// =============================================================================

const FINNHUB = 'https://finnhub.io/api/v1';
const ANTHROPIC = 'https://api.anthropic.com/v1/messages';

const j = async (url) => {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
};

const ymd = (d) => d.toISOString().slice(0, 10);

async function gatherData(tickers, fkey) {
  const today = new Date();
  const weekAgo = new Date(Date.now() - 7 * 864e5);

  const generalNews = (await j(`${FINNHUB}/news?category=general&token=${fkey}`)) || [];

  const perTicker = await Promise.all(
    tickers.map(async (t) => {
      const [quote, metric, rec, news] = await Promise.all([
        j(`${FINNHUB}/quote?symbol=${t}&token=${fkey}`),
        j(`${FINNHUB}/stock/metric?symbol=${t}&metric=all&token=${fkey}`),
        j(`${FINNHUB}/stock/recommendation?symbol=${t}&token=${fkey}`),
        j(`${FINNHUB}/company-news?symbol=${t}&from=${ymd(weekAgo)}&to=${ymd(today)}&token=${fkey}`),
      ]);
      const m = metric?.metric ?? {};
      return {
        ticker: t,
        price: quote?.c ?? null,
        changePct: quote?.dp ?? null,
        peTTM: m.peTTM ?? null,
        psTTM: m.psTTM ?? null,
        marketCap: m.marketCapitalization ?? null,
        revenueGrowthTTM: m.revenueGrowthTTMYoy ?? null,
        grossMargin: m.grossMarginTTM ?? null,
        '52wHigh': m['52WeekHigh'] ?? null,
        '52wLow': m['52WeekLow'] ?? null,
        analyst: rec?.[0] ?? null,
        news: (news || []).slice(0, 3).map((n) => ({ headline: n.headline, summary: n.summary })),
      };
    }),
  );

  return {
    marketNews: generalNews.slice(0, 10).map((n) => ({
      headline: n.headline,
      summary: (n.summary || '').slice(0, 300),
      source: n.source,
    })),
    tickers: perTicker,
  };
}

const SCHEMA = `Return ONLY minified JSON (no markdown, no prose) with this exact shape. Every narrative field MUST be a bilingual object {"en":"...","ar":"..."} with a real, fluent Arabic translation.
{
 "sentiment":{"aiConfidenceIndex":0-100,"marketSentiment":0-100,"label":{"en":"","ar":""}},
 "news":[{"headline":{"en":"","ar":""},"summary":{"en":"","ar":""},"category":"economic|political|geopolitical|technology|energy|central_banks|commodities|company","source":"","importanceScore":0-100,"isMarketMoving":true,"affectedAssets":["stock|metal|energy|agriculture|currency|index"]}],
 "causality":[{"cause":{"en":"","ar":""},"chain":[{"label":{"en":"","ar":""},"direction":"up|down|neutral"}],"directImpact":{"en":"","ar":""},"secondOrderImpact":{"en":"","ar":""},"thirdOrderImpact":{"en":"","ar":""},"beneficiaries":[""],"losers":[""],"affectedAssets":[""],"timeHorizon":"short_term|medium_term|long_term","urgencyLevel":"critical|high|medium|low","tradeOpportunityProbability":0-100}],
 "recommendations":[{"ticker":"","assetType":"stock","recommendationType":"buy|hold|watch|sell","timeHorizon":"short_term|medium_term|long_term","confidenceScore":0-100,"riskScore":0-100,"urgencyScore":0-100,"entryZone":[low,high],"targetZone":[low,high],"stopLoss":0,"thesis":{"en":"","ar":""},"reason":{"en":"","ar":""},"catalyst":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"supportingAgents":["equity","growth","valuation","smart_money","risk"]}],
 "urgentAlerts":[{"ticker":"","assetType":"stock","alertTitle":{"en":"","ar":""},"priority":"critical|high|medium|low","urgencyScore":0-100,"confidenceScore":0-100,"riskScore":0-100,"expectedMove":{"en":"","ar":""},"timeWindow":"","reason":{"en":"","ar":""},"alternativeScenario":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"entryZone":[low,high],"targetZone":[low,high],"stopLoss":0,"supportingAgents":[""]}]
}
Rules: Only create an urgentAlert when urgencyScore>=80 AND confidenceScore>=75 AND riskScore<=65 AND at least 3 supporting agents AND a clear catalyst exists. If data is weak, prefer "watch" over "buy". Mark priority "critical" only for a strong, time-sensitive catalyst with acceptable risk. Ground every number and claim in the provided data.`;

function bil(v, fallback = '') {
  if (v && typeof v === 'object' && (v.en || v.ar)) return { en: v.en || v.ar || fallback, ar: v.ar || v.en || fallback };
  if (typeof v === 'string') return { en: v, ar: v };
  return { en: fallback, ar: fallback };
}
const num = (v, d = null) => (typeof v === 'number' && isFinite(v) ? v : d);
const clampPct = (v) => Math.max(0, Math.min(100, Math.round(num(v, 0))));

function normalize(parsed) {
  const now = new Date().toISOString();
  const news = (parsed.news || []).map((n, i) => ({
    id: `lnews-${i}`,
    headline: bil(n.headline),
    summary: bil(n.summary),
    category: n.category || 'company',
    source: n.source || 'AI synthesis',
    publishedAt: now,
    importanceScore: clampPct(n.importanceScore),
    isMarketMoving: !!n.isMarketMoving,
    affectedAssets: Array.isArray(n.affectedAssets) ? n.affectedAssets : ['stock'],
    analyzedBy: ['global_news', 'geopolitical', 'market_causality'],
  }));

  const causality = (parsed.causality || []).map((c, i) => ({
    id: `lchain-${i}`,
    eventId: `levt-${i}`,
    cause: bil(c.cause),
    chain: (c.chain || []).map((nd) => ({ label: bil(nd.label), direction: nd.direction || 'neutral' })),
    directImpact: bil(c.directImpact),
    secondOrderImpact: bil(c.secondOrderImpact),
    thirdOrderImpact: bil(c.thirdOrderImpact),
    beneficiaries: c.beneficiaries || [],
    losers: c.losers || [],
    affectedAssets: c.affectedAssets || [],
    timeHorizon: c.timeHorizon || 'short_term',
    urgencyLevel: c.urgencyLevel || 'medium',
    tradeOpportunityProbability: clampPct(c.tradeOpportunityProbability),
  }));

  const recommendations = (parsed.recommendations || []).map((r, i) => ({
    id: `lrec-${i}`,
    assetId: `asset-${(r.ticker || '').toLowerCase()}`,
    ticker: r.ticker || '',
    assetType: r.assetType || 'stock',
    recommendationType: r.recommendationType || 'watch',
    timeHorizon: r.timeHorizon || 'medium_term',
    confidenceScore: clampPct(r.confidenceScore),
    riskScore: clampPct(r.riskScore),
    urgencyScore: clampPct(r.urgencyScore),
    entryZone: Array.isArray(r.entryZone) ? r.entryZone : null,
    targetZone: Array.isArray(r.targetZone) ? r.targetZone : null,
    stopLoss: num(r.stopLoss),
    thesis: bil(r.thesis),
    reason: bil(r.reason),
    catalyst: bil(r.catalyst),
    invalidationConditions: bil(r.invalidationConditions),
    relatedNewsId: null,
    causalityChainId: null,
    supportingAgents: r.supportingAgents || [],
    agentOutputs: [],
    status: r.recommendationType === 'buy' || r.recommendationType === 'sell' ? 'approved' : 'active',
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
  }));

  const urgentAlerts = (parsed.urgentAlerts || []).map((a, i) => ({
    id: `lalert-${i}`,
    recommendationId: null,
    ticker: a.ticker || '',
    assetType: a.assetType || 'stock',
    alertTitle: bil(a.alertTitle),
    priority: a.priority || 'high',
    urgencyScore: clampPct(a.urgencyScore),
    confidenceScore: clampPct(a.confidenceScore),
    riskScore: clampPct(a.riskScore),
    expectedMove: bil(a.expectedMove),
    timeWindow: a.timeWindow || '',
    reason: bil(a.reason),
    relatedNewsId: null,
    impactChainId: null,
    entryZone: Array.isArray(a.entryZone) ? a.entryZone : null,
    targetZone: Array.isArray(a.targetZone) ? a.targetZone : null,
    stopLoss: num(a.stopLoss),
    alternativeScenario: bil(a.alternativeScenario),
    invalidationConditions: bil(a.invalidationConditions),
    supportingAgents: a.supportingAgents || [],
    deliveryChannels: ['in_app', 'email'],
    status: 'new',
    createdAt: now,
    expiresAt: null,
  }));

  const s = parsed.sentiment || {};
  const sentiment = {
    aiConfidenceIndex: clampPct(s.aiConfidenceIndex ?? 70),
    marketSentiment: clampPct(s.marketSentiment ?? 50),
    sentimentLabel: bil(s.label, 'Neutral'),
  };

  return { recommendations, urgentAlerts, causality, news, sentiment, generatedAt: now };
}

export async function handler(event) {
  const fkey = process.env.FINNHUB_API_KEY;
  const akey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.LLM_MODEL || 'claude-sonnet-4-6';
  if (!fkey || !akey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'server keys not configured' }) };
  }

  const tickers = (event.queryStringParameters?.tickers ||
    process.env.AGENT_TICKERS ||
    'NVDA,MSFT,AMD,PLTR,TSLA,SMCI')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 8);

  try {
    const data = await gatherData(tickers, fkey);

    const userContent =
      `Today: ${new Date().toISOString().slice(0, 10)}.\n` +
      `Act as a 20-agent investment intelligence committee (news, geopolitical, market-causality, macro, rates, equity, metals, energy, agriculture, currency, emerging-companies, growth, financial-analyst, valuation, smart-money, risk, recommendation, committee, urgent-alert, CIO). ` +
      `Analyze ONLY the real data below and produce grounded research.\n\n` +
      `MARKET NEWS:\n${JSON.stringify(data.marketNews)}\n\n` +
      `TICKERS DATA:\n${JSON.stringify(data.tickers)}\n\n` +
      SCHEMA;

    const res = await fetch(ANTHROPIC, {
      method: 'POST',
      headers: {
        'x-api-key': akey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system:
          'You are an investment intelligence multi-agent system for educational research only (no trade execution). You output strictly valid minified JSON per the user-provided schema, with fluent Arabic in every {en,ar} field.',
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'llm error', detail: errText.slice(0, 300) }) };
    }

    const out = await res.json();
    const text = (out.content || []).map((c) => c.text || '').join('');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end < 0) {
      return { statusCode: 502, body: JSON.stringify({ error: 'no json from llm' }) };
    }
    const parsed = JSON.parse(text.slice(start, end + 1));
    const result = normalize(parsed);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=900',
        'access-control-allow-origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'agent run failed', detail: String(e).slice(0, 300) }) };
  }
}
