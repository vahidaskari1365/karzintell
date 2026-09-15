'use client';

/* ==========================================================================
   ثبت درخواست فروشندگی (Become a Seller)
   --------------------------------------------------------------------------
   - فرم: نام فروشگاه، توضیحات، تلفن، ایمیل، آدرس، کد اقتصادی، شماره ثبت،
     شناسه ملی
   - نمایش مزایای فروشندگی
   - پس از ارسال موفق → هدایت به /vendor/profile
   - اگر کاربر قبلاً فروشنده‌ی تأییدشده است → هدایت به /vendor
   - در صورت تکرار درخواست (409) → پیام مناسب نمایش داده می‌شود
   ========================================================================== */

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck, Package, Send, ShoppingBag, Store, TrendingUp, Users,
} from 'lucide-react';
import { api, type ApiError } from '@/lib/api-client';
import { normalizeDigits } from '@/lib/format';
import { toast, hasPermission, useAuthStore } from '@/lib/auth-store';
import { Button, Card, Field, Input, Textarea } from '@/components/ui';
import { PageHeader } from '../_shared';

interface ApplyPayload {
  storeName: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  economicCode?: string;
  registrationNumber?: string;
  nationalId?: string;
}

const BENEFITS = [
  { icon: Package, title: 'مدیریت محصولات', desc: 'محصولات خود را اضافه، ویرایش و قیمت‌گذاری کنید' },
  { icon: ShoppingBag, title: 'پیگیری سفارش‌ها', desc: 'سفارش‌های محصولات خود را به‌صورت زنده ببینید' },
  { icon: TrendingUp, title: 'گزارش فروش', desc: 'درآمد خالص، کمیسیون و آمار فروش را دنبال کنید' },
  { icon: Users, title: 'دسترسی به مشتریان', desc: 'به هزاران مشتری کارزینتل دسترسی پیدا کنید' },
];

export default function VendorApplyPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const toastHelper = { success: toast.success, error: toast.error, info: toast.info };

  // اگر کاربر از قبل فروشنده‌ی تأییدشده است → هدایت به پنل
  useEffect(() => {
    if (hydrated && user && hasPermission(user, 'seller.dashboard')) {
      router.replace('/vendor');
    }
  }, [hydrated, user, router]);

  const [s, setS] = useState<ApplyPayload>({
    storeName: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    economicCode: '',
    registrationNumber: '',
    nationalId: '',
  });

  const set = <K extends keyof ApplyPayload>(k: K, v: ApplyPayload[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  const submit = useMutation({
    mutationFn: async () => {
      const payload: ApplyPayload = {
        storeName: s.storeName.trim(),
        description: s.description?.trim() || undefined,
        phone: s.phone ? normalizeDigits(s.phone).trim() : undefined,
        email: s.email?.trim().toLowerCase() || undefined,
        address: s.address?.trim() || undefined,
        economicCode: s.economicCode?.trim() || undefined,
        registrationNumber: s.registrationNumber?.trim() || undefined,
        nationalId: s.nationalId?.trim() || undefined,
      };
      if (!payload.storeName) throw new Error('نام فروشگاه الزامی است');
      return api('/seller/apply', { method: 'POST', body: payload });
    },
    onSuccess: () => {
      toastHelper.success('درخواست فروشندگی شما ثبت شد');
      router.push('/vendor/profile');
    },
    onError: (e: unknown) => {
      const err = e as ApiError;
      // 409 — درخواست تکراری (pending یا rejected)
      if (err?.status === 409 || err?.code === 'SELLER_PROFILE_EXISTS') {
        toastHelper.info(err.message || 'شما قبلاً درخواست فروشندگی ثبت کرده‌اید');
      } else {
        toastHelper.error(err?.message || 'ثبت درخواست ناموفق بود');
      }
    },
  });

  return (
    <div>
      <PageHeader
        title="ثبت درخواست فروشندگی"
        subtitle="فرم زیر را تکمیل کنید تا فروشگاه شما در کارزینتل راه‌اندازی شود"
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* مزایای فروشندگی */}
        <div className="space-y-3 lg:col-span-1">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <Store className="h-5 w-5" />
              </span>
              <p className="text-sm font-bold text-slate-100">چرا فروشنده‌ی کارزینتل شویم؟</p>
            </div>
            <ul className="space-y-3">
              {BENEFITS.map((b) => {
                const Icon = b.icon;
                return (
                  <motion.li
                    key={b.title}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-emerald-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{b.title}</p>
                      <p className="text-2xs leading-5 text-slate-400">{b.desc}</p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-2xs text-emerald-200">
              <BadgeCheck className="h-4 w-4 shrink-0" />
              پس از تأیید توسط مدیریت، به پنل کامل فروشنده دسترسی خواهید داشت.
            </div>
          </Card>
        </div>

        {/* فرم درخواست */}
        <div className="lg:col-span-2">
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نام فروشگاه" required hint="حداقل ۳ کاراکتر">
                <Input
                  value={s.storeName}
                  onChange={(e) => set('storeName', e.target.value)}
                  placeholder="مثلاً: فروشگاه دیجیتال پارس"
                />
              </Field>
              <Field label="تلفن فروشگاه" hint="09xxxxxxxxx">
                <Input
                  dir="ltr"
                  value={s.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="09123456789"
                />
              </Field>
              <Field label="ایمیل فروشگاه">
                <Input
                  dir="ltr"
                  type="email"
                  value={s.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="store@example.com"
                />
              </Field>
              <Field label="کد اقتصادی" hint="اختیاری">
                <Input
                  dir="ltr"
                  value={s.economicCode}
                  onChange={(e) => set('economicCode', e.target.value)}
                />
              </Field>
              <Field label="شماره ثبت" hint="اختیاری">
                <Input
                  dir="ltr"
                  value={s.registrationNumber}
                  onChange={(e) => set('registrationNumber', e.target.value)}
                />
              </Field>
              <Field label="شناسه ملی / کد ملی" hint="اختیاری">
                <Input
                  dir="ltr"
                  value={s.nationalId}
                  onChange={(e) => set('nationalId', e.target.value)}
                />
              </Field>
            </div>

            <Field label="درباره فروشگاه" hint="معرفی کوتاه فروشگاه و نوع فعالیت">
              <Textarea
                rows={3}
                value={s.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="فروشگاه ما در زمینه‌ی لوازم جانبی موبایل فعالیت می‌کند…"
              />
            </Field>

            <Field label="آدرس فروشگاه" hint="برای فاکتور و مراسلات">
              <Textarea
                rows={2}
                value={s.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="استان، شهر، خیابان، پلاک…"
              />
            </Field>

            <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-4">
              <p className="text-2xs leading-5 text-slate-400">
                با ثبت درخواست، شرایط فروشندگی کارزینتل را می‌پذیرید. پس از تأیید،
                نرخ کمیسیون پیش‌فرض ۵٪ اعمال می‌شود (قابل تغییر توسط مدیریت).
              </p>
              <Button onClick={() => submit.mutate()} loading={submit.isPending} disabled={!s.storeName.trim()}>
                <Send className="h-4 w-4" /> ثبت درخواست
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
