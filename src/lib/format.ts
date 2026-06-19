import type { AlertPriority, RecommendationType, RiskLevel } from '@/types';

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function fmtZone(z: [number, number] | null | undefined): string {
  if (!z) return '—';
  return `$${z[0]} – $${z[1]}`;
}

export function fmtPct(n: number, withSign = true): string {
  const s = `${n.toFixed(2)}%`;
  return withSign && n > 0 ? `+${s}` : s;
}

export function timeAgo(iso: string, locale: 'en' | 'ar' = 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (locale === 'ar') {
    if (m < 1) return 'الآن';
    if (m < 60) return `قبل ${m} د`;
    const h = Math.round(m / 60);
    if (h < 24) return `قبل ${h} س`;
    return `قبل ${Math.round(h / 24)} ي`;
  }
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// ---- Color tokens -----------------------------------------------------------
export function priorityColor(p: AlertPriority): string {
  return {
    critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
    high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    low: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  }[p];
}

export function recColor(r: RecommendationType): string {
  return {
    buy: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    sell: 'bg-red-500/15 text-red-400 border border-red-500/30',
    hold: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    watch: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  }[r];
}

export function riskLevelColor(l: RiskLevel): string {
  return {
    low: 'text-emerald-400',
    moderate: 'text-sky-400',
    elevated: 'text-amber-400',
    high: 'text-orange-400',
    severe: 'text-red-400',
  }[l];
}

/** Score bar color: high score is green for confidence, but red for risk. */
export function scoreColor(score: number, invert = false): string {
  const good = invert
    ? score <= 35
    : score >= 70;
  const bad = invert ? score >= 65 : score < 45;
  if (good) return 'bg-emerald-500';
  if (bad) return 'bg-red-500';
  return 'bg-amber-500';
}
