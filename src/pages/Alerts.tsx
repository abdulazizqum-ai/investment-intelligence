import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  TrendingUp,
  Siren,
  ShieldAlert,
  Newspaper,
  Activity,
  Sparkles,
  StopCircle,
  Clock,
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useAsync } from '@/lib/useAsync';
import { dataService } from '@/data/dataService';
import { PageHeader } from '@/components/PageHeader';
import { Card, Pill } from '@/components/ui';
import { priorityColor, timeAgo } from '@/lib/format';
import type { AppNotification, NotificationType } from '@/types';

const typeIcon: Record<NotificationType, typeof Bell> = {
  buy_signal: TrendingUp,
  critical_opportunity: Siren,
  risk_increased: ShieldAlert,
  news_impact: Newspaper,
  price_move: Activity,
  early_signal: Sparkles,
  stop_loss: StopCircle,
  recommendation_expired: Clock,
};

export default function Alerts() {
  const { t } = useTranslation();
  const { t2, locale } = useLocale();
  const navigate = useNavigate();
  const { data } = useAsync(() => dataService.getNotifications(), []);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.alerts')}
        action={
          <button
            className="btn-ghost"
            onClick={() => setItems((p) => p.map((i) => ({ ...i, read: true })))}
          >
            {t('common.markAllRead')}
          </button>
        }
      />

      <div className="space-y-3">
        {items.map((n) => {
          const Icon = typeIcon[n.type] ?? Bell;
          return (
            <Card
              key={n.id}
              className={`flex cursor-pointer items-start gap-3 hover:bg-slate-800/30 ${
                n.read ? 'opacity-70' : ''
              }`}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800"
                onClick={() => n.link && navigate(n.link)}
              >
                <Icon className="h-4 w-4 text-brand-400" />
              </div>
              <div
                className="min-w-0 flex-1"
                onClick={() => n.link && navigate(n.link)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-100">{t2(n.title)}</span>
                  <span className={`pill ${priorityColor(n.priority)}`}>
                    {t(`priority.${n.priority}`)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-400">{t2(n.body)}</p>
                <span className="text-xs text-slate-500">
                  {timeAgo(n.createdAt, locale)}
                </span>
              </div>
              {!n.read && (
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
