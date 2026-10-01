'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Field, Input } from '@/components/ui';

export interface CaptchaValue {
  captchaId: string;
  captchaAnswer: string;
}

/** کپچای عددی — خودش از سرور سؤال می‌گیرد و مقدار را بیرون می‌دهد */
export function CaptchaField({ value, onChange, refreshKey }: { value: CaptchaValue; onChange: (v: CaptchaValue) => void; refreshKey?: number }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api<{ captchaId: string; question: string }>('/auth/captcha');
      if (mounted.current) {
        setQuestion(data.question);
        onChange({ captchaId: data.captchaId, captchaAnswer: '' });
      }
    } catch {
      if (mounted.current) setQuestion('خطا در دریافت کپچا');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load, refreshKey]);

  return (
    <Field label="کد امنیتی (ضد ربات)" required hint="به عدد پاسخ دهید">
      <div className="flex items-center gap-2">
        <div className="flex min-w-36 items-center justify-between rounded-xl border border-white/10 bg-[#10130f] px-3 py-2.5 text-sm font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            {loading ? '…' : question}
          </span>
          <button type="button" onClick={load} className="text-slate-400 hover:text-slate-300" title="کپچای جدید">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <Input
          dir="ltr"
          inputMode="numeric"
          className="w-24 text-center"
          placeholder="؟"
          value={value.captchaAnswer}
          onChange={(e) => onChange({ ...value, captchaAnswer: e.target.value })}
        />
      </div>
    </Field>
  );
}
