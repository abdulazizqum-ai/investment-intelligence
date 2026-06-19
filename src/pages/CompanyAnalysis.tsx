import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/context/LocaleContext';
import { useAsync } from '@/lib/useAsync';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { Card, Pill, ScoreBar, Ring } from '@/components/ui';
import { Disclaimer } from '@/components/Disclaimer';
import { fmtMoney } from '@/lib/format';
import type { Company } from '@/types';

const tabs = [
  'overview',
  'financials',
  'growth',
  'valuation',
  'risks',
  'smartMoney',
] as const;
type Tab = (typeof tabs)[number];

export default function CompanyAnalysis() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { data: companies } = useAsync(() => dataService.getCompanies(), []);
  const { data: recs } = useAsync(() => dataService.getRecommendations(), []);
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const company: Company | undefined = useMemo(() => {
    const list = companies ?? [];
    return (
      list.find((c) => c.id === (selectedId ?? id)) ??
      list.find((c) => c.ticker === id) ??
      list[0]
    );
  }, [companies, id, selectedId]);

  const rec = recs?.find((r) => r.assetId === company?.id);

  if (!company)
    return (
      <div className="p-6 text-slate-400">{t('common.loading')}</div>
    );

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${company.name} (${company.ticker})`}
        subtitle={`${company.sector} · ${fmtMoney(company.marketCap)}`}
        action={
          <select
            className="input max-w-[200px]"
            value={company.id}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {(companies ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.ticker} — {c.name}
              </option>
            ))}
          </select>
        }
      />

      {/* Header scores */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="flex flex-col items-center">
          <Ring value={company.finalScore} />
          <div className="mt-2 text-xs text-slate-400">{t('common.finalScore')}</div>
        </Card>
        <Card className="flex flex-col items-center">
          <Ring value={company.growth.growthScore} />
          <div className="mt-2 text-xs text-slate-400">{t('common.growthScore')}</div>
        </Card>
        <Card className="flex flex-col items-center">
          <Ring value={company.earlyOpportunityScore} />
          <div className="mt-2 text-xs text-slate-400">{t('common.earlyOpportunity')}</div>
        </Card>
        <Card className="flex flex-col items-center">
          <Ring value={company.urgencyScore} />
          <div className="mt-2 text-xs text-slate-400">{t('common.urgency')}</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {tabs.map((tb) => (
          <button
            key={tb}
            className={`pill ${
              tab === tb
                ? 'bg-brand-600/20 text-brand-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setTab(tb)}
          >
            {t(`common.${tb}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-3">
          <CaseCard title={t('common.bullCase')} text={t2(company.bullCase)} tone="bull" />
          <CaseCard title={t('common.neutralCase')} text={t2(company.neutralCase)} tone="neutral" />
          <CaseCard title={t('common.bearCase')} text={t2(company.bearCase)} tone="bear" />
        </div>
      )}

      {tab === 'financials' && (
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KV label="Revenue" value={fmtMoney(company.financials.revenue)} />
            <KV label="Net Income" value={fmtMoney(company.financials.netIncome)} />
            <KV label="Gross Margin" value={`${company.financials.grossMargin}%`} />
            <KV label="Operating Margin" value={`${company.financials.operatingMargin}%`} />
            <KV label="Free Cash Flow" value={fmtMoney(company.financials.freeCashFlow)} />
            <KV label="Debt" value={fmtMoney(company.financials.debt)} />
            <KV label="Cash" value={fmtMoney(company.financials.cashPosition)} />
            <KV label="Cash Burn" value={fmtMoney(company.financials.cashBurn)} />
          </div>
          <div className="mt-4">
            <Pill className="bg-slate-700/40 text-slate-200">
              Health: {t(`health.${company.financials.health}`)}
            </Pill>
          </div>
        </Card>
      )}

      {tab === 'growth' && (
        <Card className="space-y-3">
          <GrowthBar label="Revenue Growth" value={company.growth.revenueGrowth} />
          <GrowthBar label="Customer Growth" value={company.growth.customerGrowth} />
          <GrowthBar label="Hiring Growth" value={company.growth.hiringGrowth} />
          <GrowthBar label="Product Adoption" value={company.growth.productAdoption} />
          <GrowthBar label="Market Expansion" value={company.growth.marketExpansion} />
          <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
            <KV label="New Contracts" value={String(company.growth.newContracts)} />
            <KV label="Partnerships" value={String(company.growth.partnerships)} />
            <KV label={t('common.growthScore')} value={String(company.growth.growthScore)} />
          </div>
        </Card>
      )}

      {tab === 'valuation' && (
        <Card>
          <div className="mb-3">
            <Pill
              className={
                company.valuation.rating === 'undervalued'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : company.valuation.rating === 'overvalued'
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-amber-500/15 text-amber-400'
              }
            >
              {t(`valuation.${company.valuation.rating}`)}
            </Pill>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <KV label="P/E" value={company.valuation.pe ?? '—'} />
            <KV label="Forward P/E" value={company.valuation.forwardPe ?? '—'} />
            <KV label="PEG" value={company.valuation.peg ?? '—'} />
            <KV label="EV/EBITDA" value={company.valuation.evEbitda ?? '—'} />
            <KV label="Price/Sales" value={company.valuation.priceToSales ?? '—'} />
            <KV
              label="DCF Fair Value"
              value={company.valuation.dcfFairValue ? `$${company.valuation.dcfFairValue}` : '—'}
            />
          </div>
        </Card>
      )}

      {tab === 'risks' && (
        <Card className="text-sm text-slate-300">
          <p>
            Company-specific risk is summarized on the{' '}
            <span className="text-brand-400">{t('nav.risk')}</span>. Key inputs: financial
            health <b>{t(`health.${company.financials.health}`)}</b>, valuation{' '}
            <b>{t(`valuation.${company.valuation.rating}`)}</b>, smart-money flow{' '}
            <b>{company.smartMoney.netFlow}</b>.
          </p>
        </Card>
      )}

      {tab === 'smartMoney' && (
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <KV label="Institutional Own." value={`${company.smartMoney.institutionalOwnership}%`} />
            <KV label="Hedge Funds" value={company.smartMoney.hedgeFundActivity} />
            <KV label="13F Change" value={`${company.smartMoney.thirteenFChange}%`} />
            <KV label="Insider Buying" value={String(company.smartMoney.insiderBuying)} />
            <KV label="Insider Selling" value={String(company.smartMoney.insiderSelling)} />
            <KV label="Net Flow" value={company.smartMoney.netFlow} />
          </div>
          {company.smartMoney.unusualVolume && (
            <Pill className="mt-3 bg-orange-500/15 text-orange-400">Unusual volume detected</Pill>
          )}
        </Card>
      )}

      {/* Recommendation */}
      {rec && (
        <Card className="space-y-2">
          <div className="card-title">{t('common.recommendation')}</div>
          <p className="text-sm text-slate-300">{t2(rec.thesis)}</p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <ScoreBar value={rec.confidenceScore} label={t('common.confidence')} />
            <ScoreBar value={rec.riskScore} invert label={t('common.risk')} />
            <ScoreBar value={rec.urgencyScore} label={t('common.urgency')} />
          </div>
        </Card>
      )}

      <Disclaimer compact />
    </div>
  );
}

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-800/40 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function GrowthBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <ScoreBar value={Math.min(value, 100)} />
    </div>
  );
}

function CaseCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: 'bull' | 'bear' | 'neutral';
}) {
  const border =
    tone === 'bull'
      ? 'border-emerald-500/30'
      : tone === 'bear'
        ? 'border-red-500/30'
        : 'border-slate-700';
  const titleColor =
    tone === 'bull' ? 'text-emerald-400' : tone === 'bear' ? 'text-red-400' : 'text-slate-300';
  return (
    <div className={`card ${border}`}>
      <div className={`text-sm font-semibold ${titleColor}`}>{title}</div>
      <p className="mt-2 text-sm text-slate-300">{text}</p>
    </div>
  );
}
