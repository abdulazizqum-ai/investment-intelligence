// =============================================================================
// mockAgentEngine.ts
// First-version simulated AI agent logic for the MVP. This is a deterministic
// rule engine that runs BEFORE any real AI / market / news APIs are connected.
//
// It centralizes:
//   - Confidence Score calculation
//   - Risk Score calculation
//   - Urgency Score calculation
//   - Noise Level calculation (emerging companies)
//   - Agent consensus calculation
//   - Recommendation generation
//   - Urgent alert generation
//
// Every formula is intentionally simple, transparent and clamped so the output
// is explainable to the user. Replace the internals with real model calls later
// while keeping these function signatures stable.
// =============================================================================

import type {
  AgentId,
  AgentOutput,
  AlertPriority,
  Bilingual,
  CompanyGrowthMetrics,
  NoiseLevel,
  OpportunitySignal,
  Recommendation,
  RecommendationType,
  RiskAssessment,
  RiskLevel,
  TimeHorizon,
  UrgentAlert,
} from '@/types';

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const round = (n: number) => Math.round(n);

// ---------------------------------------------------------------------------
// Thresholds — single source of truth for the urgent-alert gate.
// ---------------------------------------------------------------------------
export const URGENT_ALERT_RULES = {
  minUrgency: 80,
  minConfidence: 75,
  maxRisk: 65,
  minSupportingAgents: 3,
  requiresClearCatalyst: true,
  requiresInvalidation: true,
} as const;

// ---------------------------------------------------------------------------
// Agent consensus
// Returns a 0-100 consensus score, the net directional bias, and the count of
// agents that actively support a bullish opportunity.
// ---------------------------------------------------------------------------
export interface ConsensusResult {
  score: number; // 0-100 weighted agreement
  bias: 'bullish' | 'bearish' | 'neutral';
  supportingCount: number; // agents that are bullish with confidence >= 60
  supportingAgents: AgentId[];
}

export function calcAgentConsensus(outputs: AgentOutput[]): ConsensusResult {
  if (outputs.length === 0) {
    return { score: 0, bias: 'neutral', supportingCount: 0, supportingAgents: [] };
  }

  let weightedSignal = 0;
  let weightSum = 0;
  const supportingAgents: AgentId[] = [];

  for (const o of outputs) {
    const dir = o.signal === 'bullish' ? 1 : o.signal === 'bearish' ? -1 : 0;
    const w = o.weight * (o.confidence / 100);
    weightedSignal += dir * w;
    weightSum += o.weight;
    if (o.signal === 'bullish' && o.confidence >= 60) {
      supportingAgents.push(o.agentId);
    }
  }

  const normalized = weightSum > 0 ? weightedSignal / weightSum : 0; // -1..1
  const score = clamp(round(50 + normalized * 50)); // 0..100 (50 = neutral)
  const bias = normalized > 0.15 ? 'bullish' : normalized < -0.15 ? 'bearish' : 'neutral';

  return { score, bias, supportingCount: supportingAgents.length, supportingAgents };
}

// ---------------------------------------------------------------------------
// Confidence Score
// Blends average agent confidence with the strength of consensus agreement.
// ---------------------------------------------------------------------------
export function calcConfidenceScore(
  outputs: AgentOutput[],
  consensus: ConsensusResult,
): number {
  if (outputs.length === 0) return 0;
  const avg = outputs.reduce((s, o) => s + o.confidence, 0) / outputs.length;
  // Distance of consensus from neutral (50) rewards agreement.
  const agreement = Math.abs(consensus.score - 50) * 2; // 0..100
  const score = avg * 0.65 + agreement * 0.35;
  return clamp(round(score));
}

