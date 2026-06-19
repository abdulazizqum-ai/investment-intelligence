import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Siren } from 'lucide-react';
import { useAsync } from '@/lib/useAsync';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { UrgentAlertCard } from '@/components/cards';
import { Disclaimer } from '@/components/Disclaimer';
import { EmptyState } from '@/components/ui';
import type { AlertPriority, UrgentAlert } from '@/types';

const priorities: AlertPriority[] = ['critical', 'high', 'medium', 'low'];

export default function UrgentAlerts() {
  const { t } = useTranslation();
  const { data } = useAsync(() => dataService.getUrgentAlerts(), []);
  const [alerts, setAlerts] = useState<UrgentAlert[]>([]);
  const [filter, setFilter] = useState<AlertPriority | 'all'>('all');

  useEffect(() => {
    if (data) setAlerts(data);
  }, [data]);

  const shown = useMemo(
    () => (filter === 'all' ? alerts : alerts.filter((a) => a.priority === filter)),
    [alerts, filter],
  );

  function setStatus(id: string, status: UrgentAlert['status']) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  const counts = priorities.map((p) => ({
    p,
    n: alerts.filter((a) => a.priority === p).length,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.urgentAlerts')}
        subtitle={t('dashboard.urgentAlerts')}
        action={
          <span className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-3 py-1.5 text-sm font-semibold text-red-400">
            <Siren className="h-4 w-4" />
            {alerts.filter((a) => a.priority === 'critical').length} {t('priority.critical')}
          </span>
        }
      />

      <div className="flex flex-wrap gap-2">
        <button
          className={`pill border ${
            filter === 'all'
              ? 'border-brand-500 bg-brand-600/20 text-brand-300'
              : 'border-slate-700 text-slate-400'
          }`}
          onClick={() => setFilter('all')}
        >
          {t('common.all')} ({alerts.length})
        </button>
        {counts.map(({ p, n }) => (
          <button
            key={p}
            className={`pill border ${
              filter === p
                ? 'border-brand-500 bg-brand-600/20 text-brand-300'
                : 'border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setFilter(p)}
          >
            {t(`priority.${p}`)} ({n})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState text={t('common.none')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((a) => (
            <UrgentAlertCard key={a.id} alert={a} onStatus={setStatus} />
          ))}
        </div>
      )}

      <Disclaimer compact />
    </div>
  );
}
