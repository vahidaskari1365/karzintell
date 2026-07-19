'use client';

import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useToastStore } from '@/lib/auth-store';

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <XCircle className="h-5 w-5 text-rose-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

export function Toaster() {
  const { toasts, remove } = useToastStore();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          className={clsx(
            'flex cursor-pointer items-center gap-2.5 rounded-xl border bg-[#181c20] px-4 py-3 text-sm shadow-lg',
            t.kind === 'success' && 'border-emerald-400/30',
            t.kind === 'error' && 'border-rose-400/30',
            t.kind === 'info' && 'border-blue-400/30',
          )}
        >
          {icons[t.kind]}
          <span className="text-slate-300">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
