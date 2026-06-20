// =============================================================================
// agents-run-background.mjs — Netlify BACKGROUND function (up to 15 min).
// Gathers live Finnhub data, runs Claude as the multi-agent committee, and
// stores the normalized result in Netlify Blobs (store "agents", key "latest").
// Triggered by agents.mjs (on demand) and agents-cron.mjs (every 20 min).
// =============================================================================

import { getStore } from '@netlify/blobs';

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
        high52w: m['52WeekHigh'] ?? null,
        low52w: m['52WeekLow'] ?? null,
        analyst: rec?.[0] ?? null,
        news: (news || []).slice(0, 3).map((n) => ({ headline: n.headline, summary: (n.summary || '').slice(0, 200) })),
      };
    }),
  );

  return {
    marketNews: generalNews.slice(0, 10).map((n) => ({ headline: n.headline, summary: (n.summary || '').slice(0, 240), source: n.source })),
    tickers: perTicker,
  };
}

const SCHEMA = `Return ONLY minified JSON (no markdown). Every narrative field MUST be {"en":"...","ar":"..."} with fluent Arabic.
{
 "sentiment":{"aiConfidenceIndex":0-100,"marketSentiment":0-100,"label":{"en":"","ar":""}},
 "news":[{"headline":{"en":"","ar":""},"summary":{"en":"","ar":""},"category":"economic|political|geopolitical|technology|energy|central_banks|commodities|company","source":"","importanceScore":0-100,"isMarketMoving":true,"affectedAssets":["stock|metal|energy|agriculture|currency|index"]}],
 "causality":[{"cause":{"en":"","ar":""},"chain":[{"label":{"en":"","ar":""},"direction":"up|down|neutral"}],"directImpact":{"en":"","ar":""},"secondOrderImpact":{"en":"","ar":""},"thirdOrderImpact":{"en":"","ar":""},"beneficiaries":[""],"losers":[""],"affectedAssets":[""],"timeHorizon":"short_term|medium_term|long_term","urgencyLevel":"critical|high|medium|low","tradeOpportunityProbability":0-100}],
 "recommendations":[{"ticker":"","assetType":"stock","recommendationType":"buy|hold|watch|sell","timeHorizon":"short_term|medium_term|long_term","confidenceScore":0-100,"riskScore":0-100,"urgencyScore":0-100,"entryZone":[low,high],"targetZone":[low,high],"stopLoss":0,"thesis":{"en":"","ar":""},"reason":{"en":"","ar":""},"catalyst":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"supportingAgents":["equity","growth","valuation","smart_money","risk"]}],
 "urgentAlerts":[{"ticker":"","assetType":"stock","alertTitle":{"en":"","ar":""},"priority":"critical|high|medium|low","urgencyScore":0-100,"confidenceScore":0-100,"riskScore":0-100,"expectedMove":{"en":"","ar":""},"timeWindow":"","reason":{"en":"","ar":""},"alternativeScenario":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"entryZone":[low,high],"targetZone":[low,high],"stopLoss":0,"supportingAgents":[""]}]
}
Rules: one recommendation per provided ticker. Only create an urgentAlert when urgencyScore>=80 AND confidenceScore>=75 AND riskScore<=65 AND >=3 supporting agents AND a clear catalyst; otherwise none. Prefer "watch" over "buy" when data is weak. Ground every claim in the provided data.`;

function bil(v, fb = '') {
  if (v && typeof v === 'object' && (v.en || v.ar)) return { en: v.en || v.ar || fb, ar: v.ar || v.en || fb };
  if (typeof v === 'string') return { en: v, ar: v };
  return { en: fb, ar: fb };
}
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
      analyzedBy: ['global_news', 'geopolitical', 'market_causality'],
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
      timeHorizon: r.timeHorizon || 'medium_term', confidenceScore: cp(r.confidenceScore),
      riskScore: cp(r.riskScore), urgencyScore: cp(r.urgencyScore),
      entryZone: Array.isArray(r.entryZone) ? r.entryZone : null, targetZone: Array.isArray(r.targetZone) ? r.targetZone : null,
      stopLoss: num(r.stopLoss), thesis: bil(r.thesis), reason: bil(r.reason), catalyst: bil(r.catalyst),
      invalidationConditions: bil(r.invalidationConditions), relatedNewsId: null, causalityChainId: null,
      supportingAgents: r.supportingAgents || [], agentOutputs: [],
      status: r.recommendationType === 'buy' || r.recommendationType === 'sell' ? 'approved' : 'active',
      expiresAt: null, createdAt: now, updatedAt: now,
    })),
    urgentAlerts: (p.urgentAlerts || []).map((a, i) => ({
      id: `lalert-${i}`, recommendationId: null, ticker: a.ticker || '', assetType: a.assetType || 'stock',
      alertTitle: bil(a.alertTitle), priority: a.priority || 'high', urgencyScore: cp(a.urgencyScore),
      confidenceScore: cp(a.confidenceScore), riskScore: cp(a.riskScore), expectedMove: bil(a.expectedMove),
      timeWindow: a.timeWindow || '', reason: bil(a.reason), relatedNewsId: null, impactChainId: null,
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
  const model = process.env.LLM_MODEL || 'claude-sonnet-4-6';
  const store = getStore('agents');

  if (!fkey || !akey) {
    await store.setJSON('error', { error: 'server keys not configured', at: Date.now() });
    return new Response('ok');
  }

  const tickers = (process.env.AGENT_TICKERS || 'NVDA,MSFT,AMD,PLTR,TSLA,SMCI')
    .split(',').map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 8);

  try {
    const data = await gatherData(tickers, fkey);
    const userContent =
      `Today: ${new Date().toISOString().slice(0, 10)}.\n` +
      `Act as a 20-agent investment intelligence committee (news, geopolitical, market-causality, macro, rates, equity, metals, energy, agriculture, currency, emerging-companies, growth, financial-analyst, valuation, smart-money, risk, recommendation, committee, urgent-alert, CIO). Analyze ONLY the real data below.\n\n` +
      `MARKET NEWS:\n${JSON.stringify(data.marketNews)}\n\nTICKERS DATA:\n${JSON.stringify(data.tickers)}\n\n` +
      SCHEMA;

    const res = await fetch(ANTHROPIC, {
      method: 'POST',
      headers: { 'x-api-key': akey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: 4096,
        system: 'You are an investment intelligence multi-agent system for educational research only (no trade execution). Output strictly valid minified JSON per the schema, with fluent Arabic in every {en,ar} field.',
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      await store.setJSON('error', { error: 'llm error', detail: (await res.text()).slice(0, 300), at: Date.now() });
      return new Response('ok');
    }
    const out = await res.json();
    const text = (out.content || []).map((c) => c.text || '').join('');
    const s = text.indexOf('{'); const e = text.lastIndexOf('}');
    if (s < 0 || e < 0) {
      await store.setJSON('error', { error: 'no json', at: Date.now() });
      return new Response('ok');
    }
    const result = normalize(JSON.parse(text.slice(s, e + 1)));
    await store.setJSON('latest', result);
    return new Response('ok');
  } catch (err) {
    await store.setJSON('error', { error: String(err).slice(0, 300), at: Date.now() });
    return new Response('ok');
  }
}
