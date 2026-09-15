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
      {/* ───── هیرو: نمایش گرافیکی چیپ مدار ───── */}
      <CircuitHero />

      {/* ───── عنوان ───── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h1 className="text-2xl font-black text-slate-50">ثبت‌نام در کارزینتل</h1>
        <p className="mt-1.5 text-sm text-slate-400">
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

/* ───────────────────────────────────────────────────────────────────────────
 * هیرو گرافیکی چیپ مدار
 *
 * یک نمایش بصری واقعی از چیپ مدار (chip on PCB) با padهای لحیم،
 * خطوط trace، نور teal از زیر چیپ. این با موضوع "قطعات الکترونیک"
 * فروشگاه کارزینتل مرتبط است و یک متمایزکننده از طراحی‌های generic است.
 *
 * فقط یک موشن: "power-on" sequence هنگام load — چیپ روشن می‌شود.
 * ─────────────────────────────────────────────────────────────────────────── */
function CircuitHero() {
  return (
    <div className="relative mb-6 flex h-32 items-center justify-center">
      {/* نور پس‌زمینه چیپ */}
      <div
        className="absolute h-24 w-32 rounded-full opacity-60 blur-2xl"
        style={{
          background: 'radial-gradient(ellipse, #14b8a6 0%, transparent 70%)',
          animation: 'circuit-power-on 1.4s ease-out',
        }}
      />

      {/* چیپ SVG */}
      <motion.svg
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative h-24 w-32"
        viewBox="0 0 160 120"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* خطوط مدار (traces) */}
        <g stroke="#14b8a6" strokeWidth="0.8" fill="none" opacity="0.5">
          <path d="M 20 30 L 50 30" />
          <path d="M 110 30 L 140 30" />
          <path d="M 20 60 L 50 60" />
          <path d="M 110 60 L 140 60" />
          <path d="M 20 90 L 50 90" />
          <path d="M 110 90 L 140 90" />
          {/* خطوط عمودی به چیپ */}
          <path d="M 50 30 L 50 20 L 80 20 L 80 40" />
          <path d="M 110 30 L 110 20 L 80 20" opacity="0" />
          <path d="M 50 90 L 50 100 L 80 100 L 80 80" />
          <path d="M 110 90 L 110 100 L 80 100" opacity="0" />
        </g>

        {/* پدهای لحیم */}
        <g fill="#06b6d4">
          {[
            [20, 30], [20, 60], [20, 90],
            [140, 30], [140, 60], [140, 90],
          ].map(([x, y], i) => (
            <rect key={i} x={x - 2.5} y={y - 2} width="5" height="4" rx="0.5" />
          ))}
        </g>

        {/* خود چیپ (rect با corner cut) */}
        <motion.path
          d="M 50 25 L 110 25 L 115 30 L 115 90 L 110 95 L 50 95 L 45 90 L 45 30 Z"
          fill="#0a1419"
          stroke="#14b8a6"
          strokeWidth="1"
          initial={{ strokeOpacity: 0.2 }}
          animate={{ strokeOpacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />

        {/* متن روی چیپ (نشان کیفی) */}
        <motion.text
          x="80"
          y="55"
          textAnchor="middle"
          fontSize="7"
          fill="#14b8a6"
          fontFamily="monospace"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          KARZ
        </motion.text>
        <motion.text
          x="80"
          y="68"
          textAnchor="middle"
          fontSize="5"
          fill="#06b6d4"
          fontFamily="monospace"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          INTELL
        </motion.text>

        {/* dotهای نقاط اتصال روی چیپ */}
        <g fill="#14b8a6">
          {[35, 55, 75, 95].map((y) => (
            <circle key={y} cx="45" cy={y} r="1" />
          ))}
          {[35, 55, 75, 95].map((y) => (
            <circle key={y} cx="115" cy={y} r="1" />
          ))}
        </g>
      </motion.svg>

      <style>{`
        @keyframes circuit-power-on {
          0% { opacity: 0; transform: scale(0.6); }
          60% { opacity: 0.9; transform: scale(1.1); }
          100% { opacity: 0.6; transform: scale(1); }
        }
      `}</style>
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
