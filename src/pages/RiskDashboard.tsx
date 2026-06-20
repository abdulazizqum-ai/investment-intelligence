import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import { useLocale } from '@/context/LocaleContext';
import { useAsync } from '@/lib/useAsync';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { Card, SectionCard, Ring, ScoreBar } from '@/components/ui';
import { Disclaimer } from '@/components/Disclaimer';
import { riskLevelColor } from '@/lib/format';

export default function RiskDashboard() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { data } = useAsync(() => dataService.getRisks(), []);
  const { data: macro } = useAsync(() => dataService.getMacro(), []);
  const risk = data?.[0];

  const radarData =
    risk?.components.map((c) => ({ subject: t2(c.label), score: c.score })) ?? [];

  function riskTileColor(score: number) {
    if (score >= 70) return 'bg-red-500/20 border-red-500/40';
    if (score >= 55) return 'bg-orange-500/20 border-orange-500/40';
    if (score >= 40) return 'bg-amber-500/20 border-amber-500/40';
    return 'bg-emerald-500/20 border-emerald-500/40';
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t('nav.risk')} subtitle={t('dashboard.topRisks')} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          <Ring value={risk?.overallScore ?? 0} size={120} />
          <div className="mt-3 text-sm text-slate-400">{t('common.score')}</div>
          {risk && (
            <div className={`text-lg font-semibold ${riskLevelColor(risk.level)}`}>
              {t(`riskLevel.${risk.level}`)}
            </div>
          )}
          <div className="mt-2 text-center text-xs text-slate-500">
            {risk ? t2(risk.subject) : ''}
          </div>
        </Card>

        <SectionCard title={t('nav.risk')} className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Radar
                  dataKey="score"
                  stroke="#f87171"
                  fill="#ef4444"
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Market risk map */}
      <SectionCard title={`${t('nav.risk')} — Map`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(risk?.components ?? []).map((c) => (
            <div
              key={c.type}
              className={`rounded-lg border p-3 ${riskTileColor(c.score)}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-100">
                  {t2(c.label)}
                </span>
                <span className="text-lg font-bold text-slate-100">{c.score}</span>
              </div>
              <div className={`text-xs font-semibold ${riskLevelColor(c.level)}`}>
                {t(`riskLevel.${c.level}`)}
              </div>
              <p className="mt-1 text-xs text-slate-300/80">{t2(c.note)}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Detailed bars + scenario */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title={`${t('common.risk')} ${t('common.score')}`}>
          <div className="space-y-3">
            {(risk?.components ?? []).map((c) => (
              <div key={c.type}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-300">{t2(c.label)}</span>
                  <span className="text-slate-400">{c.score}/100</span>
                </div>
                <ScoreBar value={c.score} invert />
              </div>
            ))}
          </div>
        </SectionCard>

        <Card>
          <div className="card-title">Max Drawdown Scenario</div>
          <p className="mt-2 text-sm text-slate-300">
            {risk ? t2(risk.maxDrawdownScenario) : ''}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-800/40 p-3">
              <div className="text-xs text-slate-500">Position Size</div>
              <div className="font-medium text-slate-200">
                {risk?.positionSizeSuggestion ?? '—'}
              </div>
            </div>
            <div className="rounded-lg bg-slate-800/40 p-3">
              <div className="text-xs text-slate-500">{t('common.stopLoss')}</div>
              <div className="font-medium text-slate-200">
                {risk?.stopLoss ? `$${risk.stopLoss}` : '—'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Macro / economic indicators */}
      {macro && (
        <SectionCard title={`${t('common.trend')} — Macro / ${t('economy.' + macro.state)}`}>
          <p className="mb-3 text-sm text-slate-300">{t2(macro.summary)}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {macro.indicators.map((ind, i) => (
              <div key={i} className="rounded-lg bg-slate-800/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-200">{t2(ind.label)}</span>
                  <span
                    className={`text-xs font-semibold ${
                      ind.trend === 'up' ? 'text-emerald-400' : ind.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                    }`}
                  >
                    {ind.trend === 'up' ? '▲' : ind.trend === 'down' ? '▼' : '—'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{t2(ind.note)}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <Disclaimer compact />
    </div>
  );
}
