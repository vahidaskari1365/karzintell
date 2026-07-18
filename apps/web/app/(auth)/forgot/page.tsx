'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/auth-store';
import { Button, Field, Input } from '@/components/ui';
import { normalizeDigits } from '@/lib/format';
import { CaptchaField, CaptchaValue } from '@/components/captcha';

export default function ForgotPage() {
  const router = useRouter();
  const [step, setStep] = useState<'send' | 'reset'>('send');
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ identifier: '', code: '', newPassword: '' });
  const [devCode, setDevCode] = useState('');

  const isEmail = form.identifier.includes('@');
  const channel = isEmail ? 'email' : 'phone';

  const [captcha, setCaptcha] = useState<CaptchaValue>({ captchaId: '', captchaAnswer: '' });
  const [captchaRefresh, setCaptchaRefresh] = useState(0);

  const send = async () => {
    if (!captcha.captchaAnswer.trim()) return toast.error('پاسخ کپچا را وارد کنید');
    setSending(true);
    try {
      const { data } = await api<{ devCode?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { channel, target: form.identifier.trim(), purpose: 'reset_password', ...captcha },
        auth: false,
      });
      setStep('reset');
      if (data.devCode) setDevCode(data.devCode);
      toast.success('کد بازنشانی ارسال شد');
    } catch (e) {
      toast.error((e as Error).message);
      setCaptchaRefresh((k) => k + 1);
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    setSending(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: {
          channel,
          target: form.identifier.trim(),
          code: normalizeDigits(form.code),
          newPassword: form.newPassword,
        },
        auth: false,
      });
      toast.success('رمز عبور با موفقیت تغییر کرد — حالا وارد شوید');
      router.replace('/login');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-black text-slate-900">فراموشی رمز عبور</h1>
      <p className="mb-6 text-sm text-slate-400">کد تأیید به موبایل یا ایمیل شما ارسال می‌شود</p>

      <div className="space-y-4">
        <Field label="موبایل یا ایمیل" required>
          <Input dir="ltr" value={form.identifier} onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))} disabled={step === 'reset'} />
        </Field>

        {step === 'reset' && (
          <>
            <Field label="کد ۵ رقمی" required>
              <Input dir="ltr" inputMode="numeric" maxLength={5} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="text-center text-lg tracking-[0.5em]" />
            </Field>
            {devCode && <p className="rounded-xl bg-amber-50 p-2.5 text-center text-xs text-amber-700">حالت توسعه — کد: <b dir="ltr">{devCode}</b></p>}
            <Field label="رمز عبور جدید" required hint="حداقل ۸ کاراکتر">
              <Input dir="ltr" type="password" value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} />
            </Field>
          </>
        )}

        {step === 'send' && <CaptchaField value={captcha} onChange={setCaptcha} refreshKey={captchaRefresh} />}

        <Button className="w-full" size="lg" loading={sending} onClick={step === 'send' ? send : reset} disabled={!form.identifier.trim()}>
          {step === 'send' ? 'ارسال کد' : 'تغییر رمز عبور'}
        </Button>
        <div className="text-center">
          <Link href="/login" className="text-xs text-slate-400 underline">بازگشت به ورود</Link>
        </div>
      </div>
    </div>
  );
}
