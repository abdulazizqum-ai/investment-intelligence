// =============================================================================
// Investment Intelligence Multi-Agent System — Core TypeScript Data Model
// All user-facing analytical text is bilingual: { en, ar }.
// =============================================================================

/** Bilingual string used for every recommendation / alert narrative field. */
export interface Bilingual {
  en: string;
  ar: string;
}

export type Locale = 'en' | 'ar';

// ----------------------------------------------------------------------------
// Enums / unions
// ----------------------------------------------------------------------------

export type AssetType =
  | 'stock'
  | 'metal'
  | 'energy'
  | 'agriculture'
  | 'currency'
  | 'index'
  | 'crypto';

export type RecommendationType = 'buy' | 'hold' | 'watch' | 'sell';

export type TimeHorizon = 'short_term' | 'medium_term' | 'long_term';

export type RecommendationStatus =
  | 'active'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'closed';

export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';

export type AlertStatus = 'new' | 'reviewed' | 'dismissed' | 'expired';

export type DeliveryChannel = 'in_app' | 'email' | 'telegram' | 'whatsapp';

export type AgentStatus = 'active' | 'idle' | 'error';

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'severe';

export type FinancialHealth = 'strong' | 'improving' | 'risky' | 'weak';

export type ValuationRating = 'undervalued' | 'fair_value' | 'overvalued';

export type EconomyState =
  | 'expanding'
  | 'slowing'
  | 'recession_risk'
  | 'inflationary';

export type NoiseLevel = 'Alpha Early Signal' | 'Fairly Priced' | 'Late Hype';

export type NewsCategory =
  | 'economic'
  | 'political'
  | 'geopolitical'
  | 'technology'
  | 'energy'
  | 'central_banks'
  | 'commodities'
  | 'company';

// ----------------------------------------------------------------------------
// Agents
// ----------------------------------------------------------------------------

export type AgentId =
  | 'cio'
  | 'global_news'
  | 'geopolitical'
  | 'market_causality'
  | 'macro'
  | 'rates_bonds'
  | 'equity'
  | 'metals'
  | 'energy'
  | 'agriculture'
  | 'currency'
  | 'emerging_companies'
  | 'growth'
  | 'financial_analyst'
  | 'valuation'
  | 'smart_money'
  | 'risk'
  | 'recommendation'
  | 'committee'
  | 'urgent_alert';

export interface Agent {
  id: AgentId;
  name: Bilingual;
  role: Bilingual;
  status: AgentStatus;
  lastRun: string; // ISO timestamp
  confidence: number; // 0-100
  dataSources: string[];
  logs: AgentLogEntry[];
}

export interface AgentLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: Bilingual;
}

/** Generic output emitted by any specialized agent during the workflow. */
export interface AgentOutput {
  agentId: AgentId;
  agentName: Bilingual;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  weight: number; // contribution weight 0-1 toward consensus
  summary: Bilingual;
  evidence: Bilingual[];
  timestamp: string;
}

// ----------------------------------------------------------------------------
// News & events
// ----------------------------------------------------------------------------

export interface NewsEvent {
  id: string;
  headline: Bilingual;
  summary: Bilingual;
  category: NewsCategory;
  source: string;
  url?: string;
  publishedAt: string;
  importanceScore: number; // 0-100
  isMarketMoving: boolean;
  affectedAssets: AssetType[];
  analyzedBy: AgentId[];
}

export interface MarketEvent {
  id: string;
  title: Bilingual;
  description: Bilingual;
  category: NewsCategory;
  occurredAt: string;
  importanceScore: number; // 0-100
  surprise: boolean; // diverged from consensus / expectations
  affectedAssets: AssetType[];
  relatedNewsId?: string;
  causalityChainId?: string;
}

// ----------------------------------------------------------------------------
// Causality chains (Market Causality Agent)
// ----------------------------------------------------------------------------

export interface CausalityNode {
  label: Bilingual;
  direction: 'up' | 'down' | 'neutral';
}

