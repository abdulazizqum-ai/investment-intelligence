// =============================================================================
// mockData.ts
// Simulated dataset that demonstrates the full system using the mock agent
// engine. Required demonstration scenarios:
//   1. One urgent CRITICAL opportunity            -> NVDA-style AI catalyst
//   2. One WATCHLIST opportunity                  -> insufficient conviction
//   3. One high-growth LOW-NOISE emerging company -> "Alpha Early Signal"
//   4. One HIGH-RISK rejected recommendation      -> rejected by CIO
//   5. One GEOPOLITICAL event across asset classes-> causality chain
// =============================================================================

import {
  generateRecommendation,
  generateUrgentAlert,
  calcNoiseLevel,
  calcEarlyOpportunityScore,
  buildRiskAssessment,
} from '@/lib/mockAgentEngine';
import type {
  Agent,
  AgentOutput,
  AppNotification,
  AssetClassSummary,
  Bilingual,
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

const iso = (offsetMinutes: number) =>
  new Date(Date.now() + offsetMinutes * 60_000).toISOString();

const ao = (
  agentId: AgentOutput['agentId'],
  agentName: Bilingual,
  signal: AgentOutput['signal'],
  confidence: number,
  weight: number,
  summary: Bilingual,
  evidence: Bilingual[],
): AgentOutput => ({
  agentId,
  agentName,
  signal,
  confidence,
  weight,
  summary,
  evidence,
  timestamp: iso(-20),
});

// ---------------------------------------------------------------------------
// NEWS EVENTS
// ---------------------------------------------------------------------------
export const newsEvents: NewsEvent[] = [
  {
    id: 'news-ai-contract',
    headline: {
      en: 'Hyperscaler signs multi-year AI compute contract reportedly worth $11B',
      ar: 'شركة سحابية كبرى توقّع عقد حوسبة ذكاء اصطناعي متعدد السنوات بقيمة 11 مليار دولار',
    },
    summary: {
      en: 'A top cloud provider locked in a multi-year GPU and accelerator supply deal, signalling sustained AI capex into 2026.',
      ar: 'أبرم أحد كبار مزودي الخدمات السحابية صفقة توريد وحدات معالجة رسومية ومسرّعات لعدة سنوات، ما يشير إلى استمرار الإنفاق الرأسمالي على الذكاء الاصطناعي حتى 2026.',
    },
    category: 'technology',
    source: 'Reuters',
    publishedAt: iso(-35),
    importanceScore: 92,
    isMarketMoving: true,
    affectedAssets: ['stock', 'index'],
    analyzedBy: ['global_news', 'equity', 'growth', 'smart_money', 'urgent_alert'],
  },
  {
    id: 'news-strait-tension',
    headline: {
      en: 'Naval incident raises shipping risk near a key oil chokepoint',
      ar: 'حادث بحري يرفع مخاطر الشحن قرب ممر نفطي رئيسي',
    },
    summary: {
      en: 'Escalation near a strategic strait threatens roughly a fifth of seaborne crude flows, lifting oil, gold and defense names.',
      ar: 'تصعيد قرب مضيق استراتيجي يهدد نحو خُمس تدفقات النفط المنقول بحراً، ما يدعم النفط والذهب وأسهم الدفاع.',
    },
    category: 'geopolitical',
    source: 'Bloomberg',
    publishedAt: iso(-90),
    importanceScore: 88,
    isMarketMoving: true,
    affectedAssets: ['energy', 'metal', 'currency', 'stock', 'agriculture'],
    analyzedBy: ['global_news', 'geopolitical', 'market_causality', 'energy', 'metals', 'currency'],
  },
  {
    id: 'news-cpi-hot',
    headline: {
      en: 'US CPI comes in hotter than expected at 3.6% YoY',
      ar: 'مؤشر أسعار المستهلك الأمريكي يأتي أعلى من المتوقع عند 3.6% سنوياً',
    },
    summary: {
      en: 'Core inflation surprised to the upside, pushing back rate-cut expectations and lifting yields and the dollar.',
      ar: 'فاجأ التضخم الأساسي بالارتفاع، ما أجّل توقعات خفض الفائدة ورفع العوائد والدولار.',
    },
    category: 'economic',
    source: 'BLS / WSJ',
    publishedAt: iso(-1440),
    importanceScore: 84,
    isMarketMoving: true,
    affectedAssets: ['index', 'metal', 'currency', 'stock'],
    analyzedBy: ['global_news', 'macro', 'rates_bonds', 'metals', 'currency', 'equity'],
  },
  {
    id: 'news-quantum-grant',
    headline: {
      en: 'Quantum sensing startup wins national lab partnership',
      ar: 'شركة ناشئة في الاستشعار الكمّي تفوز بشراكة مع مختبر وطني',
    },
    summary: {
      en: 'A little-followed quantum company secured a government research partnership, a potential early revenue catalyst.',
      ar: 'حصلت شركة كمّية قليلة المتابعة على شراكة بحثية حكومية، ما قد يشكّل محفزاً مبكراً للإيرادات.',
    },
    category: 'technology',
    source: 'TechCrunch',
    publishedAt: iso(-300),
    importanceScore: 61,
    isMarketMoving: false,
    affectedAssets: ['stock'],
    analyzedBy: ['emerging_companies', 'growth', 'smart_money'],
  },
  {
    id: 'news-biotech-trial',
    headline: {
      en: 'Micro-cap biotech reports mixed Phase 2 trial data',
      ar: 'شركة تقنية حيوية صغيرة جداً تعلن نتائج مختلطة للمرحلة الثانية من التجارب',
    },
    summary: {
      en: 'Ambiguous endpoints and a thin cash runway raise binary risk into the next readout.',
      ar: 'نقاط نهاية غامضة وسيولة نقدية محدودة ترفع المخاطر الثنائية قبل النتائج القادمة.',
    },
    category: 'company',
    source: 'BioPharma Dive',
    publishedAt: iso(-600),
    importanceScore: 47,
    isMarketMoving: false,
    affectedAssets: ['stock'],
    analyzedBy: ['financial_analyst', 'risk', 'valuation'],
  },
];

// ---------------------------------------------------------------------------
// MARKET EVENTS + CAUSALITY (Scenario 5: geopolitical across asset classes)
// ---------------------------------------------------------------------------
export const marketEvents: MarketEvent[] = [
  {
    id: 'evt-strait',
    title: {
      en: 'Shipping disruption risk at key oil chokepoint',
      ar: 'خطر تعطّل الشحن في ممر نفطي رئيسي',
    },
    description: {
      en: 'A naval incident escalates geopolitical risk around a strait that carries a large share of global crude.',
      ar: 'حادث بحري يصعّد المخاطر الجيوسياسية حول مضيق يمر عبره جزء كبير من النفط العالمي.',
    },
    category: 'geopolitical',
    occurredAt: iso(-90),
    importanceScore: 88,
    surprise: true,
    affectedAssets: ['energy', 'metal', 'currency', 'stock', 'agriculture'],
    relatedNewsId: 'news-strait-tension',
    causalityChainId: 'chain-strait',
  },
  {
    id: 'evt-cpi',
    title: {
      en: 'US inflation surprises to the upside',
      ar: 'التضخم الأمريكي يفاجئ بالصعود',
    },
    description: {
      en: 'Hotter CPI shifts the rates path more hawkish.',
      ar: 'بيانات تضخم أعلى تدفع مسار الفائدة نحو التشدد.',
    },
    category: 'economic',
    occurredAt: iso(-1440),
    importanceScore: 84,
    surprise: true,
    affectedAssets: ['index', 'metal', 'currency', 'stock'],
    relatedNewsId: 'news-cpi-hot',
    causalityChainId: 'chain-cpi',
  },
];

export const causalityChains: CausalityChain[] = [
  {
    id: 'chain-strait',
    eventId: 'evt-strait',
    cause: {
      en: 'Geopolitical escalation threatens seaborne crude transit through a strategic strait.',
      ar: 'تصعيد جيوسياسي يهدد عبور النفط بحراً عبر مضيق استراتيجي.',
    },
    chain: [
      { label: { en: 'Geopolitical shock', ar: 'صدمة جيوسياسية' }, direction: 'up' },
      { label: { en: 'Oil supply risk', ar: 'مخاطر إمداد النفط' }, direction: 'up' },
      { label: { en: 'Crude prices', ar: 'أسعار النفط' }, direction: 'up' },
      { label: { en: 'Headline inflation pressure', ar: 'ضغط التضخم العام' }, direction: 'up' },
      { label: { en: 'Safe-haven demand (Gold)', ar: 'الطلب على الملاذ الآمن (الذهب)' }, direction: 'up' },
      { label: { en: 'Defense & energy equities', ar: 'أسهم الدفاع والطاقة' }, direction: 'up' },
      { label: { en: 'Airlines & transport', ar: 'الطيران والنقل' }, direction: 'down' },
    ],
    directImpact: {
      en: 'Crude and natural gas spike on supply-disruption fears; risk premium repriced.',
      ar: 'ارتفاع حاد في النفط والغاز بفعل مخاوف تعطّل الإمداد وإعادة تسعير علاوة المخاطر.',
    },
    secondOrderImpact: {
      en: 'Higher energy costs feed inflation expectations and support gold; the dollar firms on safe-haven flows.',
      ar: 'ارتفاع تكاليف الطاقة يغذّي توقعات التضخم ويدعم الذهب، ويتقوى الدولار بفعل تدفقات الملاذ الآمن.',
    },
    thirdOrderImpact: {
      en: 'Energy-importing economies face margin pressure; transport-heavy sectors and growth equities lag.',
      ar: 'الاقتصادات المستوردة للطاقة تواجه ضغطاً على الهوامش، وتتأخر قطاعات النقل وأسهم النمو.',
    },
    beneficiaries: ['Energy producers', 'Defense contractors', 'Gold miners', 'Tankers'],
    losers: ['Airlines', 'Logistics', 'Energy-intensive manufacturing'],
    affectedAssets: ['energy', 'metal', 'currency', 'stock', 'agriculture'],
    timeHorizon: 'short_term',
    urgencyLevel: 'high',
    tradeOpportunityProbability: 72,
  },
  {
    id: 'chain-cpi',
    eventId: 'evt-cpi',
    cause: {
      en: 'US inflation came in higher than expected.',
      ar: 'جاء التضخم الأمريكي أعلى من المتوقع.',
    },
    chain: [
      { label: { en: 'Inflation', ar: 'التضخم' }, direction: 'up' },
      { label: { en: 'Fed hawkish', ar: 'تشدد الفيدرالي' }, direction: 'up' },
      { label: { en: 'Bond yields', ar: 'عوائد السندات' }, direction: 'up' },
      { label: { en: 'US Dollar', ar: 'الدولار الأمريكي' }, direction: 'up' },
      { label: { en: 'Gold pressure', ar: 'ضغط على الذهب' }, direction: 'down' },
      { label: { en: 'NASDAQ pressure', ar: 'ضغط على ناسداك' }, direction: 'down' },
      { label: { en: 'Growth stocks', ar: 'أسهم النمو' }, direction: 'down' },
    ],
    directImpact: {
      en: 'Rate-cut bets unwind; 2Y and 10Y yields jump.',
      ar: 'تتراجع رهانات خفض الفائدة وترتفع عوائد السندات لأجل سنتين و10 سنوات.',
    },
    secondOrderImpact: {
      en: 'Stronger dollar weighs on gold and commodities priced in USD.',
      ar: 'دولار أقوى يضغط على الذهب والسلع المسعّرة بالدولار.',
    },
    thirdOrderImpact: {
      en: 'Long-duration growth and tech multiples compress.',
      ar: 'تنكمش مضاعفات أسهم النمو والتقنية طويلة الأمد.',
    },
    beneficiaries: ['US Dollar', 'Banks (NIM)', 'Value sectors'],
    losers: ['Growth/Tech', 'Gold', 'Long-duration bonds'],
    affectedAssets: ['index', 'metal', 'currency', 'stock'],
    timeHorizon: 'short_term',
    urgencyLevel: 'medium',
    tradeOpportunityProbability: 58,
  },
];

// ---------------------------------------------------------------------------
// AGENT-NAME helpers (bilingual) for reuse
// ---------------------------------------------------------------------------
const N = {
  equity: { en: 'Equity Markets Agent', ar: 'وكيل أسواق الأسهم' },
  growth: { en: 'Growth Intelligence Agent', ar: 'وكيل ذكاء النمو' },
  smart_money: { en: 'Smart Money Agent', ar: 'وكيل الأموال الذكية' },
  news: { en: 'Global News Agent', ar: 'وكيل الأخبار العالمية' },
  valuation: { en: 'Valuation Agent', ar: 'وكيل التقييم' },
  risk: { en: 'Risk Management Agent', ar: 'وكيل إدارة المخاطر' },
  energy: { en: 'Energy Intelligence Agent', ar: 'وكيل ذكاء الطاقة' },
  metals: { en: 'Metals Intelligence Agent', ar: 'وكيل ذكاء المعادن' },
  geo: { en: 'Geopolitical Agent', ar: 'الوكيل الجيوسياسي' },
  financial: { en: 'Financial Analyst Agent', ar: 'وكيل التحليل المالي' },
} as const;

// ---------------------------------------------------------------------------
// SCENARIO 1: Urgent CRITICAL opportunity (AI semiconductor catalyst)
// ---------------------------------------------------------------------------
const nvdaSignal = {
  ticker: 'NVDA',
  assetType: 'stock' as const,
  newsImpact: 92,
  abnormalVolume: 88,
  priceMoveProbability: 84,
  catalystStrength: 90,
  timeSensitivity: 86,
  smartMoneyActivity: 82,
  hasClearCatalyst: true,
  hasInvalidation: true,
  baseRisk: 48,
  agentOutputs: [
    ao('equity', N.equity, 'bullish', 86, 0.9, {
      en: 'AI compute demand re-accelerating; sector breadth confirms leadership.',
      ar: 'تسارع الطلب على حوسبة الذكاء الاصطناعي، واتساع القطاع يؤكد الريادة.',
    }, [
      { en: '$11B multi-year accelerator contract reported.', ar: 'الإبلاغ عن عقد مسرّعات متعدد السنوات بقيمة 11 مليار دولار.' },
    ]),
    ao('growth', N.growth, 'bullish', 88, 0.85, {
      en: 'Data-center revenue growth trajectory intact with expanding backlog.',
      ar: 'مسار نمو إيرادات مراكز البيانات سليم مع تزايد الطلبات المتراكمة.',
    }, [{ en: 'Backlog and bookings rising double digits.', ar: 'الطلبات والحجوزات ترتفع بنسب مزدوجة.' }]),
    ao('smart_money', N.smart_money, 'bullish', 80, 0.8, {
      en: 'Unusual call volume and institutional accumulation detected.',
      ar: 'رصد حجم خيارات شراء غير اعتيادي وتجميع مؤسسي.',
    }, [{ en: 'Block trades + rising 13F holders.', ar: 'صفقات كبيرة وزيادة في حائزي 13F.' }]),
    ao('global_news', N.news, 'bullish', 90, 0.75, {
      en: 'High-importance, market-moving catalyst confirmed by multiple outlets.',
      ar: 'محفز عالي الأهمية ومحرّك للسوق أكدته عدة مصادر.',
    }, [{ en: 'Reuters + Bloomberg corroboration.', ar: 'تأكيد من رويترز وبلومبرغ.' }]),
    ao('valuation', N.valuation, 'neutral', 64, 0.5, {
      en: 'Valuation rich but justified if AI capex sustains.',
      ar: 'التقييم مرتفع لكنه مبرر إذا استمر الإنفاق الرأسمالي على الذكاء الاصطناعي.',
    }, [{ en: 'Forward P/E elevated vs history.', ar: 'مضاعف الربحية المستقبلي مرتفع تاريخياً.' }]),
  ],
};

export const nvdaRecommendation: Recommendation = generateRecommendation({
  id: 'rec-nvda',
  assetId: 'asset-nvda',
  signal: nvdaSignal,
  timeHorizon: 'short_term',
  thesis: {
    en: 'AI accelerator demand is re-accelerating into a confirmed multi-year hyperscaler contract, with smart-money accumulation and broad agent agreement supporting a high-conviction short-term move.',
    ar: 'يتسارع الطلب على مسرّعات الذكاء الاصطناعي مع تأكيد عقد متعدد السنوات لشركة سحابية كبرى، إضافة إلى تجميع الأموال الذكية وتوافق الوكلاء، ما يدعم تحركاً قصير الأجل عالي القناعة.',
  },
  reason: {
    en: 'Strong, corroborated catalyst + abnormal volume + institutional accumulation + multi-agent bullish consensus.',
    ar: 'محفز قوي ومؤكد + حجم تداول غير اعتيادي + تجميع مؤسسي + توافق صعودي متعدد الوكلاء.',
  },
  catalyst: {
    en: 'Reported $11B multi-year AI compute supply contract with a top hyperscaler.',
    ar: 'الإبلاغ عن عقد توريد حوسبة ذكاء اصطناعي متعدد السنوات بقيمة 11 مليار دولار مع شركة سحابية كبرى.',
  },
  invalidationConditions: {
    en: 'Close below the entry zone on rising volume, contract denial/walk-back, or a broad risk-off shock in megacap tech.',
    ar: 'الإغلاق دون منطقة الدخول مع ارتفاع الحجم، أو نفي/تراجع العقد، أو صدمة نفور من المخاطرة في أسهم التقنية الكبرى.',
  },
  relatedNewsId: 'news-ai-contract',
  entryZone: [118, 122],
  targetZone: [134, 142],
  stopLoss: 111,
  expiresAt: iso(60 * 24 * 5),
});

export const nvdaUrgentAlert: UrgentAlert | null = generateUrgentAlert({
  id: 'alert-nvda',
  recommendation: nvdaRecommendation,
  signal: nvdaSignal,
  alertTitle: {
    en: 'CRITICAL: High-conviction AI breakout setup forming in NVDA',
    ar: 'حرج: تشكّل إعداد اختراق عالي القناعة في NVDA مدفوع بالذكاء الاصطناعي',
  },
  expectedMove: {
    en: '+8% to +15% within 2–5 trading days',
    ar: '+8% إلى +15% خلال 2–5 أيام تداول',
  },
  timeWindow: '2–5 trading days',
  reason: {
    en: 'Time-sensitive catalyst with abnormal volume and smart-money accumulation; window may close once media hype peaks.',
    ar: 'محفز حسّاس للوقت مع حجم غير اعتيادي وتجميع للأموال الذكية، وقد تُغلق الفرصة عند ذروة الضجة الإعلامية.',
  },
  alternativeScenario: {
    en: 'If broad tech rolls over on a macro shock, the setup fails and price reverts to the prior range.',
    ar: 'إذا تراجعت التقنية عموماً بفعل صدمة كلية، يفشل الإعداد ويعود السعر إلى نطاقه السابق.',
  },
  relatedNewsId: 'news-ai-contract',
  deliveryChannels: ['in_app', 'email'],
  expiresAt: iso(60 * 24 * 5),
});

// ---------------------------------------------------------------------------
// SCENARIO 2: WATCHLIST opportunity (insufficient conviction -> Watch)
// ---------------------------------------------------------------------------
const cyberSignal = {
  ticker: 'ZSCL',
  assetType: 'stock' as const,
  newsImpact: 55,
  abnormalVolume: 40,
  priceMoveProbability: 50,
  catalystStrength: 45,
  timeSensitivity: 48,
  smartMoneyActivity: 52,
  hasClearCatalyst: false,
  hasInvalidation: true,
  baseRisk: 55,
  agentOutputs: [
    ao('equity', N.equity, 'bullish', 58, 0.6, {
      en: 'Cybersecurity demand steady but no fresh catalyst.',
      ar: 'الطلب على الأمن السيبراني ثابت لكن دون محفز جديد.',
    }, [{ en: 'In-line guidance.', ar: 'توجيهات متوافقة مع التوقعات.' }]),
    ao('growth', N.growth, 'neutral', 55, 0.5, {
      en: 'Growth decelerating modestly.',
      ar: 'تباطؤ طفيف في النمو.',
    }, [{ en: 'NRR softening.', ar: 'تراجع معدل الاحتفاظ الصافي.' }]),
    ao('valuation', N.valuation, 'neutral', 50, 0.5, {
      en: 'Fairly valued; limited margin of safety.',
      ar: 'تقييم عادل مع هامش أمان محدود.',
    }, [{ en: 'EV/Sales near peers.', ar: 'مكرر القيمة/المبيعات قرب النظراء.' }]),
  ],
};

export const watchRecommendation: Recommendation = generateRecommendation({
  id: 'rec-zscl',
  assetId: 'asset-zscl',
  signal: cyberSignal,
  timeHorizon: 'medium_term',
  thesis: {
    en: 'Quality cybersecurity franchise but no time-sensitive catalyst and only partial agent agreement — monitor for a clearer entry.',
    ar: 'امتياز قوي في الأمن السيبراني لكن دون محفز حسّاس للوقت وبتوافق جزئي بين الوكلاء — يُراقب لدخول أوضح.',
  },
  reason: {
    en: 'Insufficient conviction and no clear catalyst; downgraded from Buy to Watch per engine rules.',
    ar: 'قناعة غير كافية وغياب محفز واضح، خُفّض من شراء إلى مراقبة وفق قواعد المحرك.',
  },
  catalyst: {
    en: 'No confirmed near-term catalyst yet; awaiting next earnings or contract news.',
    ar: 'لا يوجد محفز مؤكد قريب بعد، بانتظار نتائج أو أخبار عقود قادمة.',
  },
  invalidationConditions: {
    en: 'Break below support with deteriorating net retention invalidates the thesis.',
    ar: 'كسر الدعم مع تدهور الاحتفاظ الصافي يُبطل الأطروحة.',
  },
  relatedNewsId: null,
  entryZone: [168, 175],
  targetZone: [190, 205],
  stopLoss: 158,
  expiresAt: iso(60 * 24 * 30),
});

// ---------------------------------------------------------------------------
// SCENARIO 4: HIGH-RISK rejected recommendation (micro-cap biotech)
// ---------------------------------------------------------------------------
const biotechSignal = {
  ticker: 'BMCR',
  assetType: 'stock' as const,
  newsImpact: 47,
  abnormalVolume: 70,
  priceMoveProbability: 60,
  catalystStrength: 40,
  timeSensitivity: 55,
  smartMoneyActivity: 30,
  hasClearCatalyst: false,
  hasInvalidation: true,
  baseRisk: 88,
  agentOutputs: [
    ao('financial_analyst', N.financial, 'bearish', 72, 0.8, {
      en: 'Thin cash runway; high burn raises dilution risk.',
      ar: 'سيولة نقدية محدودة وحرق مرتفع يرفع مخاطر التخفيف.',
    }, [{ en: '< 3 quarters of cash.', ar: 'نقد يكفي أقل من 3 أرباع سنة.' }]),
    ao('risk', N.risk, 'bearish', 78, 0.9, {
      en: 'Binary trial outcome with severe drawdown potential.',
      ar: 'نتيجة تجارب ثنائية مع احتمال تراجع حاد.',
    }, [{ en: 'Single-asset dependency.', ar: 'اعتماد على أصل واحد.' }]),
    ao('valuation', N.valuation, 'neutral', 50, 0.4, {
      en: 'Unprofitable; valuation not meaningful.',
      ar: 'غير ربحية، التقييم غير ذي دلالة.',
    }, [{ en: 'No earnings base.', ar: 'لا قاعدة أرباح.' }]),
  ],
};

export const rejectedRecommendation: Recommendation = (() => {
  const rec = generateRecommendation({
    id: 'rec-bmcr',
    assetId: 'asset-bmcr',
    signal: biotechSignal,
    timeHorizon: 'short_term',
    thesis: {
      en: 'Speculative binary biotech with a thin runway — risk too high for an actionable signal.',
      ar: 'شركة تقنية حيوية مضاربية ذات نتيجة ثنائية وسيولة محدودة — المخاطر أعلى من أن تنتج إشارة قابلة للتنفيذ.',
    },
    reason: {
      en: 'High risk score with bearish risk/financial agents; CIO rejects the recommendation.',
      ar: 'درجة مخاطر مرتفعة مع وكلاء مخاطر/مالية هابطين، يرفض المدير الاستثماري التوصية.',
    },
    catalyst: {
      en: 'Mixed Phase 2 data — not a clean, de-risked catalyst.',
      ar: 'بيانات مختلطة للمرحلة الثانية — ليست محفزاً نظيفاً ومنخفض المخاطر.',
    },
    invalidationConditions: {
      en: 'Positive financing or clear trial success would be required to revisit.',
      ar: 'يلزم تمويل إيجابي أو نجاح واضح للتجارب لإعادة النظر.',
    },
    relatedNewsId: 'news-biotech-trial',
    entryZone: null,
    targetZone: null,
    stopLoss: null,
    expiresAt: iso(60 * 24 * 2),
  });
  return { ...rec, recommendationType: 'watch', status: 'rejected' };
})();

// ---------------------------------------------------------------------------
// All recommendations
// ---------------------------------------------------------------------------
export const recommendations: Recommendation[] = [
  nvdaRecommendation,
  watchRecommendation,
  rejectedRecommendation,
];

// ---------------------------------------------------------------------------
// Urgent alerts (only qualifying ones)
// ---------------------------------------------------------------------------
export const urgentAlerts: UrgentAlert[] = [nvdaUrgentAlert].filter(
  (a): a is UrgentAlert => a !== null,
);

// ---------------------------------------------------------------------------
// SCENARIO 3: high-growth LOW-NOISE emerging company + other companies
// ---------------------------------------------------------------------------
function buildCompany(
  partial: Omit<Company, 'noiseLevel' | 'earlyOpportunityScore'>,
): Company {
  return {
    ...partial,
    noiseLevel: calcNoiseLevel(partial.growth.growthScore, partial.mediaMentionsCount),
    earlyOpportunityScore: calcEarlyOpportunityScore(
      partial.growth,
      partial.mediaMentionsCount,
      partial.smartMoney.institutionalOwnership,
    ),
  };
}

export const companies: Company[] = [
  buildCompany({
    id: 'asset-qbit',
    name: 'QuantBit Systems',
    ticker: 'QBIT',
    sector: 'Quantum Computing',
    assetType: 'stock',
    marketCap: 820_000_000,
    price: 14.2,
    mediaMentionsCount: 9, // low noise
    urgencyScore: 74,
    financials: {
      revenue: 64_000_000,
      netIncome: -8_000_000,
      grossMargin: 61,
      operatingMargin: -12,
      freeCashFlow: -4_000_000,
      debt: 10_000_000,
      cashPosition: 180_000_000,
      cashBurn: -4_000_000,
      health: 'improving',
    },
    growth: {
      revenueGrowth: 84,
      customerGrowth: 70,
      hiringGrowth: 58,
      newContracts: 6,
      partnerships: 3,
      productAdoption: 72,
      marketExpansion: 66,
      growthScore: 86, // high growth
    },
    valuation: {
      pe: null,
      forwardPe: 44,
      peg: 0.9,
      evEbitda: 28,
      priceToSales: 11,
      dcfFairValue: 19.5,
      rating: 'undervalued',
    },
    smartMoney: {
      institutionalOwnership: 38,
      hedgeFundActivity: 'accumulating',
      insiderBuying: 4,
      insiderSelling: 0,
      thirteenFChange: 6.2,
      unusualVolume: true,
      netFlow: 'entering',
    },
    bullCase: {
      en: 'National-lab partnership validates the tech with strong revenue growth while media coverage stays minimal — classic early-signal setup.',
      ar: 'شراكة مع مختبر وطني تثبت صحة التقنية مع نمو قوي للإيرادات وتغطية إعلامية ضئيلة — إعداد إشارة مبكرة كلاسيكي.',
    },
    bearCase: {
      en: 'Pre-profit with execution risk; quantum commercialization timelines can slip.',
      ar: 'قبل تحقيق الربحية مع مخاطر تنفيذ، وقد تتأخر جداول التسويق الكمّي.',
    },
    neutralCase: {
      en: 'Promising but speculative; size positions accordingly.',
      ar: 'واعدة لكنها مضاربية، يُحدّد حجم المركز وفقاً لذلك.',
    },
    finalScore: 82,
  }),
  buildCompany({
    id: 'asset-nvda',
    name: 'NVIDIA Corp',
    ticker: 'NVDA',
    sector: 'Semiconductors',
    assetType: 'stock',
    marketCap: 2_900_000_000_000,
    price: 120.4,
    mediaMentionsCount: 95, // high noise
    urgencyScore: 90,
    financials: {
      revenue: 96_000_000_000,
      netIncome: 53_000_000_000,
      grossMargin: 75,
      operatingMargin: 62,
      freeCashFlow: 39_000_000_000,
      debt: 9_000_000_000,
      cashPosition: 34_000_000_000,
      cashBurn: 0,
      health: 'strong',
    },
    growth: {
      revenueGrowth: 94,
      customerGrowth: 40,
      hiringGrowth: 22,
      newContracts: 18,
      partnerships: 25,
      productAdoption: 96,
      marketExpansion: 90,
      growthScore: 95,
    },
    valuation: {
      pe: 55,
      forwardPe: 34,
      peg: 1.3,
      evEbitda: 41,
      priceToSales: 30,
      dcfFairValue: 132,
      rating: 'fair_value',
    },
    smartMoney: {
      institutionalOwnership: 67,
      hedgeFundActivity: 'accumulating',
      insiderBuying: 1,
      insiderSelling: 3,
      thirteenFChange: 2.1,
      unusualVolume: true,
      netFlow: 'entering',
    },
    bullCase: {
      en: 'AI capex supercycle with dominant share and expanding software moat.',
      ar: 'دورة إنفاق رأسمالي فائقة على الذكاء الاصطناعي مع حصة مهيمنة وخندق برمجي متوسّع.',
    },
    bearCase: {
      en: 'High expectations; any capex digestion pause hits the multiple hard.',
      ar: 'توقعات مرتفعة، وأي توقف في استيعاب الإنفاق الرأسمالي يضرب المضاعف بشدة.',
    },
    neutralCase: {
      en: 'Leader but priced for perfection short term.',
      ar: 'الشركة الرائدة لكنها مسعّرة على الكمال في المدى القصير.',
    },
    finalScore: 88,
  }),
  buildCompany({
    id: 'asset-bmcr',
    name: 'BioMicro Therapeutics',
    ticker: 'BMCR',
    sector: 'Biotech',
    assetType: 'stock',
    marketCap: 140_000_000,
    price: 3.1,
    mediaMentionsCount: 78, // late hype
    urgencyScore: 40,
    financials: {
      revenue: 0,
      netIncome: -42_000_000,
      grossMargin: 0,
      operatingMargin: -100,
      freeCashFlow: -38_000_000,
      debt: 25_000_000,
      cashPosition: 30_000_000,
      cashBurn: -38_000_000,
      health: 'weak',
    },
    growth: {
      revenueGrowth: 0,
      customerGrowth: 0,
      hiringGrowth: 5,
      newContracts: 0,
      partnerships: 1,
      productAdoption: 10,
      marketExpansion: 8,
      growthScore: 32, // low growth + high media => Late Hype
    },
    valuation: {
      pe: null,
      forwardPe: null,
      peg: null,
      evEbitda: null,
      priceToSales: null,
      dcfFairValue: null,
      rating: 'overvalued',
    },
    smartMoney: {
      institutionalOwnership: 14,
      hedgeFundActivity: 'reducing',
      insiderBuying: 0,
      insiderSelling: 5,
      thirteenFChange: -4.5,
      unusualVolume: true,
      netFlow: 'exiting',
    },
    bullCase: {
      en: 'A clean trial win could multiply a tiny market cap.',
      ar: 'فوز نظيف في التجارب قد يضاعف قيمة سوقية صغيرة جداً.',
    },
    bearCase: {
      en: 'Binary, cash-strapped, insiders selling, hype already priced in.',
      ar: 'ثنائية النتيجة، شحيحة السيولة، الداخليون يبيعون، والضجة مسعّرة بالفعل.',
    },
    neutralCase: {
      en: 'Avoid until financing and data clarity improve.',
      ar: 'يُتجنّب حتى يتضح التمويل والبيانات.',
    },
    finalScore: 28,
  }),
];

// ---------------------------------------------------------------------------
// RISK ASSESSMENTS / RISK DASHBOARD
// ---------------------------------------------------------------------------
export const marketRisk: RiskAssessment = buildRiskAssessment(
  'risk-market',
  { en: 'Overall Market', ar: 'السوق بشكل عام' },
  [
    { type: 'inflation', label: { en: 'Inflation Risk', ar: 'مخاطر التضخم' }, score: 62, level: 'elevated', note: { en: 'Hotter CPI revives sticky-inflation fears.', ar: 'تضخم أعلى يعيد مخاوف ثبات الأسعار.' } },
    { type: 'interest_rate', label: { en: 'Interest Rate Risk', ar: 'مخاطر أسعار الفائدة' }, score: 58, level: 'elevated', note: { en: 'Rate-cut path pushed out.', ar: 'تأجيل مسار خفض الفائدة.' } },
    { type: 'geopolitical', label: { en: 'Geopolitical Risk', ar: 'المخاطر الجيوسياسية' }, score: 74, level: 'high', note: { en: 'Oil chokepoint escalation.', ar: 'تصعيد في ممر نفطي.' } },
    { type: 'recession', label: { en: 'Recession Risk', ar: 'مخاطر الركود' }, score: 36, level: 'moderate', note: { en: 'Labor market still resilient.', ar: 'سوق العمل لا يزال صامداً.' } },
    { type: 'sector', label: { en: 'Sector Concentration', ar: 'تركّز القطاعات' }, score: 68, level: 'high', note: { en: 'Mega-cap tech leadership narrow.', ar: 'ريادة التقنية الكبرى ضيقة.' } },
    { type: 'market', label: { en: 'Liquidity / Volatility', ar: 'السيولة/التقلب' }, score: 45, level: 'moderate', note: { en: 'VIX contained but twitchy.', ar: 'مؤشر التقلب محتوى لكنه متوتر.' } },
  ],
  null,
  '—',
  {
    en: 'A combined inflation + geopolitical shock could trigger a 6–10% index drawdown.',
    ar: 'صدمة تضخم وجيوسياسية مجتمعة قد تسبب تراجعاً في المؤشر بنسبة 6–10%.',
  },
);

export const riskAssessments: RiskAssessment[] = [marketRisk];

// ---------------------------------------------------------------------------
// MACRO
// ---------------------------------------------------------------------------
export const macro: MacroSnapshot = {
  state: 'inflationary',
  summary: {
    en: 'Growth holding up while inflation reaccelerates — a mildly stagflationary tilt that keeps the Fed cautious.',
    ar: 'النمو صامد بينما يتسارع التضخم — ميل تضخمي ركودي طفيف يبقي الفيدرالي حذراً.',
  },
  indicators: [
    { key: 'cpi', label: { en: 'CPI (YoY)', ar: 'التضخم السنوي' }, value: 3.6, previous: 3.3, consensus: 3.3, surprise: true, trend: 'up' },
    { key: 'ppi', label: { en: 'PPI (YoY)', ar: 'أسعار المنتجين' }, value: 2.8, previous: 2.6, consensus: 2.6, surprise: true, trend: 'up' },
    { key: 'pce', label: { en: 'Core PCE', ar: 'نفقات الاستهلاك الأساسية' }, value: 2.9, previous: 2.8, consensus: 2.8, surprise: false, trend: 'up' },
    { key: 'gdp', label: { en: 'GDP (QoQ ann.)', ar: 'الناتج المحلي' }, value: 2.4, previous: 2.8, consensus: 2.5, surprise: false, trend: 'down' },
    { key: 'unemployment', label: { en: 'Unemployment', ar: 'البطالة' }, value: 4.1, previous: 4.0, consensus: 4.0, surprise: false, trend: 'up' },
    { key: 'jobs', label: { en: 'Nonfarm Payrolls (k)', ar: 'الوظائف غير الزراعية (ألف)' }, value: 185, previous: 206, consensus: 190, surprise: false, trend: 'down' },
    { key: 'retail_sales', label: { en: 'Retail Sales (MoM)', ar: 'مبيعات التجزئة الشهرية' }, value: 0.4, previous: 0.2, consensus: 0.3, surprise: false, trend: 'up' },
  ],
};

// ---------------------------------------------------------------------------
// MARKET INDICES + SENTIMENT
// ---------------------------------------------------------------------------
const spark = (base: number, n = 12) =>
  Array.from({ length: n }, (_, i) => base + Math.sin(i / 1.7) * (base * 0.01) + (i - n / 2) * (base * 0.002));

export const indices: MarketIndexQuote[] = [
  { name: 'S&P 500', symbol: 'SPX', value: 5430.2, change: -0.42, spark: spark(5400) },
  { name: 'NASDAQ', symbol: 'IXIC', value: 17560.8, change: -0.61, spark: spark(17500) },
  { name: 'Dow Jones', symbol: 'DJI', value: 39120.5, change: -0.18, spark: spark(39000) },
  { name: 'Russell 2000', symbol: 'RUT', value: 2030.4, change: 0.22, spark: spark(2020) },
  { name: 'Gold', symbol: 'XAU', value: 2358.1, change: 0.74, spark: spark(2340) },
  { name: 'WTI Crude', symbol: 'CL', value: 84.6, change: 3.1, spark: spark(82) },
  { name: 'DXY', symbol: 'DXY', value: 105.4, change: 0.35, spark: spark(105) },
  { name: '10Y Yield', symbol: 'US10Y', value: 4.46, change: 0.06, spark: spark(4.4) },
];

export const sentiment: SentimentReading = {
  aiConfidenceIndex: 78,
  marketSentiment: 46,
  sentimentLabel: { en: 'Cautious / Neutral', ar: 'حذر / محايد' },
};

// ---------------------------------------------------------------------------
// ASSET CLASSES
// ---------------------------------------------------------------------------
export const assetClasses: AssetClassSummary[] = [
  {
    assetType: 'stock',
    name: { en: 'Stocks', ar: 'الأسهم' },
    trend: 'neutral',
    keyDrivers: [
      { en: 'AI capex cycle', ar: 'دورة الإنفاق على الذكاء الاصطناعي' },
      { en: 'Rate path uncertainty', ar: 'غموض مسار الفائدة' },
    ],
    relatedNewsIds: ['news-ai-contract', 'news-cpi-hot'],
    recommendation: 'hold',
    riskLevel: 'elevated',
    instruments: [
      { name: 'S&P 500', symbol: 'SPX', change: -0.42, price: 5430.2 },
      { name: 'NASDAQ', symbol: 'IXIC', change: -0.61, price: 17560.8 },
    ],
  },
  {
    assetType: 'metal',
    name: { en: 'Metals', ar: 'المعادن' },
    trend: 'bullish',
    keyDrivers: [
      { en: 'Safe-haven demand', ar: 'الطلب على الملاذ الآمن' },
      { en: 'Geopolitical risk', ar: 'المخاطر الجيوسياسية' },
    ],
    relatedNewsIds: ['news-strait-tension'],
    recommendation: 'buy',
    riskLevel: 'moderate',
    instruments: [
      { name: 'Gold', symbol: 'XAU', change: 0.74, price: 2358.1 },
      { name: 'Silver', symbol: 'XAG', change: 0.9, price: 30.7 },
      { name: 'Copper', symbol: 'HG', change: 0.3, price: 4.52 },
    ],
  },
  {
    assetType: 'energy',
    name: { en: 'Energy', ar: 'الطاقة' },
    trend: 'bullish',
    keyDrivers: [
      { en: 'Supply chokepoint risk', ar: 'مخاطر ممرات الإمداد' },
      { en: 'OPEC discipline', ar: 'انضباط أوبك' },
    ],
    relatedNewsIds: ['news-strait-tension'],
    recommendation: 'buy',
    riskLevel: 'elevated',
    instruments: [
      { name: 'WTI Crude', symbol: 'CL', change: 3.1, price: 84.6 },
      { name: 'Natural Gas', symbol: 'NG', change: 1.4, price: 2.84 },
    ],
  },
  {
    assetType: 'agriculture',
    name: { en: 'Agriculture', ar: 'السلع الزراعية' },
    trend: 'neutral',
    keyDrivers: [
      { en: 'Weather & freight costs', ar: 'الطقس وتكاليف الشحن' },
      { en: 'Fertilizer / energy linkage', ar: 'ارتباط الأسمدة بالطاقة' },
    ],
    relatedNewsIds: ['news-strait-tension'],
    recommendation: 'watch',
    riskLevel: 'moderate',
    instruments: [
      { name: 'Wheat', symbol: 'ZW', change: 0.6, price: 5.92 },
      { name: 'Corn', symbol: 'ZC', change: 0.2, price: 4.41 },
      { name: 'Coffee', symbol: 'KC', change: 1.1, price: 2.31 },
    ],
  },
  {
    assetType: 'currency',
    name: { en: 'Currencies', ar: 'العملات' },
    trend: 'bullish',
    keyDrivers: [
      { en: 'Hawkish rate repricing', ar: 'إعادة تسعير متشددة للفائدة' },
      { en: 'Safe-haven USD flows', ar: 'تدفقات الدولار كملاذ آمن' },
    ],
    relatedNewsIds: ['news-cpi-hot'],
    recommendation: 'hold',
    riskLevel: 'moderate',
    instruments: [
      { name: 'US Dollar Index', symbol: 'DXY', change: 0.35, price: 105.4 },
      { name: 'EUR/USD', symbol: 'EURUSD', change: -0.3, price: 1.072 },
      { name: 'USD/JPY', symbol: 'USDJPY', change: 0.5, price: 158.2 },
    ],
  },
];

// ---------------------------------------------------------------------------
// AGENTS (control center)
// ---------------------------------------------------------------------------
const agentDef = (
  id: Agent['id'],
  en: string,
  ar: string,
  roleEn: string,
  roleAr: string,
  status: Agent['status'],
  confidence: number,
  sources: string[],
): Agent => ({
  id,
  name: { en, ar },
  role: { en: roleEn, ar: roleAr },
  status,
  lastRun: iso(-Math.round(Math.random() * 30) - 1),
  confidence,
  dataSources: sources,
  logs: [
    { timestamp: iso(-5), level: 'info', message: { en: 'Cycle completed.', ar: 'اكتملت الدورة.' } },
    { timestamp: iso(-25), level: 'info', message: { en: 'Ingested latest inputs.', ar: 'تم استيعاب أحدث المدخلات.' } },
  ],
});

export const agents: Agent[] = [
  agentDef('cio', 'Chief Investment Officer', 'المدير الاستثماري', 'Final decision & conflict resolution', 'القرار النهائي وحل التعارض', 'active', 81, ['All agents']),
  agentDef('global_news', 'Global News Intelligence', 'ذكاء الأخبار العالمية', 'Classifies & scores news', 'تصنيف الأخبار وتقييمها', 'active', 88, ['Reuters', 'Bloomberg', 'AP']),
  agentDef('geopolitical', 'Geopolitical Intelligence', 'الذكاء الجيوسياسي', 'Political/geo risk impact', 'أثر المخاطر السياسية والجيوسياسية', 'active', 76, ['Gov feeds', 'Wire services']),
  agentDef('market_causality', 'Market Causality', 'السببية السوقية', 'Builds impact chains', 'بناء سلاسل التأثير', 'active', 79, ['Internal graph']),
  agentDef('macro', 'Macro Economy', 'الاقتصاد الكلي', 'CPI/PPI/GDP/jobs', 'مؤشرات الاقتصاد الكلي', 'active', 74, ['BLS', 'BEA', 'Fed']),
  agentDef('rates_bonds', 'Rates & Bonds', 'الفائدة والسندات', 'Yields & Fed path', 'العوائد ومسار الفيدرالي', 'active', 77, ['Treasury', 'CME FedWatch']),
  agentDef('equity', 'Equity Markets', 'أسواق الأسهم', 'Indices & sectors', 'المؤشرات والقطاعات', 'active', 82, ['Exchanges']),
  agentDef('metals', 'Metals Intelligence', 'ذكاء المعادن', 'Gold/silver/copper', 'الذهب والفضة والنحاس', 'active', 73, ['LME', 'COMEX']),
  agentDef('energy', 'Energy Intelligence', 'ذكاء الطاقة', 'Oil/gas/nuclear', 'النفط والغاز والنووي', 'active', 80, ['EIA', 'OPEC']),
  agentDef('agriculture', 'Agriculture Intelligence', 'ذكاء الزراعة', 'Soft commodities', 'السلع الزراعية', 'idle', 64, ['USDA', 'NOAA']),
  agentDef('currency', 'Currency Intelligence', 'ذكاء العملات', 'FX & DXY', 'العملات ومؤشر الدولار', 'active', 75, ['FX feeds']),
  agentDef('emerging_companies', 'Emerging Companies', 'الشركات الناشئة', 'Early-stage discovery', 'اكتشاف المراحل المبكرة', 'active', 70, ['Filings', 'Job boards']),
  agentDef('growth', 'Growth Intelligence', 'ذكاء النمو', 'Growth scoring', 'تقييم النمو', 'active', 78, ['Earnings', 'Alt-data']),
  agentDef('financial_analyst', 'Financial Analyst', 'المحلل المالي', 'Statements & health', 'القوائم المالية والصحة', 'active', 79, ['SEC EDGAR']),
  agentDef('valuation', 'Valuation', 'التقييم', 'Multiples & DCF', 'المضاعفات والتدفقات المخصومة', 'active', 72, ['Market data']),
  agentDef('smart_money', 'Smart Money', 'الأموال الذكية', 'Institutional/insider flow', 'تدفقات المؤسسات والداخليين', 'active', 76, ['13F', 'Form 4']),
  agentDef('risk', 'Risk Management', 'إدارة المخاطر', 'Risk scoring & sizing', 'تقييم المخاطر وتحديد الحجم', 'active', 83, ['Internal models']),
  agentDef('recommendation', 'Investment Recommendation', 'توصيات الاستثمار', 'Generates recommendations', 'توليد التوصيات', 'active', 80, ['All agents']),
  agentDef('committee', 'Investment Committee', 'لجنة الاستثمار', 'Bull/bear/neutral debate', 'مناظرة صعودية/هبوطية/محايدة', 'active', 77, ['All agents']),
  agentDef('urgent_alert', 'Urgent Opportunity Alert', 'تنبيهات الفرص العاجلة', 'High-conviction alerts', 'تنبيهات عالية القناعة', 'active', 85, ['All agents']),
];

// ---------------------------------------------------------------------------
// IN-APP NOTIFICATIONS
// ---------------------------------------------------------------------------
export const notifications: AppNotification[] = [
  {
    id: 'ntf-1',
    type: 'critical_opportunity',
    title: { en: 'Critical urgent opportunity: NVDA', ar: 'فرصة عاجلة حرجة: NVDA' },
    body: {
      en: 'High-conviction AI breakout setup. Expected +8–15% in 2–5 days.',
      ar: 'إعداد اختراق عالي القناعة مدفوع بالذكاء الاصطناعي. متوقع +8–15% خلال 2–5 أيام.',
    },
    priority: 'critical',
    read: false,
    createdAt: iso(-15),
    link: '/urgent-alerts',
  },
  {
    id: 'ntf-2',
    type: 'early_signal',
    title: { en: 'Early signal detected: QBIT', ar: 'إشارة مبكرة مكتشفة: QBIT' },
    body: {
      en: 'High growth, low media noise — Alpha Early Signal.',
      ar: 'نمو مرتفع وضجة إعلامية منخفضة — إشارة ألفا مبكرة.',
    },
    priority: 'high',
    read: false,
    createdAt: iso(-120),
    link: '/emerging',
  },
  {
    id: 'ntf-3',
    type: 'risk_increased',
    title: { en: 'Risk increased: Geopolitical', ar: 'ارتفاع المخاطر: جيوسياسية' },
    body: {
      en: 'Oil chokepoint escalation raised market geopolitical risk to High.',
      ar: 'تصعيد في ممر نفطي رفع المخاطر الجيوسياسية للسوق إلى مرتفعة.',
    },
    priority: 'high',
    read: true,
    createdAt: iso(-90),
    link: '/risk',
  },
  {
    id: 'ntf-4',
    type: 'news_impact',
    title: { en: 'News impact detected: CPI', ar: 'تأثير خبر مكتشف: التضخم' },
    body: {
      en: 'Hot CPI shifted the rates path; growth stocks under pressure.',
      ar: 'تضخم أعلى غيّر مسار الفائدة، وأسهم النمو تحت ضغط.',
    },
    priority: 'medium',
    read: true,
    createdAt: iso(-1440),
    link: '/causality',
  },
  {
    id: 'ntf-5',
    type: 'recommendation_expired',
    title: { en: 'Recommendation expired', ar: 'انتهت صلاحية توصية' },
    body: {
      en: 'A short-term watch item passed its time window.',
      ar: 'تجاوز عنصر مراقبة قصير الأجل نافذته الزمنية.',
    },
    priority: 'low',
    read: true,
    createdAt: iso(-2880),
  },
];

export const DISCLAIMER: Bilingual = {
  en: 'This platform provides AI-generated investment research and educational insights only. It is not financial advice. It does not execute trades. Users must do their own research or consult a licensed financial advisor before making investment decisions.',
  ar: 'توفّر هذه المنصة أبحاثاً استثمارية ورؤى تعليمية مولّدة بالذكاء الاصطناعي فقط. وهي ليست نصيحة مالية ولا تنفّذ أي صفقات. على المستخدمين إجراء أبحاثهم الخاصة أو استشارة مستشار مالي مرخّص قبل اتخاذ أي قرارات استثمارية.',
};
