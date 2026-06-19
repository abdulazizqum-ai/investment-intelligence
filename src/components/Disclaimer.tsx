import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/context/LocaleContext';
import { DISCLAIMER } from '@/data/mockData';

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  return (
    <div
      className={`flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200/90 ${
        compact ? 'text-xs' : 'text-sm'
      }`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <div>
        <span className="font-semibold">{t('disclaimerTitle')}: </span>
        {t2(DISCLAIMER)}
      </div>
    </div>
  );
}
