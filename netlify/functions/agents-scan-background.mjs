// =============================================================================
// agents-scan-background.mjs — Netlify BACKGROUND function (up to 15 min).
// 1) Screens a broad US universe (S&P/NASDAQ leaders) via Finnhub quotes.
// 2) Shortlists the strongest movers.
// 3) Runs Claude (multi-agent committee) on the shortlist + market news.
// 4) Stores the normalized result in Supabase (agent_cache 'latest' + history).
// Triggered by agents.mjs (on demand) and agents-cron.mjs (every 30 min).
// =============================================================================

const FINNHUB = 'https://finnhub.io/api/v1';
const ANTHROPIC = 'https://api.anthropic.com/v1/messages';

// Broad, liquid US universe (S&P 500 / NASDAQ leaders across sectors).
const UNIVERSE = `AAPL,MSFT,NVDA,AMZN,GOOGL,META,TSLA,AVGO,AMD,NFLX,ADBE,CRM,ORCL,CSCO,INTC,QCOM,TXN,MU,AMAT,LRCX,KLAC,ARM,SMCI,PLTR,SNOW,CRWD,PANW,ZS,NET,DDOG,MDB,NOW,SHOP,UBER,ABNB,COIN,PYPL,JPM,BAC,WFC,GS,MS,C,SCHW,BLK,V,MA,AXP,UNH,JNJ,LLY,PFE,MRK,ABBV,TMO,DHR,AMGN,GILD,XOM,CVX,COP,SLB,EOG,OXY,CAT,DE,BA,LMT,RTX,GE,HON,UPS,WMT,COST,HD,LOW,NKE,MCD,SBUX,PG,KO,PEP,DIS,T,VZ,TMUS,LIN,FCX,NEM,F,GM,RIVN,MRNA,DELL,IBM,MARA,RIOT,SOFI,HOOD,MRVL,ON`
  .split(',');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (url) => {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
};

// ---- bilingual normalization (model JSON -> app types) ----------------------
const bil = (v, fb = '') =>
  v && typeof v === 'object' && (v.en || v.ar) ? { en: v.en || v.ar || fb, ar: v.ar || v.en || fb }
    : typeof v === 'string' ? { en: v, ar: v } : { en: fb, ar: fb };
const num = (v, d = null) => (typeof v === 'number' && isFinite(v) ? v : d);
const cp = (v) => Math.max(0, Math.min(100, Math.round(num(v, 0) ?? 0)));

