import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowDown, ArrowUp, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useAsync } from '@/lib/useAsync';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { Card, Pill, ScoreBar } from '@/components/ui';
import { priorityColor } from '@/lib/format';
import type { CausalityNode } from '@/types';

function NodeChip({ node }: { node: CausalityNode }) {
  const { t2 } = useLocale();
  const color =
    node.direction === 'up'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : node.direction === 'down'
        ? 'text-red-400 border-red-500/40 bg-red-500/10'
        : 'text-slate-300 border-slate-600 bg-slate-700/30';
  const Icon =
    node.direction === 'up' ? ArrowUp : node.direction === 'down' ? ArrowDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${color}`}>
      {t2(node.label)}
      <Icon className="h-3 w-3" />
    </span>
  );
}

export default function MarketCausality() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { data } = useAsync(() => dataService.getCausalityChains(), []);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.causality')}
        subtitle="Event → impact chain → beneficiaries & losers"
      />

      <div className="space-y-5">
        {(data ?? []).map((chain) => (
          <Card key={chain.id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-100">{t2(chain.cause)}</h3>
              <div className="flex items-center gap-2">
                <Pill className={priorityColor(chain.urgencyLevel)}>
                  {t(`priority.${chain.urgencyLevel}`)}
                </Pill>
                <Pill className="bg-slate-700/40 text-slate-300">
                  {t(`horizon.${chain.timeHorizon}`)}
                </Pill>
              </div>
            </div>

            {/* Impact chain */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-800/30 p-3">
              {chain.chain.map((node, i) => (
                <div key={i} className="flex items-center gap-2">
                  <NodeChip node={node} />
                  {i < chain.chain.length - 1 && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 rtl:rotate-180" />
                  )}
                </div>
              ))}
            </div>

            {/* Order impacts */}
            <div className="grid gap-3 md:grid-cols-3">
              <ImpactBox title="Direct Impact" text={t2(chain.directImpact)} />
              <ImpactBox title="Second-Order" text={t2(chain.secondOrderImpact)} />
              <ImpactBox title="Third-Order" text={t2(chain.thirdOrderImpact)} />
            </div>

            {/* Beneficiaries / losers */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="mb-2 flex items-center gap-1 text-sm font-semibold text-emerald-400">
                  <TrendingUp className="h-4 w-4" /> {t('common.beneficiaries')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {chain.beneficiaries.map((b) => (
                    <Pill key={b} className="bg-emerald-500/15 text-emerald-300">
                      {b}
                    </Pill>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <div className="mb-2 flex items-center gap-1 text-sm font-semibold text-red-400">
                  <TrendingDown className="h-4 w-4" /> {t('common.losers')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {chain.losers.map((l) => (
                    <Pill key={l} className="bg-red-500/15 text-red-300">
                      {l}
                    </Pill>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-400">{t('common.tradeProbability')}</span>
                <span className="font-semibold text-slate-200">
                  {chain.tradeOpportunityProbability}%
                </span>
              </div>
              <ScoreBar value={chain.tradeOpportunityProbability} />
            </div>

            <div className="flex flex-wrap gap-2">
              {chain.affectedAssets.map((a) => (
                <Pill key={a} className="bg-brand-600/15 capitalize text-brand-300">
                  {a}
                </Pill>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ImpactBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg bg-slate-800/40 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <p className="mt-1 text-sm text-slate-300">{text}</p>
    </div>
  );
}
