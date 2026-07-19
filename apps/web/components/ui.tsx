'use client';

import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

// ------------------------------------------------------------ Button
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
type BtnSize = 'sm' | 'md' | 'lg';

const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400',
  secondary: 'bg-white/10 text-slate-100 hover:bg-slate-200',
  ghost: 'text-slate-400 hover:bg-white/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  outline: 'border border-slate-300 text-slate-300 hover:bg-[#10130f]',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};
const btnSizes: Record<BtnSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; loading?: boolean }
>(function Button({ className, variant = 'primary', size = 'md', loading, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed',
        btnVariants[variant],
        btnSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

// ------------------------------------------------------------ Inputs
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-xl border border-slate-300 bg-[#181c20] px-3.5 py-2.5 text-sm text-slate-100 outline-none',
          'placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-white/10 disabled:bg-[#10130f]',
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={clsx(
          'w-full rounded-xl border border-slate-300 bg-[#181c20] px-3.5 py-2.5 text-sm text-slate-100 outline-none',
          'placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-white/10',
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={clsx(
          'w-full rounded-xl border border-slate-300 bg-[#181c20] px-3.5 py-2.5 text-sm text-slate-100 outline-none',
          'focus:border-slate-500 focus:ring-2 focus:ring-white/10',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export function Field({ label, required, error, children, hint }: {
  label?: string; required?: boolean; error?: string; hint?: string; children: ReactNode;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-300">
          {label}
          {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

// ------------------------------------------------------------ Card / Badge
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx('rounded-2xl border border-white/10 bg-[#181c20] p-5 shadow-sm', className)}>
      {children}
    </div>
  );
}

const badgeTones: Record<string, string> = {
  slate: 'bg-white/10 text-slate-300',
  green: 'bg-emerald-500/15 text-emerald-300',
  red: 'bg-rose-500/15 text-rose-300',
  amber: 'bg-amber-500/15 text-amber-300',
  blue: 'bg-blue-500/15 text-blue-300',
  violet: 'bg-violet-500/15 text-violet-300',
};

export function Badge({ tone = 'slate', children, className }: { tone?: string; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeTones[tone] || badgeTones.slate, className)}>
      {children}
    </span>
  );
}

// ------------------------------------------------------------ Loading / Empty
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('h-6 w-6 animate-spin text-slate-400', className)} />;
}

export function PageLoading({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-400">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Empty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-[#10130f]/50 px-6 py-14 text-center">
      <span className="text-base font-semibold text-slate-400">{title}</span>
      {description && <span className="text-sm text-slate-400">{description}</span>}
      {action}
    </div>
  );
}

// ------------------------------------------------------------ Tabs
export function Tabs({ tabs, active, onChange }: {
  tabs: Array<{ key: string; label: string; count?: number }>;
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-white/10 p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={clsx(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            active === t.key ? 'bg-[#181c20] text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-100',
          )}
        >
          {t.label}
          {typeof t.count === 'number' && t.count > 0 && (
            <span className="ms-1.5 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ Switch
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-slate-300"
    >
      <span className={clsx('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-emerald-500/100' : 'bg-slate-300')}>
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-[#181c20] shadow transition-all', checked ? 'start-[22px]' : 'start-0.5')} />
      </span>
      {label}
    </button>
  );
}
