import { useMemo, useState } from 'react';
import { Plus, X, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from './ui';
import { QuoteDetailModal } from './QuoteDetailModal';
import { useLiveQuotes } from '@/lib/useLiveQuotes';
import { fmtPct } from '@/lib/format';

const LS = 'iimas_watchlist';
const load = (): string[] => {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return ['NVDA', 'AAPL', 'MSFT', 'TSLA'];
};
const save = (l: string[]) => {
  try {
    localStorage.setItem(LS, JSON.stringify(l));
  } catch {
    /* ignore */
  }
};

export function Watchlist() {
  const { t } = useTranslation();
  const [list, setList] = useState<string[]>(load);
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const { quotes, live } = useLiveQuotes(list);

  const add = () => {
    const tk = input.trim().toUpperCase();
    if (!tk || list.includes(tk)) return;
    const next = [...list, tk];
    setList(next);
    save(next);
    setInput('');
  };
  const remove = (tk: string) => {
    const next = list.filter((x) => x !== tk);
    setList(next);
    save(next);
  };

  const rows = useMemo(() => list, [list]);

  return (
    <SectionCard
      title={t('dashboard.watchlist')}
      action={
        <span className={`pill ${live ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
          {live ? '● LIVE' : '○ MOCK'}
        </span>
      }
    >
      <div className="mb-3 flex gap-2">
        <input
          className="input !py-1.5"
          placeholder="Add ticker (e.g. AMD)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn-primary !px-3" onClick={add}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        {rows.map((tk) => {
          const q = quotes[tk];
          const up = (q?.percent ?? 0) >= 0;
          return (
            <div key={tk} className="flex items-center gap-2 rounded-lg bg-slate-800/40 px-3 py-2">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              <button
                className="flex-1 text-start text-sm font-medium text-slate-100 hover:text-brand-300"
                onClick={() => setSelected(tk)}
              >
                {tk}
              </button>
              {q ? (
                <>
                  <span className="text-sm text-slate-200">
                    {q.current.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className={`w-16 text-end text-xs font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtPct(q.percent)}
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-500">—</span>
              )}
              <button className="text-slate-500 hover:text-red-400" onClick={() => remove(tk)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-slate-500">{t('common.none')}</p>
        )}
      </div>

      {selected && (
        <QuoteDetailModal symbol={selected} name={selected} onClose={() => setSelected(null)} />
      )}
    </SectionCard>
  );
}
