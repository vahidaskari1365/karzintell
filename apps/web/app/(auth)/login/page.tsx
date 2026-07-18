'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { MessageSquare, KeyRound, Smartphone } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast, useAuthStore } from '@/lib/auth-store';
import { Button, Field, Input, Tabs } from '@/components/ui';
import { CaptchaField, CaptchaValue } from '@/components/captcha';
import { normalizeDigits } from '@/lib/format';

type LoginResult = { accessToken?: string; user?: any; requireTwoFactor?: boolean; ticket?: string };

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState<'send' | 'verify'>('send');
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ identifier: '', password: '', code: '' });
  const [devCode, setDevCode] = useState('');
  const [captcha, setCaptcha] = useState<CaptchaValue>({ captchaId: '', captchaAnswer: '' });
  const [captchaRefresh, setCaptchaRefresh] = useState(0);
  // ورود دومرحله‌ای
  const [tfaTicket, setTfaTicket] = useState<string | null>(null);
  const [tfaCode, setTfaCode] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: normalizeDigits(v) }));

  const isEmail = form.identifier.includes('@');
  const channel = isEmail ? 'email' : 'phone';

  const doLogin = async () => {
    setSending(true);
    try {
      const { data } = await api<LoginResult>('/auth/login', {
        method: 'POST',
        body: { identifier: form.identifier, password: form.password },
        auth: false,
      });
      if (data.requireTwoFactor && data.ticket) {
        setTfaTicket(data.ticket);
        toast.info('کد اپلیکیشن تأیید (ورود دومرحله‌ای) را وارد کنید');
        return;
      }
      setAuth(data.accessToken!, data.user);
      toast.success(`خوش آمدید ${data.user.fullName}`);
      router.replace(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const verifyTfa = async () => {
    setSending(true);
    try {
      const { data } = await api<{ accessToken: string; user: any }>('/auth/2fa/verify', {
        method: 'POST',
        body: { ticket: tfaTicket, code: normalizeDigits(tfaCode) },
        auth: false,
      });
      setAuth(data.accessToken, data.user);
      toast.success(`خوش آمدید ${data.user.fullName}`);
      router.replace(next);
    } catch (e) {
      toast.error((e as Error).message);
      if ((e as Error).message.includes('مهلت')) setTfaTicket(null);
    } finally {
      setSending(false);
    }
  };

  const sendOtp = async () => {
    if (!form.identifier.trim()) return toast.error('موبایل یا ایمیل را وارد کنید');
    if (!captcha.captchaAnswer.trim()) return toast.error('پاسخ کپچا را وارد کنید');
    setSending(true);
    try {
      const { data } = await api<{ sent: boolean; devCode?: string }>('/auth/otp/send', {
        method: 'POST',
        body: { channel, target: form.identifier.trim(), purpose: 'login', ...captcha },
        auth: false,
      });
      setOtpStep('verify');
      if (data.devCode) setDevCode(data.devCode);
      toast.success('کد تأیید ارسال شد');
    } catch (e) {
      toast.error((e as Error).message);
      setCaptchaRefresh((k) => k + 1); // کپچای جدید
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    setSending(true);
    try {
      const { data } = await api<{ accessToken: string; user: any }>('/auth/otp/verify', {
        method: 'POST',
        body: { channel, target: form.identifier.trim(), code: form.code, purpose: 'login' },
        auth: false,
      });
      setAuth(data.accessToken, data.user);
      toast.success(`خوش آمدید ${data.user.fullName}`);
      router.replace(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-black text-slate-900">ورود به حساب</h1>
      <p className="mb-6 text-sm text-slate-400">با رمز عبور یا کد یک‌بارمصرف وارد شوید</p>

      <Tabs
        tabs={[{ key: 'password', label: 'با رمز عبور' }, { key: 'otp', label: 'با پیامک/ایمیل' }]}
        active={mode}
        onChange={(k) => setMode(k as typeof mode)}
      />

      <div className="mt-6 space-y-4">
        {/* مرحله ورود دومرحله‌ای */}
        {tfaTicket ? (
          <>
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-center text-sm text-blue-800">
              <Smartphone className="mx-auto mb-2 h-8 w-8" />
              ورود دومرحله‌ای فعال است — کد ۶ رقمی اپلیکیشن تأیید (Google Authenticator) را وارد کنید
            </div>
            <Field label="کد تأیید هویت" required>
              <Input dir="ltr" inputMode="numeric" maxLength={6} value={tfaCode} onChange={(e) => setTfaCode(normalizeDigits(e.target.value))} className="text-center text-lg tracking-[0.5em]" onKeyDown={(e) => e.key === 'Enter' && verifyTfa()} autoFocus />
            </Field>
            <Button className="w-full" size="lg" onClick={verifyTfa} loading={sending} disabled={tfaCode.length !== 6}>
              تأیید و ورود
            </Button>
            <div className="text-center">
              <button onClick={() => { setTfaTicket(null); setTfaCode(''); }} className="text-xs text-slate-400 underline hover:text-slate-700">بازگشت به ورود</button>
            </div>
          </>
        ) : (
          <>
            <Field label="موبایل یا ایمیل" required>
              <Input dir="ltr" value={form.identifier} onChange={(e) => set('identifier', e.target.value)} placeholder="09xxxxxxxxx یا email@example.com" />
            </Field>

            {mode === 'password' ? (
              <>
                <Field label="رمز عبور" required>
                  <Input dir="ltr" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doLogin()} />
                </Field>
                <Button className="w-full" size="lg" onClick={doLogin} loading={sending}>
                  <KeyRound className="h-4.5 w-4.5" /> ورود
                </Button>
                <div className="text-center">
                  <Link href="/forgot" className="text-xs text-slate-400 underline hover:text-slate-700">رمز عبور را فراموش کرده‌ام</Link>
                </div>
              </>
            ) : otpStep === 'send' ? (
              <>
                <CaptchaField value={captcha} onChange={setCaptcha} refreshKey={captchaRefresh} />
                <Button className="w-full" size="lg" onClick={sendOtp} loading={sending}>
                  <MessageSquare className="h-4.5 w-4.5" /> ارسال کد تأیید
                </Button>
              </>
            ) : (
          <>
            <Field label={`کد ارسال‌شده به ${form.identifier}`} required>
              <Input dir="ltr" inputMode="numeric" maxLength={5} value={form.code} onChange={(e) => set('code', e.target.value)} className="text-center text-lg tracking-[0.5em]" onKeyDown={(e) => e.key === 'Enter' && verifyOtp()} />
            </Field>
            {devCode && (
              <p className="rounded-xl bg-amber-50 p-2.5 text-center text-xs text-amber-700">حالت توسعه — کد: <b dir="ltr">{devCode}</b></p>
            )}
            <Button className="w-full" size="lg" onClick={verifyOtp} loading={sending} disabled={form.code.length !== 5}>
              تأیید و ورود
            </Button>
            <button onClick={() => setOtpStep('send')} className="w-full text-center text-xs text-slate-400 underline">ارسال مجدد</button>
          </>
        )}
          </>
        )}

        <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          حساب ندارید؟{' '}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-bold text-slate-900 underline">ثبت‌نام کنید</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
