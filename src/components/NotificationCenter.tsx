import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/context/LocaleContext';
import { dataService } from '@/data/dataService';
import { priorityColor, timeAgo } from '@/lib/format';
import type { AppNotification } from '@/types';

export function NotificationCenter() {
  const { t } = useTranslation();
  const { t2, locale } = useLocale();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dataService.getNotifications().then(setItems);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn-ghost relative !px-2.5"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
            <span className="text-sm font-semibold text-slate-200">
              {t('nav.alerts')}
            </span>
            <button
              className="text-xs text-brand-400 hover:underline"
              onClick={() => setItems((prev) => prev.map((p) => ({ ...p, read: true })))}
            >
              {t('common.markAllRead')}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              <button
                key={n.id}
                className={`flex w-full flex-col gap-1 border-b border-slate-800/60 px-4 py-3 text-start hover:bg-slate-800/50 ${
                  n.read ? 'opacity-60' : ''
                }`}
                onClick={() => {
                  if (n.link) navigate(n.link);
                  setOpen(false);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100">
                    {t2(n.title)}
                  </span>
                  <span className={`pill ${priorityColor(n.priority)}`}>
                    {t(`priority.${n.priority}`)}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{t2(n.body)}</span>
                <span className="text-[11px] text-slate-500">
                  {timeAgo(n.createdAt, locale)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
