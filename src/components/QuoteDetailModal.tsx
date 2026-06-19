import { useEffect, useState } from 'react';
import { X, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getQuote, LIVE_ENABLED, type Quote } from '@/lib/marketData';
import { resolveSymbol } from '@/lib/marketSymbols';
import { fmtPct } from '@/lib/format';

/** Click-through price detail. `symbol` is the display ticker; we resolve it to
 *  a free-tier tradable proxy before querying. */
export function QuoteDetailModal({
  symbol,
  name,
  onClose,
}: {
  symbol: string;
  name: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchSymbol = resolveSymbol(symbol);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getQuote(fetchSymbol).then((q) => {
      if (active) {
        setQuote(q);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [fetchSymbol]);

  const up = (quote?.percent ?? 0) >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-100">{name}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {fetchSymbol}
              </span>
            </div>
            <span
              className={`text-xs ${
                LIVE_ENABLED ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {LIVE_ENABLED ? '● Live (Finnhub)' : '○ Mock — add API key to go live'}
            </span>
          </div>
          <button className="btn-ghost !px-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            {t('common.loading')}
          </div>
        ) : quote ? (
          <>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-4xl font-bold text-slate-50">
                {quote.current.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={`mb-1 inline-flex items-center gap-1 text-sm font-semibold ${
                  up ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {up ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {quote.change.toFixed(2)} ({fmtPct(quote.percent)})
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Field label="Open" value={quote.open} />
              <Field label="Prev Close" value={quote.prevClose} />
              <Field label="Day High" value={quote.high} />
              <Field label="Day Low" value={quote.low} />
            </div>

            <p className="mt-4 text-[11px] text-slate-500">
              Updated {new Date(quote.at).toLocaleTimeString()} · Educational
              data only, not a trade quote.
            </p>
          </>
        ) : (
          <div className="py-10 text-center text-sm text-slate-400">
            {LIVE_ENABLED
              ? 'No live data returned for this symbol (market closed or unsupported on the free tier).'
              : 'Live data is off. Add VITE_FINNHUB_API_KEY to your .env to see real prices.'}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-800/50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold text-slate-100">
        {value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}
