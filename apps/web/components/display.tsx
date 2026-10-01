'use client';

import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import { faNumber, percentOff, toToman } from '@/lib/format';

/** نمایش قیمت با قیمت قبل از تخفیف */
export function PriceTag({ price, compareAt, size = 'md', className }: {
  price: number | null | undefined;
  compareAt?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  if (price == null) return <span className={className}>—</span>;
  const off = percentOff(price, compareAt);
  return (
    <div className={clsx('flex flex-wrap items-baseline gap-2', className)}>
      {off > 0 && (
        <span className="rounded-lg bg-rose-500/15 px-1.5 py-0.5 text-xs font-bold text-rose-400">
          {faNumber(off)}٪
        </span>
      )}
      <span className={clsx('font-bold text-slate-100', size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg')}>
        {toToman(price)}
      </span>
      {off > 0 && (
        <span className="text-xs text-slate-400 line-through">{toToman(compareAt!)}</span>
      )}
    </div>
  );
}

export function RatingStars({ value, count, size = 'sm' }: { value: number; count?: number; size?: 'sm' | 'md' }) {
  const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
  const sz = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <span className="inline-flex items-center gap-1.5" dir="ltr">
      <span className="relative inline-flex">
        <span className="flex gap-0.5 text-slate-200">
          {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={sz} fill="currentColor" />)}
        </span>
        <span className="absolute inset-0 flex gap-0.5 overflow-hidden text-amber-400" style={{ width: `${pct}%` }}>
          {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={clsx(sz, 'shrink-0')} fill="currentColor" />)}
        </span>
      </span>
      <span className="text-xs text-slate-400" dir="rtl">{faNumber(value)}{count != null && ` (${faNumber(count)})`}</span>
    </span>
  );
}

export function Pagination({ page, limit, total, onPage }: {
  page: number; limit: number; total: number; onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  const nums: number[] = [];
  const add = (n: number) => { if (n >= 1 && n <= pages && !nums.includes(n)) nums.push(n); };
  add(1); add(pages);
  for (let i = page - 2; i <= page + 2; i++) add(i);
  nums.sort((a, b) => a - b);

  return (
    <div className="mt-6 flex items-center justify-center gap-1.5">
      {nums.map((n, idx) => (
        <span key={n} className="flex items-center gap-1.5">
          {idx > 0 && nums[idx - 1] < n - 1 && <span className="px-1 text-slate-300">…</span>}
          <button
            onClick={() => onPage(n)}
            className={clsx(
              'h-9 min-w-9 rounded-lg px-2 text-sm font-medium',
              n === page ? 'bg-slate-900 text-white' : 'bg-white/10 text-slate-400 hover:bg-slate-200',
            )}
          >
            {faNumber(n)}
          </button>
        </span>
      ))}
    </div>
  );
}
