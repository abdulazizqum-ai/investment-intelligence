import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useAsync } from '@/lib/useAsync';
import { useLiveQuotes } from '@/lib/useLiveQuotes';
import { marketInstruments } from '@/lib/marketSymbols';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { Card, SectionCard, Ring, ScoreBar, Pill } from '@/components/ui';
import { RecommendationCard, UrgentAlertCard } from '@/components/cards';
import { Disclaimer } from '@/components/Disclaimer';
import { QuoteDetailModal } from '@/components/QuoteDetailModal';
import { fmtPct, priorityColor, riskLevelColor, timeAgo } from '@/lib/format';

export default function Dashboard() {
  const { t } = useTranslation();
  const { t2, locale } = useLocale();

  const { quotes, live } = useLiveQuotes(marketInstruments.map((i) => i.symbol));
  const [selected, setSelected] = useState<{ symbol: string; name: string } | null>(null);

  const { data: recs } = useAsync(() => dataService.getRecommendations(), []);
  const { data: alerts } = useAsync(() => dataService.getUrgentAlerts(), []);
  const { data: news } = useAsync(() => dataService.getNews(), []);
  const { data: risks } = useAsync(() => dataService.getRisks(), []);
  const { data: sentiment } = useAsync(() => dataService.getSentiment(), []);
  const { data: agents } = useAsync(() => dataService.getAgents(), []);

  const shortTerm = (recs ?? []).filter(
    (r) => r.timeHorizon === 'short_term' && r.status !== 'rejected',
  );
  const longTerm = (recs ?? []).filter((r) => r.timeHorizon === 'long_term');
  const topRiskComponents = risks?.[0]?.components
    ? [...risks[0].components].sort((a, b) => b.score - a.score).slice(0, 4)
    : [];
  const activeAgents = (agents ?? []).filter((a) => a.status === 'active').length;

  return (
    <div className="space-y-5">
      <PageHeader title={t('dashboard.welcome')} subtitle={t('appTagline')} />

      <Disclaimer compact />

      {/* Market overview ticker cards — live (Finnhub) with mock fallback */}
      <SectionCard
        title={t('dashboard.marketOverview')}
        action={
          <span
            className={`pill ${
              live
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {live ? '● LIVE' : '○ MOCK'}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {marketInstruments.map((ix) => {
            const q = quotes[ix.symbol];
            const price = q ? q.current : ix.fallbackPrice;
            const change = q ? q.percent : ix.fallbackChange;
            const up = change >= 0;
            return (
              <button
                key={ix.symbol}
                onClick={() => setSelected({ symbol: ix.symbol, name: t2(ix.label) })}
                className="rounded-lg bg-slate-800/40 p-3 text-start transition-colors hover:bg-slate-700/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{t2(ix.label)}</span>
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                      up ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {up ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {fmtPct(change)}
                  </span>
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-100">
                  {price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">{ix.represents}</div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {selected && (
        <QuoteDetailModal
          symbol={selected.symbol}
          name={selected.name}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Top row: urgent alerts + indices/consensus */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard
            title={t('dashboard.urgentAlerts')}
            action={
              <Link to="/urgent-alerts" className="text-xs text-brand-400 hover:underline">
                {t('common.viewAll')}
              </Link>
            }
          >
            <div className="space-y-4">
              {(alerts ?? []).map((a) => (
                <UrgentAlertCard key={a.id} alert={a} />
              ))}
              {alerts && alerts.length === 0 && (
                <p className="text-sm text-slate-500">{t('common.none')}</p>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          {/* AI confidence + sentiment */}
          <Card>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center">
                <Ring value={sentiment?.aiConfidenceIndex ?? 0} />
                <div className="mt-2 text-center text-xs text-slate-400">
                  {t('dashboard.aiConfidence')}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <Ring value={sentiment?.marketSentiment ?? 0} />
                <div className="mt-2 text-center text-xs text-slate-400">
                  {t('dashboard.marketSentiment')}
                </div>
                <div className="text-xs text-slate-300">
                  {sentiment ? t2(sentiment.sentimentLabel) : ''}
                </div>
              </div>
            </div>
          </Card>

          {/* Consensus / agents */}
          <SectionCard
            title={t('dashboard.consensus')}
            action={
              <Link to="/agents" className="text-xs text-brand-400 hover:underline">
                {t('common.viewAll')}
              </Link>
            }
          >
            <div className="mb-3 text-sm text-slate-300">
              {activeAgents}/{agents?.length ?? 0} {t('agentStatus.active')}
            </div>
            <div className="space-y-2">
              {(agents ?? []).slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-xs text-slate-400">
                    {t2(a.name)}
                  </span>
                  <ScoreBar value={a.confidence} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title={t('dashboard.shortTerm')}
          action={
            <Link to="/recommendations" className="text-xs text-brand-400 hover:underline">
              {t('common.viewAll')}
            </Link>
          }
        >
          <div className="space-y-4">
            {shortTerm.map((r) => (
              <RecommendationCard key={r.id} rec={r} />
            ))}
            {shortTerm.length === 0 && (
              <p className="text-sm text-slate-500">{t('common.none')}</p>
            )}
          </div>
        </SectionCard>

        <div className="space-y-5">
          {/* Top risks */}
          <SectionCard
            title={t('dashboard.topRisks')}
            action={
              <Link to="/risk" className="text-xs text-brand-400 hover:underline">
                {t('common.viewAll')}
              </Link>
            }
          >
            <div className="space-y-3">
              {topRiskComponents.map((c) => (
                <div key={c.type}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{t2(c.label)}</span>
                    <span className={`text-xs font-semibold ${riskLevelColor(c.level)}`}>
                      {t(`riskLevel.${c.level}`)} · {c.score}
                    </span>
                  </div>
                  <ScoreBar value={c.score} invert />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Latest news */}
          <SectionCard
            title={t('dashboard.latestNews')}
            action={
              <Link to="/news" className="text-xs text-brand-400 hover:underline">
                {t('common.viewAll')}
              </Link>
            }
          >
            <div className="space-y-3">
              {(news ?? []).slice(0, 4).map((n) => (
                <Link
                  to="/news"
                  key={n.id}
                  className="block rounded-lg p-2 hover:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      {t2(n.headline)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Pill className="bg-slate-700/40 text-slate-300">{n.category}</Pill>
                    <span>{n.source}</span>
                    <span>· {timeAgo(n.publishedAt, locale)}</span>
                    {n.isMarketMoving && (
                      <Pill className={priorityColor('high')}>★</Pill>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Long term */}
      {longTerm.length > 0 && (
        <SectionCard title={t('dashboard.longTerm')}>
          <div className="grid gap-4 md:grid-cols-2">
            {longTerm.map((r) => (
              <RecommendationCard key={r.id} rec={r} />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