function normalize(p) {
  const now = new Date().toISOString();
  return {
    generatedAt: now,
    news: (p.news || []).map((n, i) => ({
      id: `lnews-${i}`, headline: bil(n.headline), summary: bil(n.summary), category: n.category || 'company',
      source: n.source || 'AI synthesis', publishedAt: now, importanceScore: cp(n.importanceScore),
      isMarketMoving: !!n.isMarketMoving, affectedAssets: Array.isArray(n.affectedAssets) ? n.affectedAssets : ['stock'],
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
      id: `lrec-${i}`, assetId: `asset-${(r.ticker || '').toLowerCase()}`, ticker: r.ticker || '', assetType: r.assetType || 'stock',
      recommendationType: r.recommendationType || 'watch', timeHorizon: r.timeHorizon || 'medium_term',
      confidenceScore: cp(r.confidenceScore), riskScore: cp(r.riskScore), urgencyScore: cp(r.urgencyScore),
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
    screened: p._screened || [],
  };
}

const SCHEMA = `Output ONLY minified JSON (no markdown). Every narrative field MUST be {"en":"","ar":""} with fluent Arabic.
{"sentiment":{"aiConfidenceIndex":0-100,"marketSentiment":0-100,"label":{"en":"","ar":""}},
"news":[{"headline":{"en":"","ar":""},"summary":{"en":"","ar":""},"category":"economic|technology|geopolitical|energy|commodities|company|central_banks|political","source":"","importanceScore":0-100,"isMarketMoving":true,"affectedAssets":["stock"]}],
"causality":[{"cause":{"en":"","ar":""},"chain":[{"label":{"en":"","ar":""},"direction":"up|down|neutral"}],"directImpact":{"en":"","ar":""},"secondOrderImpact":{"en":"","ar":""},"thirdOrderImpact":{"en":"","ar":""},"beneficiaries":[""],"losers":[""],"affectedAssets":[""],"timeHorizon":"short_term|medium_term|long_term","urgencyLevel":"critical|high|medium|low","tradeOpportunityProbability":0-100}],
"recommendations":[{"ticker":"","assetType":"stock","recommendationType":"buy|hold|watch|sell","timeHorizon":"short_term|medium_term|long_term","confidenceScore":0-100,"riskScore":0-100,"urgencyScore":0-100,"entryZone":[lo,hi],"targetZone":[lo,hi],"stopLoss":0,"thesis":{"en":"","ar":""},"reason":{"en":"","ar":""},"catalyst":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"supportingAgents":["equity","growth","valuation","risk","smart_money"]}],
"urgentAlerts":[{"ticker":"","assetType":"stock","alertTitle":{"en":"","ar":""},"priority":"critical|high|medium|low","urgencyScore":0-100,"confidenceScore":0-100,"riskScore":0-100,"expectedMove":{"en":"","ar":""},"timeWindow":"","reason":{"en":"","ar":""},"alternativeScenario":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"entryZone":[lo,hi],"targetZone":[lo,hi],"stopLoss":0,"supportingAgents":[""]}]}
Rules: From the screened movers + news, select the STRONGEST opportunities. Produce up to 12 recommendations (most compelling first), up to 4 classified news items, up to 3 causality chains, and overall sentiment. Emit an urgentAlert ONLY when urgencyScore>=80 AND confidenceScore>=75 AND riskScore<=65 AND >=3 supporting agents AND a clear catalyst; else none. Prefer "watch" over "buy" when conviction is low. Ground every claim in the provided data.`;

async function sbUpsert(SB, SK, key, data) {
  await fetch(`${SB}/rest/v1/agent_cache?on_conflict=key`, {
    method: 'POST',
    headers: { apikey: SK, authorization: `Bearer ${SK}`, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([{ key, data, updated_at: new Date().toISOString() }]),
  }).catch(() => {});
}

export default async () => {
  const fkey = process.env.FINNHUB_API_KEY;
  const akey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001';
  const SB = process.env.SUPABASE_URL;
  const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!fkey || !akey || !SB || !SK) return new Response('missing env');

  try {
    // 1) Screen the universe via quotes (throttled to respect Finnhub limits).
    const quotes = [];
    for (let i = 0; i < UNIVERSE.length; i += 10) {
      const chunk = UNIVERSE.slice(i, i + 10);
      const got = await Promise.all(
        chunk.map(async (t) => {
          const q = await j(`${FINNHUB}/quote?symbol=${t}&token=${fkey}`);
          return q && q.c ? { ticker: t, price: q.c, changePct: q.dp ?? 0, dayHigh: q.h, dayLow: q.l } : null;
        }),
      );
      got.forEach((g) => g && quotes.push(g));
      await sleep(1300); // ~46 calls/min
    }

    // 2) Shortlist the strongest movers (by absolute % change).
    const shortlist = quotes
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 25);

    // 3) Market news.
    const general = (await j(`${FINNHUB}/news?category=general&token=${fkey}`)) || [];
    const marketNews = general.slice(0, 8).map((n) => ({ headline: n.headline, source: n.source }));

    // 4) Claude analysis.
    const userContent =
      `Today: ${new Date().toISOString().slice(0, 10)}.\n` +
      `Act as a 20-agent investment committee scanning the US market. Screened top movers and market news are below.\n` +
      `SCREENED MOVERS: ${JSON.stringify(shortlist)}\nMARKET NEWS: ${JSON.stringify(marketNews)}\n\n` +
      SCHEMA;

    const res = await fetch(ANTHROPIC, {
      method: 'POST',
      headers: { 'x-api-key': akey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: 4096,
        system: 'You are an investment intelligence multi-agent system for educational research only (no trade execution). Output strictly valid minified JSON per the schema with fluent Arabic in every {en,ar} field.',
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      await sbUpsert(SB, SK, 'error', { error: 'llm', detail: (await res.text()).slice(0, 300), at: Date.now() });
      return new Response('llm error');
    }
    const out = await res.json();
    const text = (out.content || []).map((c) => c.text || '').join('');
    const s = text.indexOf('{');
    const e = text.lastIndexOf('}');
    if (s < 0 || e < 0) {
      await sbUpsert(SB, SK, 'error', { error: 'no json', at: Date.now() });
      return new Response('no json');
    }
    const parsed = JSON.parse(text.slice(s, e + 1));
    parsed._screened = shortlist.map((q) => ({ ticker: q.ticker, changePct: Math.round(q.changePct * 100) / 100, price: q.price }));
    const result = normalize(parsed);

    await sbUpsert(SB, SK, 'latest', result);
    // history (best-effort)
    fetch(`${SB}/rest/v1/agent_history`, {
      method: 'POST',
      headers: { apikey: SK, authorization: `Bearer ${SK}`, 'content-type': 'application/json' },
      body: JSON.stringify([{ data: result }]),
    }).catch(() => {});

    return new Response('ok');
  } catch (err) {
    await sbUpsert(SB, SK, 'error', { error: String(err).slice(0, 300), at: Date.now() });
    return new Response('error');
  }
};