// ---------------------------------------------------------------------------
// Risk Score (0-100, higher = riskier)
// Combines base/company risk, volume abnormality (instability) and an
// inverse-confidence component. A clear catalyst slightly reduces perceived risk.
// ---------------------------------------------------------------------------
export function calcRiskScore(
  signal: OpportunitySignal,
  confidence: number,
): number {
  const base = signal.baseRisk ?? 50;
  const volatility = signal.abnormalVolume * 0.25; // unusual volume adds risk
  const uncertainty = (100 - confidence) * 0.35;
  const catalystRelief = signal.hasClearCatalyst ? -8 : 6;
  const smartMoneyRelief = signal.smartMoneyActivity >= 60 ? -6 : 0;
  const score = base * 0.5 + volatility + uncertainty + catalystRelief + smartMoneyRelief;
  return clamp(round(score));
}

// ---------------------------------------------------------------------------
// Urgency Score (0-100, capped at 100)
// Example formula from spec:
//   Urgency = confidence weight + abnormal volume weight + news impact weight
//             + agent consensus multiplier (+ catalyst / time-sensitivity / flow)
// ---------------------------------------------------------------------------
export function calcUrgencyScore(
  signal: OpportunitySignal,
  confidence: number,
  consensus: ConsensusResult,
): number {
  const confidenceWeight = confidence * 0.22;
  const volumeWeight = signal.abnormalVolume * 0.16;
  const newsWeight = signal.newsImpact * 0.2;
  const consensusMultiplier = consensus.score * 0.16;
  const catalystWeight = signal.catalystStrength * 0.12;
  const timeWeight = signal.timeSensitivity * 0.09;
  const moveWeight = signal.priceMoveProbability * 0.05;

  const raw =
    confidenceWeight +
    volumeWeight +
    newsWeight +
    consensusMultiplier +
    catalystWeight +
    timeWeight +
    moveWeight;

  return clamp(round(raw)); // never exceeds 100
}

// ---------------------------------------------------------------------------
// Noise Level (emerging companies)
// ---------------------------------------------------------------------------
export function calcNoiseLevel(
  growthScore: number,
  mediaMentionsCount: number,
): NoiseLevel {
  if (growthScore >= 80 && mediaMentionsCount < 15) return 'Alpha Early Signal';
  if (growthScore < 50 && mediaMentionsCount > 70) return 'Late Hype';
  return 'Fairly Priced';
}

/** Early-opportunity score rewards strong growth with low media attention. */
export function calcEarlyOpportunityScore(
  growth: CompanyGrowthMetrics,
  mediaMentionsCount: number,
  smartMoney: number,
): number {
  const quietBonus = clamp(100 - mediaMentionsCount * 1.1); // less noise = more bonus
  const score =
    growth.growthScore * 0.5 + quietBonus * 0.3 + smartMoney * 0.2;
  return clamp(round(score));
}

// ---------------------------------------------------------------------------
// Risk level mapping
// ---------------------------------------------------------------------------
export function riskLevelFromScore(score: number): RiskLevel {
  if (score < 25) return 'low';
  if (score < 45) return 'moderate';
  if (score < 65) return 'elevated';
  if (score < 82) return 'high';
  return 'severe';
}

