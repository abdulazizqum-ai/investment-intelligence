import type { ReactNode } from 'react';
import { scoreColor } from '@/lib/format';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionCard({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Pill({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`pill ${className}`}>{children}</span>;
}

export function ScoreBar({
  value,
  invert = false,
  label,
}: {
  value: number;
  invert?: boolean;
  label?: string;
}) {
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>{label}</span>
          <span className="font-semibold text-slate-200">{value}</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/50">
        <div
          className={`h-full rounded-full ${scoreColor(value, invert)}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="card">
      <div className="card-title">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ?? 'text-slate-100'}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Ring({ value, size = 88 }: { value: number; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const color = value >= 70 ? '#34d399' : value >= 45 ? '#fbbf24' : '#f87171';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#27324a" strokeWidth={8} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={8}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
        fill="#e2e8f0"
        fontSize="20"
        fontWeight="600"
      >
        {value}
      </text>
    </svg>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
