// =============================================================================
// dataService.ts
// Single data-access layer for the whole app. Today it returns the local mock
// dataset produced by the mock agent engine. When Supabase is enabled, each
// function has a clearly-marked place to swap in a real query — the return
// shapes already match src/types.ts, so screens need no changes.
// =============================================================================

import { getSupabase } from '@/lib/supabaseClient';
import { USE_SUPABASE } from '@/lib/config';
import { getAgentData } from './liveAgents';
import {
  agents,
  assetClasses,
  causalityChains,
  companies,
  indices,
  macro,
  marketEvents,
  newsEvents,
  notifications,
  recommendations,
  riskAssessments,
  sentiment,
  urgentAlerts,
} from './mockData';
import type {
  Agent,
  AppNotification,
  AssetClassSummary,
  CausalityChain,
  Company,
  MacroSnapshot,
  MarketEvent,
  MarketIndexQuote,
  NewsEvent,
  Recommendation,
  RiskAssessment,
  SentimentReading,
  UrgentAlert,
} from '@/types';

const delay = <T,>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const dataService = {
  async getRecommendations(): Promise<Recommendation[]> {
    const live = await getAgentData();
    if (live?.recommendations?.length) return live.recommendations;
    return delay(recommendations);
  },

  async getUrgentAlerts(): Promise<UrgentAlert[]> {
    const live = await getAgentData();
    if (live) return live.urgentAlerts ?? [];
    return delay(urgentAlerts);
  },

  async getNews(): Promise<NewsEvent[]> {
    const live = await getAgentData();
    if (live?.news?.length) return live.news;
    return delay(newsEvents);
  },

  async getMarketEvents(): Promise<MarketEvent[]> {
    return delay(marketEvents);
  },

  async getCausalityChains(): Promise<CausalityChain[]> {
    const live = await getAgentData();
    if (live?.causality?.length) return live.causality;
    return delay(causalityChains);
  },

  async getCompanies(): Promise<Company[]> {
    return delay(companies);
  },

  async getCompany(id: string): Promise<Company | undefined> {
    return delay(companies.find((c) => c.id === id || c.ticker === id));
  },

  async getRisks(): Promise<RiskAssessment[]> {
    return delay(riskAssessments);
  },

  async getAgents(): Promise<Agent[]> {
    return delay(agents);
  },

  async getNotifications(): Promise<AppNotification[]> {
    return delay(notifications);
  },

  async getAssetClasses(): Promise<AssetClassSummary[]> {
    return delay(assetClasses);
  },

  async getMacro(): Promise<MacroSnapshot> {
    return delay(macro);
  },

  async getIndices(): Promise<MarketIndexQuote[]> {
    return delay(indices);
  },

  async getSentiment(): Promise<SentimentReading> {
    const live = await getAgentData();
    if (live?.sentiment) return live.sentiment;
    return delay(sentiment);
  },
};

// Keep getSupabase imported so the swap-in path is obvious to future devs.
void getSupabase;
