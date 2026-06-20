// =============================================================================
// liveAgents.ts — client access to the streaming AI agent run.
// Reads the streamed JSON text from the function, parses + normalizes it to the
// app's types, and caches for 15 min (localStorage + memory) with concurrent
// de-duping so a page load triggers at most one Claude run. Falls back to null
// (mock data) on any error.
// =============================================================================

import type {
  Bilingual,
  CausalityChain,
  NewsEvent,
  Recommendation,
  SentimentReading,
  UrgentAlert,
} from '@/types';

export interface AgentData {
  recommendations: Recommendation[];
  urgentAlerts: UrgentAlert[];
  causality: CausalityChain[];
  news: NewsEvent[];
  sentiment: SentimentReading;
  generatedAt: string;
}

const ENDPOINT = '/.netlify/functions/agents';
const TTL = 15 * 60 * 1000;
const LS_KEY = 'iimas_agent_data';

let mem: { ts: number; data: AgentData } | null = null;
let inflight: Promise<AgentData | null> | null = null;

// ---- normalization helpers (model JSON -> app types) ------------------------
const bil = (v: any, fb = ''): Bilingual =>
  v && typeof v === 'object' && (v.en || v.ar)
    ? { en: v.en || v.ar || fb, ar: v.ar || v.en || fb }
    : typeof v === 'string'
      ? { en: v, ar: v }
      : { en: fb, ar: fb };
const num = (v: any, d: number | null = null) =>
  typeof v === 'number' && isFinite(v) ? v : d;
const cp = (v: any) => Math.max(0, Math.min(100, Math.round(num(v, 0) ?? 0)));

function normalize(p: any): AgentData {
  const now = new Date().toISOString();
  return {
    generatedAt: now,
    news: (p.news || []).map((n: any, i: number) => ({
      id: `lnews-${i}`,
      headline: bil(n.headline),
      summary: bil(n.summary),
      category: n.category || 'company',
      source: n.source || 'AI synthesis',
      publishedAt: now,
      importanceScore: cp(n.importanceScore),
      isMarketMoving: !!n.isMarketMoving,
      affectedAssets: Array.isArray(n.affectedAssets) ? n.affectedAssets : ['stock'],
      analyzedBy: ['global_news', 'market_causality'],
    })) as NewsEvent[],
    causality: (p.causality || []).map((c: any, i: number) => ({
      id: `lchain-${i}`,
      eventId: `levt-${i}`,
      cause: bil(c.cause),
      chain: (c.chain || []).map((nd: any) => ({ label: bil(nd.label), direction: nd.direction || 'neutral' })),
      directImpact: bil(c.directImpact),
      secondOrderImpact: bil(c.secondOrderImpact),
      thirdOrderImpact: bil(c.thirdOrderImpact),
      beneficiaries: c.beneficiaries || [],
      losers: c.losers || [],
      affectedAssets: c.affectedAssets || [],
      timeHorizon: c.timeHorizon || 'short_term',
      urgencyLevel: c.urgencyLevel || 'medium',
      tradeOpportunityProbability: cp(c.tradeOpportunityProbability),
    })) as CausalityChain[],
    recommendations: (p.recommendations || []).map((r: any, i: number) => ({
      id: `lrec-${i}`,
      assetId: `asset-${(r.ticker || '').toLowerCase()}`,
      ticker: r.ticker || '',
      assetType: r.assetType || 'stock',
      recommendationType: r.recommendationType || 'watch',
      timeHorizon: r.timeHorizon || 'medium_term',
      confidenceScore: cp(r.confidenceScore),
      riskScore: cp(r.riskScore),
      urgencyScore: cp(r.urgencyScore),
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
    })) as Recommendation[],
    urgentAlerts: (p.urgentAlerts || []).map((a: any, i: number) => ({
      id: `lalert-${i}`,
      recommendationId: null,
      ticker: a.ticker || '',
      assetType: a.assetType || 'stock',
      alertTitle: bil(a.alertTitle),
      priority: a.priority || 'high',
      urgencyScore: cp(a.urgencyScore),
      confidenceScore: cp(a.confidenceScore),
      riskScore: cp(a.riskScore),
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
    })) as UrgentAlert[],
    sentiment: {
      aiConfidenceIndex: cp(p.sentiment?.aiConfidenceIndex ?? 70),
      marketSentiment: cp(p.sentiment?.marketSentiment ?? 50),
      sentimentLabel: bil(p.sentiment?.label, 'Neutral'),
    } as SentimentReading,
  };
}

function readCache(): AgentData | null {
  if (mem && Date.now() - mem.ts < TTL) return mem.data;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Date.now() - p.ts < TTL && Array.isArray(p.data?.recommendations)) {
        mem = p;
        return p.data;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function getAgentData(force = false): Promise<AgentData | null> {
  if (!force) {
    const cached = readCache();
    if (cached) return cached;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const r = await fetch(ENDPOINT);
      if (!r.ok) return null;
      const text = await r.text();
      const s = text.indexOf('{');
      const e = text.lastIndexOf('}');
      if (s < 0 || e < 0) return null;
      const parsed = JSON.parse(text.slice(s, e + 1));
      if (!parsed || !Array.isArray(parsed.recommendations)) return null;
      const data = normalize(parsed);
      mem = { ts: Date.now(), data };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(mem));
      } catch {
        /* ignore quota */
      }
      return data;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function clearAgentCache() {
  mem = null;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
