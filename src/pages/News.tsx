import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Newspaper, Zap } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useAsync } from '@/lib/useAsync';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { Card, Pill, ScoreBar } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import type { NewsCategory } from '@/types';

const categories: (NewsCategory | 'all')[] = [
  'all',
  'economic',
  'political',
  'geopolitical',
  'technology',
  'energy',
  'central_banks',
  'commodities',
  'company',
];

export default function News() {
  const { t } = useTranslation();
  const { t2, locale } = useLocale();
  const { data } = useAsync(() => dataService.getNews(), []);
  const { data: agents } = useAsync(() => dataService.getAgents(), []);
  const [cat, setCat] = useState<NewsCategory | 'all'>('all');

  const agentName = (id: string) =>
    agents?.find((a) => a.id === id)?.name
      ? t2(agents.find((a) => a.id === id)!.name)
      : id;

  const shown = useMemo(
    () => (cat === 'all' ? data ?? [] : (data ?? []).filter((n) => n.category === cat)),
    [data, cat],
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t('nav.news')} subtitle={t('dashboard.latestNews')} />

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            className={`pill border capitalize ${
              cat === c
                ? 'border-brand-500 bg-brand-600/20 text-brand-300'
                : 'border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setCat(c)}
          >
            {c === 'all' ? t('common.all') : c.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {shown.map((n) => (
          <Card key={n.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className="bg-slate-700/40 capitalize text-slate-300">
                    {n.category.replace('_', ' ')}
                  </Pill>
                  {n.isMarketMoving && (
                    <Pill className="bg-orange-500/15 text-orange-400 border border-orange-500/30">
                      <Zap className="h-3 w-3" /> Market-moving
                    </Pill>
                  )}
                  <span className="text-xs text-slate-500">
                    {n.source} · {timeAgo(n.publishedAt, locale)}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-100">
                  {t2(n.headline)}
                </h3>
                <p className="mt-1 text-sm text-slate-400">{t2(n.summary)}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {n.affectedAssets.map((a) => (
                    <Pill key={a} className="bg-brand-600/15 capitalize text-brand-300">
                      {a}
                    </Pill>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <Newspaper className="h-3.5 w-3.5" />
                  <span>Analyzed by:</span>
                  {n.analyzedBy.map((id) => (
                    <span
                      key={id}
                      className="rounded bg-slate-800/60 px-1.5 py-0.5 text-slate-300"
                    >
                      {agentName(id)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-40 shrink-0">
                <div className="text-xs text-slate-500">Impact Score</div>
                <div className="mb-1 text-2xl font-bold text-slate-100">
                  {n.importanceScore}
                </div>
                <ScoreBar value={n.importanceScore} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
