import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, CircleDot, AlertCircle, ChevronDown } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useAsync } from '@/lib/useAsync';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { Card, Pill, ScoreBar, Stat } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import type { AgentStatus } from '@/types';

function statusBadge(status: AgentStatus) {
  switch (status) {
    case 'active':
      return { cls: 'bg-emerald-500/15 text-emerald-400', Icon: Activity };
    case 'idle':
      return { cls: 'bg-slate-500/15 text-slate-400', Icon: CircleDot };
    default:
      return { cls: 'bg-red-500/15 text-red-400', Icon: AlertCircle };
  }
}

export default function AgentControlCenter() {
  const { t } = useTranslation();
  const { t2, locale } = useLocale();
  const { data } = useAsync(() => dataService.getAgents(), []);
  const [open, setOpen] = useState<string | null>(null);

  const agents = data ?? [];
  const active = agents.filter((a) => a.status === 'active').length;
  const idle = agents.filter((a) => a.status === 'idle').length;
  const errors = agents.filter((a) => a.status === 'error').length;
  const avgConf =
    agents.length > 0
      ? Math.round(agents.reduce((s, a) => s + a.confidence, 0) / agents.length)
      : 0;

  return (
    <div className="space-y-5">
      <PageHeader title={t('nav.agents')} subtitle={`${agents.length} agents`} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={t('agentStatus.active')} value={active} accent="text-emerald-400" />
        <Stat label={t('agentStatus.idle')} value={idle} accent="text-slate-300" />
        <Stat label={t('agentStatus.error')} value={errors} accent="text-red-400" />
        <Stat label={`${t('common.confidence')} (avg)`} value={avgConf} />
      </div>

      <div className="space-y-3">
        {agents.map((a) => {
          const sb = statusBadge(a.status);
          const isOpen = open === a.id;
          return (
            <Card key={a.id} className="!p-0 overflow-hidden">
              <button
                className="flex w-full items-center gap-3 p-4 text-start hover:bg-slate-800/30"
                onClick={() => setOpen(isOpen ? null : a.id)}
              >
                <Pill className={sb.cls}>
                  <sb.Icon className="h-3 w-3" /> {t(`agentStatus.${a.status}`)}
                </Pill>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-100">{t2(a.name)}</div>
                  <div className="truncate text-xs text-slate-500">{t2(a.role)}</div>
                </div>
                <div className="hidden w-40 sm:block">
                  <ScoreBar value={a.confidence} label={t('common.confidence')} />
                </div>
                <div className="hidden text-xs text-slate-500 md:block">
                  {t('common.lastRun')}: {timeAgo(a.lastRun, locale)}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-slate-800 bg-slate-900/40 p-4 text-sm">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-500">
                      {t('common.dataSources')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {a.dataSources.map((s) => (
                        <Pill key={s} className="bg-slate-700/40 text-slate-300">
                          {s}
                        </Pill>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-500">
                      {t('common.logs')}
                    </div>
                    <div className="space-y-1 font-mono text-xs">
                      {a.logs.map((log, i) => (
                        <div key={i} className="flex gap-2 text-slate-400">
                          <span className="text-slate-600">
                            {timeAgo(log.timestamp, locale)}
                          </span>
                          <span
                            className={
                              log.level === 'error'
                                ? 'text-red-400'
                                : log.level === 'warn'
                                  ? 'text-amber-400'
                                  : 'text-slate-300'
                            }
                          >
                            [{log.level}]
                          </span>
                          <span>{t2(log.message)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
