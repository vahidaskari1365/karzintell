'use client';

import { ReactNode } from 'react';

/** کلاس‌های ثابت جدول‌های ادمین */
export const tableCls = {
  wrap: 'overflow-x-auto rounded-2xl border border-slate-200 bg-white',
  table: 'w-full min-w-[640px] text-sm',
  thead: 'bg-slate-50 text-xs text-slate-500',
  th: 'px-4 py-3 text-start font-bold',
  td: 'px-4 py-3 text-slate-700',
  row: 'border-t border-slate-100 hover:bg-slate-50/60 transition',
};

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-black text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  archived: 'bg-slate-200 text-slate-500',
  active: 'bg-emerald-50 text-emerald-700',
  suspended: 'bg-rose-50 text-rose-600',
  open: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500',
  pending_support: 'bg-amber-50 text-amber-700',
  pending_customer: 'bg-orange-50 text-orange-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-600',
  answered: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  unpaid: 'bg-amber-50 text-amber-700',
  refunded: 'bg-slate-200 text-slate-500',
};

export function Pill({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-2xs font-bold ${STATUS_TONES[status] || 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
}


/** برچسب وضعیت با fallback */
export const labelOf = (map: Record<string, string>, key: string): string => map[key] || key;