export interface CausalityChain {
  id: string;
  eventId: string;
  cause: Bilingual;
  chain: CausalityNode[]; // ordered impact chain
  directImpact: Bilingual;
  secondOrderImpact: Bilingual;
  thirdOrderImpact: Bilingual;
  beneficiaries: string[];
  losers: string[];
  affectedAssets: AssetType[];
  timeHorizon: TimeHorizon;
  urgencyLevel: AlertPriority;
  tradeOpportunityProbability: number; // 0-100
}

// ----------------------------------------------------------------------------
// Companies
// ----------------------------------------------------------------------------

export interface CompanyFinancials {
  revenue: number;
  netIncome: number;
  grossMargin: number; // %
  operatingMargin: number; // %
  freeCashFlow: number;
  debt: number;
  cashPosition: number;
  cashBurn: number; // negative = burning
  health: FinancialHealth;
}

export interface CompanyGrowthMetrics {
  revenueGrowth: number; // % YoY
  customerGrowth: number; // %
  hiringGrowth: number; // %
  newContracts: number;
  partnerships: number;
  productAdoption: number; // index 0-100
  marketExpansion: number; // index 0-100
  growthScore: number; // 0-100 (set by Growth Agent)
}

export interface Valuation {
  pe: number | null;
  forwardPe: number | null;
  peg: number | null;
  evEbitda: number | null;
  priceToSales: number | null;
  dcfFairValue: number | null;
  rating: ValuationRating;
}

export interface SmartMoneyActivity {
  institutionalOwnership: number; // %
  hedgeFundActivity: 'accumulating' | 'reducing' | 'neutral';
  insiderBuying: number; // count / $ proxy
  insiderSelling: number;
  thirteenFChange: number; // net % change in 13F holders
  unusualVolume: boolean;
  netFlow: 'entering' | 'exiting' | 'neutral';
}

export interface Company {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  assetType: AssetType;
  marketCap: number; // USD
  price: number;
  mediaMentionsCount: number;
  noiseLevel: NoiseLevel;
  earlyOpportunityScore: number; // 0-100
  urgencyScore: number; // 0-100
  financials: CompanyFinancials;
  growth: CompanyGrowthMetrics;
  valuation: Valuation;
  smartMoney: SmartMoneyActivity;
  bullCase: Bilingual;
  bearCase: Bilingual;
  neutralCase: Bilingual;
  finalScore: number; // 0-100
}

// ----------------------------------------------------------------------------
// Risk
// ----------------------------------------------------------------------------

export interface RiskComponent {
  type:
    | 'market'
    | 'company'
    | 'valuation'
    | 'liquidity'
    | 'geopolitical'
    | 'earnings'
    | 'interest_rate'
    | 'inflation'
    | 'recession'
    | 'sector';
  label: Bilingual;
  score: number; // 0-100
  level: RiskLevel;
  note: Bilingual;
}

