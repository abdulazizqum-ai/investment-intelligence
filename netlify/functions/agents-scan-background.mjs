// =============================================================================
// agents-scan-background.mjs — Netlify BACKGROUND function (up to 15 min).
// PASS A: screen US universe -> top movers -> Claude -> recommendations, urgent
//         alerts, news, causality, sentiment.
// PASS B: Claude -> 20 agent statuses, risk assessment, macro view, asset-class
//         summaries, emerging companies, company analyses (with real Finnhub
//         fundamentals merged in).
// Stores the combined result in Supabase agent_cache 'latest' (+ history).
// =============================================================================

const FINNHUB = 'https://finnhub.io/api/v1';
const ANTHROPIC = 'https://api.anthropic.com/v1/messages';

const UNIVERSE = `AAPL,MSFT,NVDA,AMZN,GOOGL,META,TSLA,AVGO,AMD,NFLX,ADBE,CRM,ORCL,CSCO,INTC,QCOM,TXN,MU,AMAT,LRCX,KLAC,ARM,SMCI,PLTR,SNOW,CRWD,PANW,ZS,NET,DDOG,MDB,NOW,SHOP,UBER,ABNB,COIN,PYPL,JPM,BAC,WFC,GS,MS,C,SCHW,BLK,V,MA,AXP,UNH,JNJ,LLY,PFE,MRK,ABBV,TMO,DHR,AMGN,GILD,XOM,CVX,COP,SLB,EOG,OXY,CAT,DE,BA,LMT,RTX,GE,HON,UPS,WMT,COST,HD,LOW,NKE,MCD,SBUX,PG,KO,PEP,DIS,T,VZ,TMUS,LIN,FCX,NEM,F,GM,RIVN,MRNA,DELL,IBM,MARA,RIOT,SOFI,HOOD,MRVL,ON`.split(',');
const EMERGING = `IONQ,RGTI,QBTS,RKLB,ASTS,OKLO,SMR,CRDO,LUNR,BBAI,SOUN,TEM,RXRX,NNE,LAES,ACHR`.split(',');

const AGENT_IDS = ['cio','global_news','geopolitical','market_causality','macro','rates_bonds','equity','metals','energy','agriculture','currency','emerging_companies','growth','financial_analyst','valuation','smart_money','risk','recommendation','committee','urgent_alert'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (url) => { try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; } };
const bil = (v, fb = '') => v && typeof v === 'object' && (v.en || v.ar) ? { en: v.en || v.ar || fb, ar: v.ar || v.en || fb } : typeof v === 'string' ? { en: v, ar: v } : { en: fb, ar: fb };
const num = (v, d = null) => (typeof v === 'number' && isFinite(v) ? v : d);
const cp = (v) => Math.max(0, Math.min(100, Math.round(num(v, 0) ?? 0)));
const riskLevel = (s) => (s < 25 ? 'low' : s < 45 ? 'moderate' : s < 65 ? 'elevated' : s < 82 ? 'high' : 'severe');
const noiseLevel = (g, m) => (g >= 80 && m < 15 ? 'Alpha Early Signal' : g < 50 && m > 70 ? 'Late Hype' : 'Fairly Priced');

async function quotesFor(list, fkey) {
  const out = [];
  for (let i = 0; i < list.length; i += 10) {
    const got = await Promise.all(list.slice(i, i + 10).map(async (t) => {
      const q = await j(`${FINNHUB}/quote?symbol=${t}&token=${fkey}`);
      return q && q.c ? { ticker: t, price: q.c, changePct: q.dp ?? 0, dayHigh: q.h, dayLow: q.l } : null;
    }));
    got.forEach((g) => g && out.push(g));
    await sleep(1300);
  }
  return out;
}
async function metricsFor(tickers, fkey) {
  const map = {};
  for (let i = 0; i < tickers.length; i += 8) {
    await Promise.all(tickers.slice(i, i + 8).map(async (t) => {
      const m = await j(`${FINNHUB}/stock/metric?symbol=${t}&metric=all&token=${fkey}`);
      if (m?.metric) map[t] = m.metric;
    }));
    await sleep(1300);
  }
  return map;
}