// ---------------------------------------------------------------------------
// Alert priority mapping (only Critical when the full high-conviction gate
// is satisfied AND more than one agent confirms — per the spec rules).
// ---------------------------------------------------------------------------
export function deriveAlertPriority(
  urgency: number,
  confidence: number,
  risk: number,
  supportingCount: number,
  hasClearCatalyst: boolean,
  shortWindow: boolean,
): AlertPriority {
  const gatePass =
    urgency >= URGENT_ALERT_RULES.minUrgency &&
    confidence >= URGENT_ALERT_RULES.minConfidence &&
    risk <= URGENT_ALERT_RULES.maxRisk &&
    supportingCount >= URGENT_ALERT_RULES.minSupportingAgents &&
    hasClearCatalyst;

  if (gatePass && shortWindow && supportingCount > 1) return 'critical';
  if (urgency >= 70 && confidence >= 65) return 'high';
  if (urgency >= 55) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Recommendation type decision.
// If data is insufficient (low confidence / weak consensus), DO NOT issue Buy —
// downgrade to Watch (per spec).
// ---------------------------------------------------------------------------
export function decideRecommendationType(
  consensus: ConsensusResult,
  confidence: number,
  risk: number,
): RecommendationType {
  const dataSufficient = consensus.supportingCount >= 3 && confidence >= 60;

  if (consensus.bias === 'bullish') {
    if (!dataSufficient) return 'watch';
    if (risk > URGENT_ALERT_RULES.maxRisk) return 'watch';
    return 'buy';
  }
  if (consensus.bias === 'bearish') {
    return risk >= 70 ? 'sell' : 'hold';
  }
  return 'watch';
}

// ---------------------------------------------------------------------------
// Whole-pipeline scoring result.
// ---------------------------------------------------------------------------
export interface EngineScores {
  confidenceScore: number;
  riskScore: number;
  urgencyScore: number;
  consensus: ConsensusResult;
  recommendationType: RecommendationType;
  qualifiesForUrgentAlert: boolean;
  priority: AlertPriority;
}

export function runEngine(
  signal: OpportunitySignal,
  shortWindow = true,
): EngineScores {
  const consensus = calcAgentConsensus(signal.agentOutputs);
  const confidenceScore = calcConfidenceScore(signal.agentOutputs, consensus);
  const riskScore = calcRiskScore(signal, confidenceScore);
  const urgencyScore = calcUrgencyScore(signal, confidenceScore, consensus);
  const recommendationType = decideRecommendationType(
    consensus,
    confidenceScore,
    riskScore,
  );

  const qualifiesForUrgentAlert =
    urgencyScore >= URGENT_ALERT_RULES.minUrgency &&
    confidenceScore >= URGENT_ALERT_RULES.minConfidence &&
    riskScore <= URGENT_ALERT_RULES.maxRisk &&
    consensus.supportingCount >= URGENT_ALERT_RULES.minSupportingAgents &&
    signal.hasClearCatalyst &&
    signal.hasInvalidation &&
    shortWindow;

  const priority = deriveAlertPriority(
    urgencyScore,
    confidenceScore,
    riskScore,
    consensus.supportingCount,
    signal.hasClearCatalyst,
    shortWindow,
  );

  return {
    confidenceScore,
    riskScore,
    urgencyScore,
    consensus,
    recommendationType,
    qualifiesForUrgentAlert,
    priority,
  };
}

// ---------------------------------------------------------------------------
// Recommendation generation.
// Guarantees every recommendation carries: reason, risk, confidence, urgency,
// time horizon, catalyst/news, supporting agents, invalidation condition.
// ---------------------------------------------------------------------------
export interface GenerateRecommendationInput {
  id: string;
  assetId: string;
  signal: OpportunitySignal;
  timeHorizon: TimeHorizon;
  thesis: Bilingual;
  reason: Bilingual;
  catalyst: Bilingual;
  invalidationConditions: Bilingual;
  relatedNewsId?: string | null;
  causalityChainId?: string | null;
  entryZone?: [number, number] | null;
  targetZone?: [number, number] | null;
  stopLoss?: number | null;
  expiresAt?: string | null;
}

export function generateRecommendation(
  input: GenerateRecommendationInput,
): Recommendation {
  const scores = runEngine(
    input.signal,
    input.timeHorizon !== 'long_term',
  );
  const now = new Date().toISOString();

  // Enforce: no Buy without an invalidation condition + catalyst.
  let recType = scores.recommendationType;
  if (recType === 'buy' && (!input.signal.hasInvalidation || !input.signal.hasClearCatalyst)) {
    recType = 'watch';
  }

  return {
    id: input.id,
    assetId: input.assetId,
    ticker: input.signal.ticker,
    assetType: input.signal.assetType,
    recommendationType: recType,
    timeHorizon: input.timeHorizon,
    confidenceScore: scores.confidenceScore,
    riskScore: scores.riskScore,
    urgencyScore: scores.urgencyScore,
    entryZone: input.entryZone ?? null,
    targetZone: input.targetZone ?? null,
    stopLoss: input.stopLoss ?? null,
    thesis: input.thesis,
    reason: input.reason,
    catalyst: input.catalyst,
    invalidationConditions: input.invalidationConditions,
    relatedNewsId: input.relatedNewsId ?? null,
    causalityChainId: input.causalityChainId ?? null,
    supportingAgents: scores.consensus.supportingAgents,
    agentOutputs: input.signal.agentOutputs,
    status: recType === 'buy' || recType === 'sell' ? 'approved' : 'active',
    expiresAt: input.expiresAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Urgent alert generation. Returns null when the high-conviction gate fails.
// ---------------------------------------------------------------------------
export interface GenerateUrgentAlertInput {
  id: string;
  recommendation: Recommendation;
  signal: OpportunitySignal;
  alertTitle: Bilingual;
  expectedMove: Bilingual;
  timeWindow: string;
  reason: Bilingual;
  alternativeScenario: Bilingual;
  relatedNewsId?: string | null;
  impactChainId?: string | null;
  deliveryChannels?: UrgentAlert['deliveryChannels'];
  expiresAt?: string | null;
}

export function generateUrgentAlert(
  input: GenerateUrgentAlertInput,
): UrgentAlert | null {
  const r = input.recommendation;
  const consensus = calcAgentConsensus(input.signal.agentOutputs);

  const passes =
    r.urgencyScore >= URGENT_ALERT_RULES.minUrgency &&
    r.confidenceScore >= URGENT_ALERT_RULES.minConfidence &&
    r.riskScore <= URGENT_ALERT_RULES.maxRisk &&
    consensus.supportingCount >= URGENT_ALERT_RULES.minSupportingAgents &&
    input.signal.hasClearCatalyst &&
    input.signal.hasInvalidation &&
    r.timeHorizon !== 'long_term';

  if (!passes) return null;

  const priority = deriveAlertPriority(
    r.urgencyScore,
    r.confidenceScore,
    r.riskScore,
    consensus.supportingCount,
    input.signal.hasClearCatalyst,
    r.timeHorizon !== 'long_term',
  );

  return {
    id: input.id,
    recommendationId: r.id,
    ticker: r.ticker,
    assetType: r.assetType,
    alertTitle: input.alertTitle,
    priority,
    urgencyScore: r.urgencyScore,
    confidenceScore: r.confidenceScore,
    riskScore: r.riskScore,
    expectedMove: input.expectedMove,
    timeWindow: input.timeWindow,
    reason: input.reason,
    relatedNewsId: input.relatedNewsId ?? r.relatedNewsId,
    impactChainId: input.impactChainId ?? r.causalityChainId,
    entryZone: r.entryZone,
    targetZone: r.targetZone,
    stopLoss: r.stopLoss,
    alternativeScenario: input.alternativeScenario,
    invalidationConditions: r.invalidationConditions,
    supportingAgents: r.supportingAgents,
    deliveryChannels: input.deliveryChannels ?? ['in_app', 'email'],
    status: 'new',
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt ?? r.expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Risk assessment builder (Risk Management Agent).
// ---------------------------------------------------------------------------
export function buildRiskAssessment(
  id: string,
  subject: Bilingual,
  components: RiskAssessment['components'],
  stopLoss: number | null,
  positionSizeSuggestion: string,
  maxDrawdownScenario: Bilingual,
): RiskAssessment {
  const overallScore =
    components.length > 0
      ? round(components.reduce((s, c) => s + c.score, 0) / components.length)
      : 0;
  return {
    id,
    subject,
    overallScore,
    level: riskLevelFromScore(overallScore),
    components,
    positionSizeSuggestion,
    stopLoss,
    maxDrawdownScenario,
    updatedAt: new Date().toISOString(),
  };
}
