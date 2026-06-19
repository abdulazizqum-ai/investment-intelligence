import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useLocale } from '@/context/LocaleContext';
import { useAsync } from '@/lib/useAsync';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { Pill } from '@/components/ui';
import { Disclaimer } from '@/components/Disclaimer';
import { RecommendationCard } from '@/components/cards';
import { fmtZone, recColor } from '@/lib/format';
import type { AssetType, Recommendation, TimeHorizon } from '@/types';

type Filter =
  | 'all'
  | TimeHorizon
  | 'urgent'
  | 'high_conf'
  | 'low_risk'
  | AssetType;

const filterGroups: { label: string; filters: Filter[] }[] = [
  { label: 'horizon', filters: ['short_term', 'medium_term', 'long_term'] },
  { label: 'quality', filters: ['urgent', 'high_conf', 'low_risk'] },
  { label: 'asset', filters: ['stock', 'metal', 'energy', 'agriculture', 'currency'] },
];

export default function Recommendations() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { data } = useAsync(() => dataService.getRecommendations(), []);
  const [active, setActive] = useState<Set<Filter>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'urgencyScore', desc: true },
  ]);
  const [view, setView] = useState<'table' | 'cards'>('table');

  const rows = useMemo(() => {
    let list = data ?? [];
    for (const f of active) {
      if (f === 'short_term' || f === 'medium_term' || f === 'long_term')
        list = list.filter((r) => r.timeHorizon === f);
      else if (f === 'urgent') list = list.filter((r) => r.urgencyScore >= 80);
      else if (f === 'high_conf') list = list.filter((r) => r.confidenceScore >= 75);
      else if (f === 'low_risk') list = list.filter((r) => r.riskScore <= 45);
      else list = list.filter((r) => r.assetType === f);
    }
    return list;
  }, [data, active]);

  const ch = createColumnHelper<Recommendation>();
  const columns = useMemo(
    () => [
      ch.accessor('ticker', {
        header: t('common.ticker'),
        cell: (c) => <span className="font-semibold text-slate-100">{c.getValue()}</span>,
      }),
      ch.accessor('recommendationType', {
        header: t('common.recommendation'),
        cell: (c) => (
          <Pill className={recColor(c.getValue())}>{t(`rec.${c.getValue()}`)}</Pill>
        ),
      }),
      ch.accessor('timeHorizon', {
        header: t('common.timeHorizon'),
        cell: (c) => (
          <span className="text-slate-300">{t(`horizon.${c.getValue()}`)}</span>
        ),
      }),
      ch.accessor('confidenceScore', {
        header: t('common.confidence'),
        cell: (c) => <ScoreCell value={c.getValue()} />,
      }),
      ch.accessor('riskScore', {
        header: t('common.risk'),
        cell: (c) => <ScoreCell value={c.getValue()} invert />,
      }),
      ch.accessor('urgencyScore', {
        header: t('common.urgency'),
        cell: (c) => <ScoreCell value={c.getValue()} />,
      }),
      ch.accessor((r) => r.entryZone, {
        id: 'entry',
        header: t('common.entry'),
        cell: (c) => <span className="text-slate-300">{fmtZone(c.getValue())}</span>,
      }),
      ch.accessor((r) => r.targetZone, {
        id: 'target',
        header: t('common.target'),
        cell: (c) => <span className="text-slate-300">{fmtZone(c.getValue())}</span>,
      }),
      ch.accessor('stopLoss', {
        header: t('common.stopLoss'),
        cell: (c) => (
          <span className="text-slate-300">
            {c.getValue() ? `$${c.getValue()}` : '—'}
          </span>
        ),
      }),
      ch.accessor('status', {
        header: t('common.status'),
        cell: (c) => (
          <span className="text-xs capitalize text-slate-400">{c.getValue()}</span>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, t2],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function toggle(f: Filter) {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  const filterLabel = (f: Filter): string => {
    if (['short_term', 'medium_term', 'long_term'].includes(f))
      return t(`horizon.${f}`);
    if (f === 'urgent') return t('common.urgency');
    if (f === 'high_conf') return t('common.confidence');
    if (f === 'low_risk') return `${t('common.risk')} ↓`;
    return t(`nav.assets`) && f.charAt(0).toUpperCase() + f.slice(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.recommendations')}
        action={
          <div className="flex gap-2">
            <button
              className={view === 'table' ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setView('table')}
            >
              Table
            </button>
            <button
              className={view === 'cards' ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setView('cards')}
            >
              Cards
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`pill border ${
            active.size === 0
              ? 'border-brand-500 bg-brand-600/20 text-brand-300'
              : 'border-slate-700 text-slate-400'
          }`}
          onClick={() => setActive(new Set())}
        >
          {t('common.all')}
        </button>
        {filterGroups.flatMap((g) =>
          g.filters.map((f) => (
            <button
              key={f}
              className={`pill border ${
                active.has(f)
                  ? 'border-brand-500 bg-brand-600/20 text-brand-300'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => toggle(f)}
            >
              {filterLabel(f)}
            </button>
          )),
        )}
      </div>

      {view === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <RecommendationCard key={r.id} rec={r} />
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-slate-800">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="cursor-pointer px-3 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? ''}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">
                    {t('common.none')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail of selected recommendation reasoning */}
      <div className="grid gap-4 md:grid-cols-3">
        {rows.slice(0, 3).map((r) => (
          <div key={r.id} className="card space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100">{r.ticker}</span>
              <Pill className={recColor(r.recommendationType)}>
                {t(`rec.${r.recommendationType}`)}
              </Pill>
            </div>
            <p>
              <span className="text-slate-500">{t('common.reason')}: </span>
              <span className="text-slate-300">{t2(r.reason)}</span>
            </p>
            <p>
              <span className="text-slate-500">{t('common.catalyst')}: </span>
              <span className="text-slate-300">{t2(r.catalyst)}</span>
            </p>
            <p>
              <span className="text-slate-500">{t('common.invalidation')}: </span>
              <span className="text-slate-300">{t2(r.invalidationConditions)}</span>
            </p>
          </div>
        ))}
      </div>

      <Disclaimer compact />
    </div>
  );
}

function ScoreCell({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value <= 45 : value >= 70;
  const bad = invert ? value >= 65 : value < 45;
  const color = good ? 'text-emerald-400' : bad ? 'text-red-400' : 'text-amber-400';
  return <span className={`font-semibold ${color}`}>{value}</span>;
}
