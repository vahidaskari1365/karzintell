'use client';

import { ReactNode } from 'react';

/** کلاس‌های ثابت جدول‌های ادمین — تم تاریک */
export const tableCls = {
  wrap: 'overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40',
  table: 'w-full min-w-[640px] text-sm',
  thead: 'bg-slate-900/80 text-xs text-slate-400',
  th: 'px-4 py-3 text-start font-bold',
  td: 'px-4 py-3 text-slate-300',
  row: 'border-t border-slate-800 hover:bg-slate-800/40 transition',
};

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-black text-slate-100">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  published: 'bg-emerald-500/20 text-emerald-300',
  draft: 'bg-slate-500/20 text-slate-300',
  pending: 'bg-amber-500/20 text-amber-300',
  archived: 'bg-slate-500/20 text-slate-400',
  active: 'bg-emerald-500/20 text-emerald-300',
  suspended: 'bg-rose-500/20 text-rose-300',
  open: 'bg-emerald-500/20 text-emerald-300',
  closed: 'bg-slate-500/20 text-slate-400',
  pending_support: 'bg-amber-500/20 text-amber-300',
  pending_customer: 'bg-orange-500/20 text-orange-300',
  approved: 'bg-emerald-500/20 text-emerald-300',
  rejected: 'bg-rose-500/20 text-rose-300',
  answered: 'bg-emerald-500/20 text-emerald-300',
  paid: 'bg-emerald-500/20 text-emerald-300',
  unpaid: 'bg-amber-500/20 text-amber-300',
  refunded: 'bg-slate-500/20 text-slate-400',
};

export function Pill({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-2xs font-bold ${STATUS_TONES[status] || 'bg-slate-500/20 text-slate-300'}`}>
      {label}
    </span>
  );
}


/** برچسب وضعیت با fallback */
export const labelOf = (map: Record<string, string>, key: string): string => map[key] || key;
