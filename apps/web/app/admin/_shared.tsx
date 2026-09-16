'use client';

import { ReactNode } from 'react';

/** کلاس‌های ثابت جدول‌های ادمین — dual theme (dark/light) */
export const tableCls = {
  wrap: 'overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-200 dark:border-slate-800 dark:bg-white dark:bg-slate-900/40',
  table: 'w-full min-w-[640px] text-sm',
  thead: 'bg-slate-50 text-xs text-slate-500 dark:bg-slate-100 dark:bg-slate-900/80 dark:text-slate-600 dark:text-slate-200',
  th: 'px-4 py-3 text-start font-bold',
  td: 'px-4 py-3 text-slate-700 dark:text-slate-700 dark:text-slate-200',
  row: 'border-t border-slate-100 hover:bg-slate-50/60 dark:border-slate-200 dark:border-slate-800 dark:hover:bg-slate-100 dark:hover:bg-slate-800/40 transition',
};

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-900 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-600 dark:text-slate-200">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-700 dark:text-slate-200',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  archived: 'bg-slate-200 text-slate-500 dark:bg-slate-500/20 dark:text-slate-600 dark:text-slate-200',
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  suspended: 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
  open: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-600 dark:text-slate-200',
  pending_support: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  pending_customer: 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  rejected: 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
  answered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  unpaid: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  refunded: 'bg-slate-200 text-slate-500 dark:bg-slate-500/20 dark:text-slate-600 dark:text-slate-200',
};

export function Pill({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-2xs font-bold ${STATUS_TONES[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-700 dark:text-slate-200'}`}>
      {label}
    </span>
  );
}

/** برچسب وضعیت با fallback */
export const labelOf = (map: Record<string, string>, key: string): string => map[key] || key;
