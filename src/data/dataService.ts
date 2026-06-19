// =============================================================================
// dataService.ts
// Single data-access layer for the whole app. Today it returns the local mock
// dataset produced by the mock agent engine. When Supabase is enabled, each
// function has a clearly-marked place to swap in a real query — the return
// shapes already match src/types.ts, so screens need no changes.
// =============================================================================

import { getSupabase } from '@/lib/supabaseClient';
import { USE_SUPABASE } from '@/lib/config';
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
    if (USE_SUPABASE) {
      // const sb = getSupabase();
      // const { data } = await sb!.from('recommendations').select('*');
      // return (data ?? []).map(mapRecommendation);
    }
    return delay(recommendations);
  },

  async getUrgentAlerts(): Promise<UrgentAlert[]> {
    // TODO(supabase): from('urgent_alerts').select('*').order('created_at')
    return delay(urgentAlerts);
  },

  async getNews(): Promise<NewsEvent[]> {
    return delay(newsEvents);
  },

  async getMarketEvents(): Promise<MarketEvent[]> {
    return delay(marketEvents);
  },

  async getCausalityChains(): Promise<CausalityChain[]> {
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
    return delay(sentiment);
  },
};

// Keep getSupabase imported so the swap-in path is obvious to future devs.
void getSupabase;
