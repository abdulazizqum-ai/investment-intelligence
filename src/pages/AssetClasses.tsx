import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useAsync } from '@/lib/useAsync';
import { useLiveQuotes } from '@/lib/useLiveQuotes';
import { resolveSymbol } from '@/lib/marketSymbols';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { Card, Pill } from '@/components/ui';
import { QuoteDetailModal } from '@/components/QuoteDetailModal';
import { fmtPct, recColor, riskLevelColor } from '@/lib/format';

export default function AssetClasses() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { data } = useAsync(() => dataService.getAssetClasses(), []);
  const { data: news } = useAsync(() => dataService.getNews(), []);
  const [selected, setSelected] = useState<{ symbol: string; name: string } | null>(null);

  const allSymbols = (data ?? [])
    .flatMap((ac) => ac.instruments.map((i) => resolveSymbol(i.symbol)));
  const { quotes, live } = useLiveQuotes(allSymbols);

  const TrendIcon = (trend: string) =>
    trend === 'bullish' ? TrendingUp : trend === 'bearish' ? TrendingDown : Minus;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.assets')}
        action={
          <span
            className={`pill ${
              live ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {live ? '● LIVE' : '○ MOCK'}
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {(data ?? []).map((ac) => {
          const Icon = TrendIcon(ac.trend);
          const trendColor =
            ac.trend === 'bullish'
              ? 'text-emerald-400'
              : ac.trend === 'bearish'
                ? 'text-red-400'
                : 'text-slate-400';
          return (
            <Card key={ac.assetType} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-100">{t2(ac.name)}</h3>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                    <Icon className="h-4 w-4" /> {t(`trend.${ac.trend}`)}
                  </span>
                  <Pill className={recColor(ac.recommendation)}>
                    {t(`rec.${ac.recommendation}`)}
                  </Pill>
                </div>
              </div>

              {/* Instruments — click to open live price detail */}
              <div className="space-y-1.5">
                {ac.instruments.map((ins) => {
                  const q = quotes[resolveSymbol(ins.symbol)];
                  const price = q ? q.current : ins.price;
                  const change = q ? q.percent : ins.change;
                  return (
                    <button
                      key={ins.symbol}
                      onClick={() => setSelected({ symbol: ins.symbol, name: ins.name })}
                      className="flex w-full items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2 text-sm transition-colors hover:bg-slate-700/50"
                    >
                      <span className="text-slate-300">{ins.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-200">
                          {price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                        <span
                          className={`font-semibold ${
                            change >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {fmtPct(change)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Key drivers */}
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">
                  {t('common.keyDrivers')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ac.keyDrivers.map((d, i) => (
                    <Pill key={i} className="bg-slate-700/40 text-slate-300">
                      {t2(d)}
                    </Pill>
                  ))}
                </div>
              </div>

              {/* Related news */}
              {ac.relatedNewsIds.length > 0 && (
                <div className="text-xs text-slate-400">
                  <span className="text-slate-500">{t('common.relatedNews')}: </span>
                  {ac.relatedNewsIds
                    .map((id) => {
                      const n = news?.find((x) => x.id === id);
                      return n ? t2(n.headline) : null;
                    })
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs">
                <span className="text-slate-500">{t('common.risk')}</span>
                <span className={`font-semibold ${riskLevelColor(ac.riskLevel)}`}>
                  {t(`riskLevel.${ac.riskLevel}`)}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {selected && (
        <QuoteDetailModal
          symbol={selected.symbol}
          name={selected.name}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