export interface RiskAssessment {
  id: string;
  subject: Bilingual; // what this risk profile is about (asset / market / company)
  overallScore: number; // 0-100
  level: RiskLevel;
  components: RiskComponent[];
  positionSizeSuggestion: string; // e.g. "1-2% of portfolio"
  stopLoss: number | null;
  maxDrawdownScenario: Bilingual;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Recommendations
// ----------------------------------------------------------------------------

export interface Recommendation {
  id: string;
  assetId: string;
  ticker: string;
  assetType: AssetType;
  recommendationType: RecommendationType;
  timeHorizon: TimeHorizon;
  confidenceScore: number; // 0-100
  riskScore: number; // 0-100
  urgencyScore: number; // 0-100
  entryZone: [number, number] | null;
  targetZone: [number, number] | null;
  stopLoss: number | null;
  thesis: Bilingual;
  reason: Bilingual;
  catalyst: Bilingual;
  invalidationConditions: Bilingual;
  relatedNewsId: string | null;
  causalityChainId: string | null;
  supportingAgents: AgentId[];
  agentOutputs: AgentOutput[];
  status: RecommendationStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Urgent alerts
// ----------------------------------------------------------------------------

export interface UrgentAlert {
  id: string;
  recommendationId: string | null;
  ticker: string;
  assetType: AssetType;
  alertTitle: Bilingual;
  priority: AlertPriority;
  urgencyScore: number; // 0-100
  confidenceScore: number; // 0-100
  riskScore: number; // 0-100
  expectedMove: Bilingual; // e.g. "+8% to +15% in 2-5 days"
  timeWindow: string; // e.g. "2-5 trading days"
  reason: Bilingual; // why this is urgent
  relatedNewsId: string | null;
  impactChainId: string | null;
  entryZone: [number, number] | null;
  targetZone: [number, number] | null;
  stopLoss: number | null;
  alternativeScenario: Bilingual;
  invalidationConditions: Bilingual;
  supportingAgents: AgentId[];
  deliveryChannels: DeliveryChannel[];
  status: AlertStatus;
  createdAt: string;
  expiresAt: string | null;
}

// ----------------------------------------------------------------------------
// In-app notifications / alerts feed
// ----------------------------------------------------------------------------

export type NotificationType =
  | 'buy_signal'
  | 'critical_opportunity'
  | 'risk_increased'
  | 'news_impact'
  | 'price_move'
  | 'early_signal'
  | 'stop_loss'
  | 'recommendation_expired';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: Bilingual;
  body: Bilingual;
  priority: AlertPriority;
  read: boolean;
  createdAt: string;
  link?: string;
}

// ----------------------------------------------------------------------------
// Macro / markets
// ----------------------------------------------------------------------------

export interface MacroIndicator {
  key: 'cpi' | 'ppi' | 'pce' | 'gdp' | 'unemployment' | 'jobs' | 'retail_sales';
  label: Bilingual;
  value: number;
  previous: number;
  consensus: number;
  surprise: boolean;
  trend: 'up' | 'down' | 'flat';
}

export interface MacroSnapshot {
  state: EconomyState;
  summary: Bilingual;
  indicators: MacroIndicator[];
}

export interface AssetClassSummary {
  assetType: AssetType;
  name: Bilingual;
  trend: 'bullish' | 'bearish' | 'neutral';
  keyDrivers: Bilingual[];
  relatedNewsIds: string[];
  recommendation: RecommendationType;
  riskLevel: RiskLevel;
  instruments: { name: string; symbol: string; change: number; price: number }[];
}

export interface MarketIndexQuote {
  name: string;
  symbol: string;
  value: number;
  change: number; // % change
  spark: number[]; // mini history
}

export interface SentimentReading {
  aiConfidenceIndex: number; // 0-100 aggregate agent confidence
  marketSentiment: number; // 0-100 (0 extreme fear, 100 extreme greed)
  sentimentLabel: Bilingual;
}

// ----------------------------------------------------------------------------
// Engine input shape (used by mockAgentEngine)
// ----------------------------------------------------------------------------

export interface OpportunitySignal {
  ticker: string;
  assetType: AssetType;
  /** Strength of breaking news 0-100. */
  newsImpact: number;
  /** Abnormal trading volume 0-100. */
  abnormalVolume: number;
  /** Expected short-term price move probability 0-100. */
  priceMoveProbability: number;
  /** Catalyst strength 0-100. */
  catalystStrength: number;
  /** Time sensitivity 0-100 (higher = more urgent window). */
  timeSensitivity: number;
  /** Smart money flow 0-100 (institutional/insider accumulation). */
  smartMoneyActivity: number;
  /** Individual agent outputs feeding consensus. */
  agentOutputs: AgentOutput[];
  /** Whether a clear, explainable catalyst exists. */
  hasClearCatalyst: boolean;
  /** Whether an invalidation condition is defined. */
  hasInvalidation: boolean;
  /** Underlying company risk inputs (optional). */
  baseRisk?: number;
}
