import type { ReactNode } from 'react';

type Accent = 'blue' | 'green' | 'amber' | 'violet' | 'sky';

const ACCENT: Record<Accent, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  sky: 'bg-sky-50 text-sky-600',
};

export function StatCard({
  label,
  value,
  icon,
  accent = 'blue',
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: Accent;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${ACCENT[accent]}`}>
        {icon}
      </div>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
