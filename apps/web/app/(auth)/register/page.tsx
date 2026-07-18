'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api } from '@/lib/api-client';
import { toast, useAuthStore } from '@/lib/auth-store';
import { Button, Field, Input } from '@/components/ui';
import { normalizeDigits } from '@/lib/format';

function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';
  const { setAuth } = useAuthStore();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '' });

  const submit = async () => {
    if (!form.fullName.trim()) return toast.error('نام و نام خانوادگی لازم است');
    if (!form.phone && !form.email) return toast.error('موبایل یا ایمیل لازم است');
    setSending(true);
    try {
      const { data } = await api<{ accessToken: string; user: any }>('/auth/register', {
        method: 'POST',
        body: {
          fullName: form.fullName,
          phone: form.phone ? normalizeDigits(form.phone) : undefined,
          email: form.email || undefined,
          password: form.password,
        },
        auth: false,
      });
      setAuth(data.accessToken, data.user);
      toast.success('ثبت‌نام شما با موفقیت انجام شد');
      router.replace(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-black text-slate-900">ثبت‌نام در کارزینتل</h1>
      <p className="mb-6 text-sm text-slate-400">در چند ثانیه حساب خود را بسازید</p>

      <div className="space-y-4">
        <Field label="نام و نام خانوادگی" required>
          <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        </Field>
        <Field label="موبایل" hint="برای ورود با پیامک و اطلاع‌رسانی سفارش">
          <Input dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="09xxxxxxxxx" />
        </Field>
        <Field label="ایمیل (اختیاری)">
          <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
        </Field>
        <Field label="رمز عبور" required hint="حداقل ۸ کاراکتر">
          <Input dir="ltr" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </Field>
        <Button className="w-full" size="lg" onClick={submit} loading={sending}>
          ثبت‌نام
        </Button>
        <div className="text-center text-sm text-slate-500">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-slate-900 underline">وارد شوید</Link>
        </div>
      </div>
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
