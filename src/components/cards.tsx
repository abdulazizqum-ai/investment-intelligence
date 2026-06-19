import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock, Newspaper, Users } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { Pill, ScoreBar } from './ui';
import { QuoteDetailModal } from './QuoteDetailModal';
import { fmtZone, priorityColor, recColor } from '@/lib/format';
import type { Recommendation, UrgentAlert } from '@/types';

export function ScoreRow({
  confidence,
  risk,
  urgency,
}: {
  confidence: number;
  risk: number;
  urgency: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-3 gap-3">
      <ScoreBar value={confidence} label={t('common.confidence')} />
      <ScoreBar value={risk} invert label={t('common.risk')} />
      <ScoreBar value={urgency} label={t('common.urgency')} />
    </div>
  );
}

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const [showQuote, setShowQuote] = useState(false);
  return (
    <div className="card flex flex-col gap-3">
      {showQuote && (
        <QuoteDetailModal
          symbol={rec.ticker}
          name={rec.ticker}
          onClose={() => setShowQuote(false)}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuote(true)}
              className="text-base font-bold text-slate-100 hover:text-brand-300 hover:underline"
            >
              {rec.ticker}
            </button>
            <Pill className={recColor(rec.recommendationType)}>
              {t(`rec.${rec.recommendationType}`)}
            </Pill>
            {rec.status === 'rejected' && (
              <Pill className="bg-red-500/15 text-red-400 border border-red-500/30">
                {t('common.status')}: ✕
              </Pill>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {t(`horizon.${rec.timeHorizon}`)} · {rec.assetType}
          </div>
        </div>
        <Link
          to={`/company/${rec.assetId}`}
          className="text-xs text-brand-400 hover:underline"
        >
          {t('common.viewAll')}
        </Link>
      </div>

      <p className="text-sm text-slate-300">{t2(rec.thesis)}</p>

      <ScoreRow
        confidence={rec.confidenceScore}
        risk={rec.riskScore}
        urgency={rec.urgencyScore}
      />

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Field label={t('common.entry')} value={fmtZone(rec.entryZone)} />
        <Field label={t('common.target')} value={fmtZone(rec.targetZone)} />
        <Field
          label={t('common.stopLoss')}
          value={rec.stopLoss ? `$${rec.stopLoss}` : '—'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {rec.supportingAgents.length}{' '}
          {t('common.supportingAgents')}
        </span>
        {rec.relatedNewsId && (
          <span className="inline-flex items-center gap-1">
            <Newspaper className="h-3.5 w-3.5" /> {t('common.relatedNews')}
          </span>
        )}
      </div>
    </div>
  );
}

export function UrgentAlertCard({
  alert,
  onStatus,
}: {
  alert: UrgentAlert;
  onStatus?: (id: string, status: UrgentAlert['status']) => void;
}) {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const critical = alert.priority === 'critical';

  return (
    <div
      className={`card flex flex-col gap-3 ${
        critical
          ? 'border-red-500/50 bg-red-950/20 animate-pulseRing'
          : 'border-orange-500/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill className={priorityColor(alert.priority)}>
            {t(`priority.${alert.priority}`)}
          </Pill>
          <span className="text-base font-bold text-slate-100">{alert.ticker}</span>
          <span className="text-xs text-slate-500">{alert.assetType}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" /> {alert.timeWindow}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-slate-100">{t2(alert.alertTitle)}</h4>
      <p className="text-sm text-slate-300">{t2(alert.reason)}</p>

      <div className="rounded-lg bg-slate-800/40 p-2 text-sm">
        <span className="text-slate-400">{t('common.expectedMove')}: </span>
        <span className="font-semibold text-emerald-400">
          {t2(alert.expectedMove)}
        </span>
      </div>

      <ScoreRow
        confidence={alert.confidenceScore}
        risk={alert.riskScore}
        urgency={alert.urgencyScore}
      />

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Field label={t('common.entry')} value={fmtZone(alert.entryZone)} />
        <Field label={t('common.target')} value={fmtZone(alert.targetZone)} />
        <Field
          label={t('common.stopLoss')}
          value={alert.stopLoss ? `$${alert.stopLoss}` : '—'}
        />
      </div>

      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer text-slate-300">
          {t('common.invalidation')} · {t('common.alternativeScenario')}
        </summary>
        <div className="mt-2 space-y-2">
          <p>
            <span className="font-medium text-slate-300">
              {t('common.invalidation')}:{' '}
            </span>
            {t2(alert.invalidationConditions)}
          </p>
          <p>
            <span className="font-medium text-slate-300">
              {t('common.alternativeScenario')}:{' '}
            </span>
            {t2(alert.alternativeScenario)}
          </p>
        </div>
      </details>

      <div className="flex items-center justify-between">
        <Pill className="bg-slate-700/40 text-slate-300">
          {t(`alertStatus.${alert.status}`)}
        </Pill>
        {onStatus && (
          <div className="flex gap-2">
            <button
              className="btn-ghost !py-1 !text-xs"
              onClick={() => onStatus(alert.id, 'reviewed')}
            >
              {t('alertStatus.reviewed')}
            </button>
            <button
              className="btn-ghost !py-1 !text-xs"
              onClick={() => onStatus(alert.id, 'dismissed')}
            >
              {t('alertStatus.dismissed')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/40 p-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-medium text-slate-200">{value}</div>
    </div>
  );
}
