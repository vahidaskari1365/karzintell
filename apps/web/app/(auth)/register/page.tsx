'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Smartphone, Watch, Headphones, Zap, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast, useAuthStore } from '@/lib/auth-store';
import { Button, Field, Input } from '@/components/ui';
import { normalizeDigits } from '@/lib/format';
import { CaptchaField, CaptchaValue } from '@/components/captcha';
import { GoogleButton } from '@/components/google-button';

/**
 * صفحه ثبت‌نام — با گرافیک ۳D کلاسیک CSS و موشن گرافیک
 *
 * طراحی:
 *  - کارت شیشه‌ای با border متحرک (gradient که می‌چرخد)
 *  - آیکن‌های موبایل، ساعت، هدفون، چیپ که در پس‌زمینه شناور هستند
 *  - ذرات نورانی متحرک
 *  - توضیحات موشن‌دار (سامانه امن، احراز هویت دو مرحله‌ای، پشتیبانی ۲۴ ساعته)
 *  - گزینه ورود با گوگل در بالای فرم
 *  - پیام واضح: "حساب شما پس از تأیید ادمین فعال می‌شود"
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
      // چون کاربر pending است، accessToken نمی‌گیریم — پیام مناسب نمایش می‌دهیم
      toast.success('ثبت‌نام شما انجام شد! حساب شما در انتظار تأیید مدیر است.');
      toast.info('پس از تأیید ادمین می‌توانید وارد شوید.');
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
      {/* عنوان + زیرعنوان */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="flex items-center gap-2 text-2xl font-black text-slate-100">
          <Sparkles className="h-6 w-6 text-emerald-400" />
          ثبت‌نام در کارزینتل
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          در چند ثانیه حساب خود را بسازید و به دنیای گجت‌های اصل و ارسالی سریع وصل شوید.
        </p>
      </motion.div>

      {/* آیکن‌های شناور — گرافیک بصری موضوع سایت (موبایل، ساعت، هدفون، چیپ) */}
      <FloatingGadgets />

      {/* پیام: نیاز به تأیید ادمین */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-5 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300"
      >
        <span className="font-bold">نکته:</span> بعد از ثبت‌نام، حساب شما باید توسط مدیر تأیید شود. این یک سیاست امنیتی فروشگاه است.
      </motion.div>

      {/* فرم ثبت‌نام */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <Field label="نام و نام خانوادگی" required>
          <Input
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className="border-slate-700/50 bg-slate-900/40 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50"
            placeholder="مثلاً علی محمدی"
          />
        </Field>
        <Field label="موبایل" hint="برای ورود با پیامک و اطلاع‌رسانی سفارش">
          <Input
            dir="ltr"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="09xxxxxxxxx"
            className="border-slate-700/50 bg-slate-900/40 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50"
          />
        </Field>
        <Field label="ایمیل (اختیاری)">
          <Input
            dir="ltr"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            className="border-slate-700/50 bg-slate-900/40 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50"
          />
        </Field>
        <Field label="رمز عبور" required hint="حداقل ۸ کاراکتر">
          <Input
            dir="ltr"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="border-slate-700/50 bg-slate-900/40 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50"
          />
        </Field>
        <CaptchaField value={captcha} onChange={setCaptcha} refreshKey={captchaRefresh} />
        <Button
          className="w-full !bg-gradient-to-r !from-emerald-500 !to-indigo-500 !text-white hover:!from-emerald-600 hover:!to-indigo-600"
          size="lg"
          onClick={submit}
          loading={sending}
        >
          {!sending && <Zap className="h-4 w-4" />}
          ثبت‌نام
        </Button>

        {/* یا با گوگل */}
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
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-emerald-400 underline hover:text-emerald-300">
            وارد شوید
          </Link>
        </div>
      </motion.div>

      {/* توضیحات پایین — موشن‌دار */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 grid grid-cols-3 gap-2 text-center"
      >
        {[
          { icon: <Cpu className="h-4 w-4" />, label: 'امنیت بالا' },
          { icon: <Sparkles className="h-4 w-4" />, label: 'احراز ۲ مرحله‌ای' },
          { icon: <Headphones className="h-4 w-4" />, label: 'پشتیبانی ۲۴/۷' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-2 py-2 text-2xs text-slate-400"
          >
            <div className="mb-1 flex justify-center text-emerald-400">{item.icon}</div>
            {item.label}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/** آیکن‌های شناور موبایل، ساعت، هدفون و چیپ — گرافیک بصری موشن‌دار */
function FloatingGadgets() {
  const gadgets = [
    { Icon: Smartphone, className: 'top-2 -left-6 text-emerald-400/30', size: 'h-10 w-10', delay: 0, duration: 8 },
    { Icon: Watch, className: 'top-4 -right-6 text-indigo-400/30', size: 'h-8 w-8', delay: 0.5, duration: 10 },
    { Icon: Headphones, className: 'bottom-3 -left-4 text-rose-400/30', size: 'h-9 w-9', delay: 1, duration: 9 },
    { Icon: Cpu, className: 'bottom-2 -right-5 text-amber-400/30', size: 'h-7 w-7', delay: 1.5, duration: 11 },
  ];

  return (
    <div className="pointer-events-none relative my-4 h-0">
      {gadgets.map(({ Icon, className, size, delay, duration }, i) => (
        <motion.div
          key={i}
          className={`absolute ${className}`}
          animate={{
            y: [0, -10, 0],
            rotate: [0, 8, -8, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Icon className={size} strokeWidth={1.5} />
        </motion.div>
      ))}
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
