'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, Headphones } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast, useAuthStore } from '@/lib/auth-store';
import { Button, Field, Input } from '@/components/ui';
import { normalizeDigits } from '@/lib/format';
import { CaptchaField, CaptchaValue } from '@/components/captcha';
import { GoogleButton } from '@/components/google-button';

/**
 * صفحه ثبت‌نام کارزینتل
 *
 * Design choice: هیرو تصویری — یک قطعهٔ الکترونیک از نزدیک
 * (چیپ مدار با padهای لحیم، خطوط trace، نور cyan/teal از زیر)
 * به‌جای آیکن‌های شناور کلیشه‌ای. این با موضوع فروشگاه (قطعات و گجت)
 * و لوگو (badge teal/cyan) هماهنگ است.
 *
 * Principles:
 * - یک لحظه موشن (page load sequence)، نه scattered animations
 * - Active voice در کپی، sentence case، no filler
 * - تایپوگرافی Vazirmatn با scale واضح
 * - CTA دقیقاً می‌گوید چه اتفاقی می‌افتد: "ثبت‌نام" → "ثبت‌نام شدید"
 * - خطا دقیق و قابل عمل
 */
function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';
  const { setAuth } = useAuthStore();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '' });
  const [captcha, setCaptcha] = useState<CaptchaValue>({ captchaId: '', captchaAnswer: '' });
  const [captchaRefresh, setCaptchaRefresh] = useState(0);

  const submit = async () => {
    if (!form.fullName.trim()) return toast.error('نام و نام خانوادگی لازم است');
    if (!form.phone && !form.email) return toast.error('موبایل یا ایمیل لازم است');
    if (form.password.length < 8) return toast.error('رمز عبور باید حداقل ۸ کاراکتر باشد');
    setSending(true);
    try {
      // ثبت‌نام موفق ولی کاربر pending است → ادمین باید تأیید کند
      await api('/auth/register', {
        method: 'POST',
        body: {
          fullName: form.fullName,
          phone: form.phone ? normalizeDigits(form.phone) : undefined,
          email: form.email || undefined,
          password: form.password,
          ...captcha,
        },
        auth: false,
      });
      toast.success('ثبت‌نام شدید');
      toast.info('پس از تأیید مدیر می‌توانید وارد شوید');
      setTimeout(() => router.replace('/login?registered=1'), 1500);
    } catch (e: any) {
      toast.error(e?.message || 'خطا در ثبت‌نام');
      setCaptchaRefresh((k) => k + 1);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* ───── عنوان ───── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h1 className="text-2xl font-black text-slate-50">ثبت‌نام در کارزینتل</h1>
        <p className="mt-1.5 text-sm text-slate-300">
          حساب کاربری بسازید تا به دنیای گجت‌های اصل وصل شوید
        </p>
      </motion.div>

      {/* ───── پیام سیاست ───── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mt-5 mb-4 rounded-xl border px-4 py-2.5 text-xs"
        style={{
          borderColor: 'rgba(245, 158, 11, 0.3)',
          background: 'rgba(245, 158, 11, 0.08)',
          color: '#fcd34d',
        }}
      >
        بعد از ثبت‌نام، مدیر حساب شما را تأیید می‌کند. این یک سیاست امنیتی فروشگاه است.
      </motion.div>

      {/* ───── فرم ───── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <Field label="نام و نام خانوادگی" required>
          <Input
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className="border-slate-700/50 bg-slate-900/40 text-slate-100 placeholder:text-slate-600 focus:border-teal-500/50"
            placeholder="مثلاً علی محمدی"
          />
        </Field>
        <Field label="موبایل" hint="برای اطلاع‌رسانی سفارش">
          <Input
            dir="ltr"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="09xxxxxxxxx"
            className="border-slate-700/50 bg-slate-900/40 text-slate-100 placeholder:text-slate-600 focus:border-teal-500/50"
          />
        </Field>
        <Field label="ایمیل (اختیاری)">
          <Input
            dir="ltr"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            className="border-slate-700/50 bg-slate-900/40 text-slate-100 placeholder:text-slate-600 focus:border-teal-500/50"
          />
        </Field>
        <Field label="رمز عبور" required hint="حداقل ۸ کاراکتر">
          <Input
            dir="ltr"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="border-slate-700/50 bg-slate-900/40 text-slate-100 placeholder:text-slate-600 focus:border-teal-500/50"
          />
        </Field>
        <CaptchaField value={captcha} onChange={setCaptcha} refreshKey={captchaRefresh} />
        <Button
          className="w-full !bg-teal-500 !text-slate-900 hover:!bg-teal-400"
          size="lg"
          onClick={submit}
          loading={sending}
        >
          {!sending && <Zap className="h-4 w-4" />}
          ثبت‌نام
        </Button>

        {/* جداکننده "یا" */}
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-transparent px-3 text-2xs text-slate-500">یا</span>
          </div>
        </div>

        <GoogleButton label="ثبت‌نام با گوگل" variant="register" />

        <div className="text-center text-sm text-slate-400">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-teal-400 underline hover:text-teal-300">
            وارد شوید
          </Link>
        </div>
      </motion.div>

      {/* ───── سه ویژگی در یک خط ───── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 flex justify-center gap-6 text-2xs text-slate-500"
      >
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
          احراز ۲ مرحله‌ای
        </span>
        <span className="flex items-center gap-1.5">
          <Headphones className="h-3.5 w-3.5 text-teal-500" />
          پشتیبانی ۲۴/۷
        </span>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
