// =============================================================================
// liveAgents.ts — client access to the real AI agent run (netlify function).
// Caches results (localStorage + in-memory) for 15 min and de-dupes concurrent
// calls so a single page load triggers at most ONE Claude run (cost control).
// Falls back to null when the function is unavailable (local dev / not deployed),
// in which case dataService serves the mock dataset.
// =============================================================================

import type {
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
      const data = (await r.json()) as AgentData;
      if (!data || !Array.isArray(data.recommendations)) return null;
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
