// =============================================================================
// liveAgents.ts — client access to the 24/7 scanner results.
// The server (Supabase-backed reader) returns already-normalized data, so this
// just fetches, caches (5 min memory + localStorage) and de-dupes concurrent
// calls. Falls back to null (mock data) on any error / while the first scan
// is still building.
// =============================================================================

import type {
  AssetClassSummary,
  Bilingual,
  CausalityChain,
  Company,
  MacroSnapshot,
  NewsEvent,
  Recommendation,
  RiskAssessment,
  SentimentReading,
  UrgentAlert,
} from '@/types';

export interface LiveAgentOutput {
  id: string;
  status: 'active' | 'idle' | 'error';
  confidence: number;
  note: Bilingual;
  lastRun: string;
}

export interface AgentData {
  recommendations: Recommendation[];
  urgentAlerts: UrgentAlert[];
  causality: CausalityChain[];
  news: NewsEvent[];
  sentiment: SentimentReading;
  generatedAt: string;
  screened?: { ticker: string; changePct: number; price: number }[];
  agents?: LiveAgentOutput[];
  risk?: RiskAssessment;
  macro?: MacroSnapshot;
  assetClasses?: AssetClassSummary[];
  companies?: Company[];
}

const ENDPOINT = '/.netlify/functions/agents';
const TTL = 5 * 60 * 1000;
const LS_KEY = 'iimas_agent_data';

let mem: { ts: number; data: AgentData } | null = null;
let inflight: Promise<AgentData | null> | null = null;

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
      const data = await r.json();
      if (!data || !Array.isArray(data.recommendations)) return null; // building / error
      mem = { ts: Date.now(), data };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(mem));
      } catch {
        /* ignore quota */
      }
      return data as AgentData;
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
