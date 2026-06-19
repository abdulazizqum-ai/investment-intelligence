import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useAsync } from '@/lib/useAsync';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { Card, Pill, ScoreBar } from '@/components/ui';
import { fmtMoney } from '@/lib/format';
import type { NoiseLevel } from '@/types';

function noiseStyle(level: NoiseLevel) {
  switch (level) {
    case 'Alpha Early Signal':
      return {
        cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        icon: VolumeX,
      };
    case 'Late Hype':
      return {
        cls: 'bg-red-500/15 text-red-400 border border-red-500/30',
        icon: Volume2,
      };
    default:
      return {
        cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        icon: Volume2,
      };
  }
}

export default function EmergingCompanies() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { data } = useAsync(() => dataService.getCompanies(), []);

  const sorted = [...(data ?? [])].sort(
    (a, b) => b.earlyOpportunityScore - a.earlyOpportunityScore,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.emerging')}
        subtitle="Strong fundamentals, low media noise = early opportunity"
      />

      <Card className="flex items-start gap-3 text-sm text-slate-300">
        <Sparkles className="mt-0.5 h-4 w-4 text-brand-400" />
        <p>
          <span className="font-semibold text-slate-100">{t('common.noiseLevel')}:</span>{' '}
          A strong company with low media attention may be an <em>early opportunity</em>{' '}
          (<span className="text-emerald-400">Alpha Early Signal</span>). A strong company
          everyone already talks about may be <span className="text-red-400">Late Hype</span>.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {sorted.map((c) => {
          const ns = noiseStyle(c.noiseLevel);
          const NoiseIcon = ns.icon;
          return (
            <Card key={c.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-100">{c.ticker}</span>
                    <span className="text-xs text-slate-500">{c.name}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {c.sector} · {fmtMoney(c.marketCap)}
                  </div>
                </div>
                <Pill className={ns.cls}>
                  <NoiseIcon className="h-3 w-3" /> {c.noiseLevel}
                </Pill>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <Metric label={t('common.growthScore')} value={c.growth.growthScore} />
                <Metric label={t('common.earlyOpportunity')} value={c.earlyOpportunityScore} />
                <Metric label={t('common.urgency')} value={c.urgencyScore} />
                <Metric label="Media mentions" value={c.mediaMentionsCount} raw />
              </div>

              <div className="space-y-2">
                <Bar label="Revenue Growth" value={c.growth.revenueGrowth} />
                <Bar label="Hiring Growth" value={c.growth.hiringGrowth} />
                <Bar label="Customer Growth" value={c.growth.customerGrowth} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {t('common.smartMoney')}:{' '}
                  <span
                    className={
                      c.smartMoney.netFlow === 'entering'
                        ? 'text-emerald-400'
                        : c.smartMoney.netFlow === 'exiting'
                          ? 'text-red-400'
                          : 'text-slate-300'
                    }
                  >
                    {c.smartMoney.netFlow}
                  </span>
                </span>
                <Link
                  to={`/company/${c.id}`}
                  className="text-brand-400 hover:underline"
                >
                  {t('common.viewAll')}
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, raw }: { label: string; value: number; raw?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-800/40 p-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-100">
        {value}
        {!raw && <span className="text-xs text-slate-500">/100</span>}
      </div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <ScoreBar value={Math.min(value, 100)} />
    </div>
  );
}