async function callClaude(akey, model, content, maxTokens) {
  const res = await fetch(ANTHROPIC, {
    method: 'POST',
    headers: { 'x-api-key': akey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: maxTokens,
      system: 'You are an investment intelligence multi-agent system for educational research only (no trade execution). Output strictly valid minified JSON per the schema with fluent Arabic in every {en,ar} field.',
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) throw new Error('llm ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const out = await res.json();
  const text = (out.content || []).map((c) => c.text || '').join('');
  const s = text.indexOf('{'); const e = text.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('no json');
  return JSON.parse(text.slice(s, e + 1));
}

const SCHEMA_A = `Output ONLY minified JSON. Bilingual {"en":"","ar":""}, fluent Arabic, each text ONE short sentence.
{"sentiment":{"aiConfidenceIndex":0-100,"marketSentiment":0-100,"label":{"en":"","ar":""}},
"news":[{"headline":{"en":"","ar":""},"summary":{"en":"","ar":""},"category":"economic|technology|geopolitical|energy|commodities|company|central_banks|political","source":"","importanceScore":0-100,"isMarketMoving":true,"affectedAssets":["stock"]}],
"causality":[{"cause":{"en":"","ar":""},"chain":[{"label":{"en":"","ar":""},"direction":"up|down|neutral"}],"directImpact":{"en":"","ar":""},"secondOrderImpact":{"en":"","ar":""},"thirdOrderImpact":{"en":"","ar":""},"beneficiaries":[""],"losers":[""],"affectedAssets":[""],"timeHorizon":"short_term|medium_term|long_term","urgencyLevel":"critical|high|medium|low","tradeOpportunityProbability":0-100}],
"recommendations":[{"ticker":"","assetType":"stock","recommendationType":"buy|hold|watch|sell","timeHorizon":"short_term|medium_term|long_term","confidenceScore":0-100,"riskScore":0-100,"urgencyScore":0-100,"entryZone":[lo,hi],"targetZone":[lo,hi],"stopLoss":0,"thesis":{"en":"","ar":""},"reason":{"en":"","ar":""},"catalyst":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"supportingAgents":["equity","growth","valuation","risk"]}],
"urgentAlerts":[{"ticker":"","assetType":"stock","alertTitle":{"en":"","ar":""},"priority":"critical|high|medium|low","urgencyScore":0-100,"confidenceScore":0-100,"riskScore":0-100,"expectedMove":{"en":"","ar":""},"timeWindow":"","reason":{"en":"","ar":""},"alternativeScenario":{"en":"","ar":""},"invalidationConditions":{"en":"","ar":""},"entryZone":[lo,hi],"targetZone":[lo,hi],"stopLoss":0,"supportingAgents":[""]}]}
Rules: up to 6 recommendations, up to 3 news, up to 2 causality. urgentAlert ONLY if urgency>=80 AND confidence>=75 AND risk<=65 AND >=3 agents AND clear catalyst; else []. Ground in data.`;

const SCHEMA_B = `Output ONLY minified JSON. Bilingual {"en":"","ar":""}, fluent Arabic, each text ONE short sentence.
{"agents":[{"id":"<one of: ${AGENT_IDS.join(',')}>","status":"active|idle|error","confidence":0-100,"note":{"en":"","ar":""}}],
"risk":{"overallScore":0-100,"summary":{"en":"","ar":""},"components":[{"type":"inflation|interest_rate|geopolitical|recession|sector|market|liquidity|earnings","label":{"en":"","ar":""},"score":0-100,"note":{"en":"","ar":""}}]},
"macro":{"state":"expanding|slowing|recession_risk|inflationary","summary":{"en":"","ar":""},"indicators":[{"key":"cpi|gdp|unemployment|rates|growth","label":{"en":"","ar":""},"trend":"up|down|flat","note":{"en":"","ar":""}}]},
"assetClasses":[{"assetType":"stock|metal|energy|agriculture|currency","trend":"bullish|bearish|neutral","keyDrivers":[{"en":"","ar":""}],"recommendation":"buy|hold|watch|sell","riskLevel":"low|moderate|elevated|high|severe"}],
"companies":[{"ticker":"","bull":{"en":"","ar":""},"bear":{"en":"","ar":""},"neutral":{"en":"","ar":""},"finalScore":0-100,"valuationRating":"undervalued|fair_value|overvalued","health":"strong|improving|risky|weak","urgencyScore":0-100}],
"emerging":[{"ticker":"","sector":"","growthScore":0-100,"mediaMentionsCount":0-100,"bull":{"en":"","ar":""},"bear":{"en":"","ar":""},"neutral":{"en":"","ar":""},"finalScore":0-100,"urgencyScore":0-100}]}
Provide ALL 20 agents. 5 assetClasses (stock,metal,energy,agriculture,currency). Ground in the provided data.`;

function buildCompany(ticker, m, q, narr) {
  const price = q?.price ?? num(m?.['52WeekHigh'] ? (m['52WeekHigh'] + (m['52WeekLow'] || 0)) / 2 : null) ?? 0;
  return {
    id: `asset-${ticker.toLowerCase()}`, name: narr?.name || ticker, ticker, sector: narr?.sector || 'Equity', assetType: 'stock',
    marketCap: num(m?.marketCapitalization, 0) * 1e6, price,
    mediaMentionsCount: cp(narr?.mediaMentionsCount ?? 40),
    noiseLevel: noiseLevel(cp(narr?.growthScore ?? 60), cp(narr?.mediaMentionsCount ?? 40)),
    earlyOpportunityScore: cp(narr?.finalScore ?? 50), urgencyScore: cp(narr?.urgencyScore ?? 50),
    financials: {
      revenue: 0, netIncome: 0,
      grossMargin: Math.round(num(m?.grossMarginTTM, 0) ?? 0), operatingMargin: Math.round(num(m?.operatingMarginTTM, 0) ?? 0),
      freeCashFlow: 0, debt: num(m?.totalDebt, 0) ?? 0, cashPosition: 0, cashBurn: 0,
      health: narr?.health || 'improving',
    },
    growth: {
      revenueGrowth: Math.round(num(m?.revenueGrowthTTMYoy, 0) ?? 0), customerGrowth: 0, hiringGrowth: 0,
      newContracts: 0, partnerships: 0, productAdoption: cp(narr?.growthScore ?? 50), marketExpansion: cp(narr?.growthScore ?? 50),
      growthScore: cp(narr?.growthScore ?? 60),
    },
    valuation: {
      pe: num(m?.peTTM), forwardPe: num(m?.forwardPe ?? m?.peTTM), peg: num(m?.pegTTM), evEbitda: num(m?.['evEbitdaTTM']),
      priceToSales: num(m?.psTTM), dcfFairValue: null, rating: narr?.valuationRating || 'fair_value',
    },
    smartMoney: { institutionalOwnership: 0, hedgeFundActivity: 'neutral', insiderBuying: 0, insiderSelling: 0, thirteenFChange: 0, unusualVolume: !!(q && Math.abs(q.changePct) > 5), netFlow: 'neutral' },
    bullCase: bil(narr?.bull), bearCase: bil(narr?.bear), neutralCase: bil(narr?.neutral), finalScore: cp(narr?.finalScore ?? 50),
  };
}

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
  const now = new Date().toISOString();

  try {
    // ---- Screen + market news ----
    const quotes = await quotesFor(UNIVERSE, fkey);
    const shortlist = quotes.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 18);
    const general = (await j(`${FINNHUB}/news?category=general&token=${fkey}`)) || [];
    const marketNews = general.slice(0, 8).map((n) => ({ headline: n.headline, source: n.source }));

    // ---- PASS A ----
    const a = await callClaude(akey, model,
      `Today: ${now.slice(0, 10)}. Act as a 20-agent US-market committee. SCREENED MOVERS: ${JSON.stringify(shortlist)} MARKET NEWS: ${JSON.stringify(marketNews)}\n\n${SCHEMA_A}`,
      8192);

    const recTickers = (a.recommendations || []).map((r) => (r.ticker || '').toUpperCase()).filter(Boolean).slice(0, 6);

    // ---- Real fundamentals for company + emerging tickers ----
    const emQuotes = await quotesFor(EMERGING, fkey);
    const emShort = emQuotes.sort((x, y) => Math.abs(y.changePct) - Math.abs(x.changePct)).slice(0, 6).map((q) => q.ticker);
    const metrics = await metricsFor([...new Set([...recTickers, ...emShort])], fkey);
    const quoteMap = {}; [...quotes, ...emQuotes].forEach((q) => (quoteMap[q.ticker] = q));

    // ---- PASS B ----
    const compactRecs = (a.recommendations || []).map((r) => ({ ticker: r.ticker, type: r.recommendationType }));
    const b = await callClaude(akey, model,
      `Today: ${now.slice(0, 10)}. Sentiment: ${JSON.stringify(a.sentiment)}. Top movers: ${JSON.stringify(shortlist.slice(0, 10))}. Recommendations: ${JSON.stringify(compactRecs)}. Company tickers to analyze: ${JSON.stringify(recTickers)}. Emerging tickers (small/mid growth): ${JSON.stringify(emShort)}. Market news: ${JSON.stringify(marketNews.slice(0, 5))}.\n\n${SCHEMA_B}`,
      8192);

    // ---- Normalize PASS A ----
    const result = {
      generatedAt: now,
      screened: shortlist.map((q) => ({ ticker: q.ticker, changePct: Math.round(q.changePct * 100) / 100, price: q.price })),
      sentiment: { aiConfidenceIndex: cp(a.sentiment?.aiConfidenceIndex ?? 70), marketSentiment: cp(a.sentiment?.marketSentiment ?? 50), sentimentLabel: bil(a.sentiment?.label, 'Neutral') },
      news: (a.news || []).map((n, i) => ({ id: `lnews-${i}`, headline: bil(n.headline), summary: bil(n.summary), category: n.category || 'company', source: n.source || 'AI', publishedAt: now, importanceScore: cp(n.importanceScore), isMarketMoving: !!n.isMarketMoving, affectedAssets: Array.isArray(n.affectedAssets) ? n.affectedAssets : ['stock'], analyzedBy: ['global_news', 'market_causality'] })),
      causality: (a.causality || []).map((c, i) => ({ id: `lchain-${i}`, eventId: `levt-${i}`, cause: bil(c.cause), chain: (c.chain || []).map((nd) => ({ label: bil(nd.label), direction: nd.direction || 'neutral' })), directImpact: bil(c.directImpact), secondOrderImpact: bil(c.secondOrderImpact), thirdOrderImpact: bil(c.thirdOrderImpact), beneficiaries: c.beneficiaries || [], losers: c.losers || [], affectedAssets: c.affectedAssets || [], timeHorizon: c.timeHorizon || 'short_term', urgencyLevel: c.urgencyLevel || 'medium', tradeOpportunityProbability: cp(c.tradeOpportunityProbability) })),
      recommendations: (a.recommendations || []).map((r, i) => ({ id: `lrec-${i}`, assetId: `asset-${(r.ticker || '').toLowerCase()}`, ticker: r.ticker || '', assetType: r.assetType || 'stock', recommendationType: r.recommendationType || 'watch', timeHorizon: r.timeHorizon || 'medium_term', confidenceScore: cp(r.confidenceScore), riskScore: cp(r.riskScore), urgencyScore: cp(r.urgencyScore), entryZone: Array.isArray(r.entryZone) ? r.entryZone : null, targetZone: Array.isArray(r.targetZone) ? r.targetZone : null, stopLoss: num(r.stopLoss), thesis: bil(r.thesis), reason: bil(r.reason), catalyst: bil(r.catalyst), invalidationConditions: bil(r.invalidationConditions), relatedNewsId: null, causalityChainId: null, supportingAgents: r.supportingAgents || [], agentOutputs: [], status: r.recommendationType === 'buy' || r.recommendationType === 'sell' ? 'approved' : 'active', expiresAt: null, createdAt: now, updatedAt: now })),
      urgentAlerts: (a.urgentAlerts || []).map((al, i) => ({ id: `lalert-${i}`, recommendationId: null, ticker: al.ticker || '', assetType: al.assetType || 'stock', alertTitle: bil(al.alertTitle), priority: al.priority || 'high', urgencyScore: cp(al.urgencyScore), confidenceScore: cp(al.confidenceScore), riskScore: cp(al.riskScore), expectedMove: bil(al.expectedMove), timeWindow: al.timeWindow || '', reason: bil(al.reason), relatedNewsId: null, impactChainId: null, entryZone: Array.isArray(al.entryZone) ? al.entryZone : null, targetZone: Array.isArray(al.targetZone) ? al.targetZone : null, stopLoss: num(al.stopLoss), alternativeScenario: bil(al.alternativeScenario), invalidationConditions: bil(al.invalidationConditions), supportingAgents: al.supportingAgents || [], deliveryChannels: ['in_app', 'email'], status: 'new', createdAt: now, expiresAt: null })),
    };

    // ---- Normalize PASS B ----
    const agentNote = {};
    (b.agents || []).forEach((ag) => { if (ag.id) agentNote[ag.id] = ag; });
    result.agents = AGENT_IDS.map((id) => {
      const ag = agentNote[id] || {};
      return { id, status: ag.status || 'active', confidence: cp(ag.confidence ?? 70), note: bil(ag.note), lastRun: now };
    });

    const rc = (b.risk?.components || []).map((c) => ({ type: c.type || 'market', label: bil(c.label), score: cp(c.score), level: riskLevel(cp(c.score)), note: bil(c.note) }));
    const overall = b.risk?.overallScore != null ? cp(b.risk.overallScore) : (rc.length ? Math.round(rc.reduce((s, c) => s + c.score, 0) / rc.length) : 50);
    result.risk = { id: 'risk-market', subject: { en: 'Overall Market', ar: 'السوق بشكل عام' }, overallScore: overall, level: riskLevel(overall), components: rc, positionSizeSuggestion: '1-2% per idea', stopLoss: null, maxDrawdownScenario: bil(b.risk?.summary), updatedAt: now };

    result.macro = {
      state: b.macro?.state || 'slowing', summary: bil(b.macro?.summary),
      indicators: (b.macro?.indicators || []).map((m) => ({ key: m.key || 'cpi', label: bil(m.label), value: 0, previous: 0, consensus: 0, surprise: false, trend: m.trend || 'flat', note: bil(m.note) })),
    };

    result.assetClasses = (b.assetClasses || []).map((ac) => ({
      assetType: ac.assetType || 'stock',
      name: bil({ en: ac.assetType, ar: ac.assetType }),
      trend: ac.trend || 'neutral', keyDrivers: (ac.keyDrivers || []).map((d) => bil(d)),
      relatedNewsIds: [], recommendation: ac.recommendation || 'watch', riskLevel: ac.riskLevel || 'moderate', instruments: [],
    }));

    const companies = recTickers.map((t) => buildCompany(t, metrics[t], quoteMap[t], (b.companies || []).find((c) => (c.ticker || '').toUpperCase() === t)));
    const emergingCos = emShort.map((t) => {
      const narr = (b.emerging || []).find((c) => (c.ticker || '').toUpperCase() === t) || {};
      return buildCompany(t, metrics[t], quoteMap[t], narr);
    });
    result.companies = [...emergingCos, ...companies];

    await sbUpsert(SB, SK, 'latest', result);
    fetch(`${SB}/rest/v1/agent_history`, { method: 'POST', headers: { apikey: SK, authorization: `Bearer ${SK}`, 'content-type': 'application/json' }, body: JSON.stringify([{ data: result }]) }).catch(() => {});
    return new Response('ok');
  } catch (err) {
    await sbUpsert(SB, SK, 'error', { error: String(err).slice(0, 300), at: Date.now() });
    return new Response('error');
  }
};
