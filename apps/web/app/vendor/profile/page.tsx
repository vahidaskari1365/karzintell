'use client';

/* ==========================================================================
   پروفایل فروشندگی
   --------------------------------------------------------------------------
   نمایش وضعیت پروفایل فروشنده بر اساس status:
   - approved   → فرم قابل ویرایش (PATCH /seller/profile)
   - pending    → بنر «در انتظار بررسی» + نمایش فقط‌خواندنی اطلاعات
   - rejected   → دلیل رد + دکمه ثبت مجدد درخواست
   - suspended  → پیام تعلیق
   - بدون پروفایل / بدون مجوز → فراخوان به ثبت درخواست فروشندگی
   ========================================================================== */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Store, UserCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faDateTime, faNumber } from '@/lib/format';
import { hasPermission, useAuthStore } from '@/lib/auth-store';
import { Button, Card, Field, Input, Textarea } from '@/components/ui';
import {
  PageHeader, PageLoading, Pill, SellerStatusBanner, useSellerProfile, useVendorToast,
  VendorImageUpload, SELLER_STATUS_LABELS,
  type SellerProfile, type SellerStatus,
} from '../_shared';

export default function VendorProfilePage() {
  const { user } = useAuthStore();
  const profileQ = useSellerProfile();

  // اگر کاربر مجوز seller.profile.manage ندارد (یعنی هنوز فروشنده‌ی تأییدشده نیست)
  const canManage = !!user && hasPermission(user, 'seller.profile.manage');

  if (!user) return <PageLoading label="در حال انتقال به صفحه ورود…" />;

  // کاربری که هنوز نقش seller ندارد → فراخوان به ثبت درخواست
  if (!canManage) {
    return (
      <div>
        <PageHeader title="پروفایل فروشندگی" />
        <div className="mx-auto max-w-xl py-6">
          <div className="rounded-3xl border border-white/10 bg-[#181c20] p-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <Store className="h-8 w-8" />
            </span>
            <h2 className="mt-5 text-lg font-black text-slate-100">به فروشنده‌ی کارزینتل بپیوندید</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              برای راه‌اندازی فروشگاه خود در کارزینتل، فرم درخواست فروشندگی را تکمیل کنید.
              پس از تأیید توسط مدیریت، می‌توانید محصولات خود را عرضه کنید.
            </p>
            <p className="mt-1 text-2xs text-slate-500">
              اگر قبلاً درخواست داده‌اید، در حال بررسی است — به‌زودی نتیجه اعلام می‌شود.
            </p>
            <div className="mt-6">
              <Link href="/vendor/apply">
                <Button><Store className="h-4 w-4" /> ثبت درخواست فروشندگی</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profileQ.isLoading) return <PageLoading />;
  if (profileQ.isError) {
    return (
      <div>
        <PageHeader title="پروفایل فروشندگی" />
        <Card className="p-6 text-center text-sm text-rose-300">
          خطا در بارگذاری پروفایل. لطفاً دوباره تلاش کنید.
        </Card>
      </div>
    );
  }

  const profile = profileQ.data;

  // پروفایل وجود ندارد (404) → فراخوان به ثبت درخواست
  if (!profile) {
    return (
      <div>
        <PageHeader title="پروفایل فروشندگی" />
        <Card className="p-8 text-center">
          <UserCircle className="mx-auto h-12 w-12 text-slate-500" />
          <p className="mt-4 text-sm text-slate-400">شما هنوز پروفایل فروشندگی ندارید.</p>
          <div className="mt-4">
            <Link href="/vendor/apply">
              <Button><Store className="h-4 w-4" /> ثبت درخواست فروشندگی</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <ProfileContent profile={profile} />;
}

/* -------------------------------------------------------------------------- */
/* محتوای پروفایل بر اساس وضعیت                                                  */
/* -------------------------------------------------------------------------- */

function ProfileContent({ profile }: { profile: SellerProfile }) {
  const status: SellerStatus = profile.status;
  const editable = status === 'approved';

  return (
    <div>
      <PageHeader
        title="پروفایل فروشندگی"
        subtitle={`${profile.storeName} — ${SELLER_STATUS_LABELS[status]}`}
        action={
          <div className="flex items-center gap-2">
            <Pill status={status} label={SELLER_STATUS_LABELS[status]} />
          </div>
        }
      />

      <div className="mb-4">
        <SellerStatusBanner profile={profile} />
      </div>

      {editable ? (
        <EditProfileForm profile={profile} />
      ) : (
        <ReadonlyProfile profile={profile} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* نمایش فقط‌خواندنی (pending / rejected / suspended)                            */
/* -------------------------------------------------------------------------- */

function ReadonlyProfile({ profile }: { profile: SellerProfile }) {
  const rows: Array<{ label: string; value: string | null; dir?: 'ltr' }> = [
    { label: 'نام فروشگاه', value: profile.storeName },
    { label: 'اسلاگ', value: profile.storeSlug, dir: 'ltr' },
    { label: 'تلفن', value: profile.phone, dir: 'ltr' },
    { label: 'ایمیل', value: profile.email, dir: 'ltr' },
    { label: 'کد اقتصادی', value: profile.economicCode, dir: 'ltr' },
    { label: 'شماره ثبت', value: profile.registrationNumber, dir: 'ltr' },
    { label: 'شناسه ملی', value: profile.nationalId, dir: 'ltr' },
    { label: 'تاریخ درخواست', value: faDateTime(profile.createdAt) },
  ];

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-bold text-slate-100">اطلاعات ثبت‌شده</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <p className="text-2xs text-slate-400">{r.label}</p>
            <p className="mt-1 text-sm text-slate-100" dir={r.dir}>{r.value || '—'}</p>
          </div>
        ))}
      </div>
      {profile.description && (
        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
          <p className="text-2xs text-slate-400">درباره فروشگاه</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-200">{profile.description}</p>
        </div>
      )}

      {profile.status === 'rejected' && (
        <div className="mt-5 flex justify-end">
          <Link href="/vendor/apply">
            <Button><Store className="h-4 w-4" /> ثبت مجدد درخواست</Button>
          </Link>
        </div>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* فرم ویرایش (فقط برای approved)                                               */
/* -------------------------------------------------------------------------- */

function EditProfileForm({ profile }: { profile: SellerProfile }) {
  const qc = useQueryClient();
  const toast = useVendorToast();
  const [s, setS] = useState({
    storeName: profile.storeName || '',
    description: profile.description || '',
    logoPath: profile.logoPath || '',
    phone: profile.phone || '',
    email: profile.email || '',
    address: profile.address || '',
    economicCode: profile.economicCode || '',
    registrationNumber: profile.registrationNumber || '',
    nationalId: profile.nationalId || '',
  });

  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | undefined> = {
        storeName: s.storeName.trim(),
        description: s.description || undefined,
        logoPath: s.logoPath || undefined,
        phone: s.phone || undefined,
        email: s.email || undefined,
        address: s.address || undefined,
        economicCode: s.economicCode || undefined,
        registrationNumber: s.registrationNumber || undefined,
        nationalId: s.nationalId || undefined,
      };
      return api('/seller/profile', { method: 'PATCH', body: payload });
    },
    onSuccess: () => {
      toast.success('پروفایل به‌روزرسانی شد');
      qc.invalidateQueries({ queryKey: ['seller-profile'] });
      qc.invalidateQueries({ queryKey: ['seller-dashboard'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-100">ویرایش اطلاعات فروشگاه</p>
          <Button onClick={() => save.mutate()} loading={save.isPending} size="sm">
            <Save className="h-4 w-4" /> ذخیره
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام فروشگاه" required>
            <Input value={s.storeName} onChange={(e) => set('storeName', e.target.value)} />
          </Field>
          <Field label="تلفن فروشگاه" hint="09xxxxxxxxx">
            <Input dir="ltr" value={s.phone} onChange={(e) => set('phone', e.target.value)} placeholder="09123456789" />
          </Field>
          <Field label="ایمیل فروشگاه">
            <Input dir="ltr" value={s.email} onChange={(e) => set('email', e.target.value)} placeholder="store@example.com" />
          </Field>
          <Field label="کد اقتصادی">
            <Input dir="ltr" value={s.economicCode} onChange={(e) => set('economicCode', e.target.value)} />
          </Field>
          <Field label="شماره ثبت">
            <Input dir="ltr" value={s.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} />
          </Field>
          <Field label="شناسه ملی">
            <Input dir="ltr" value={s.nationalId} onChange={(e) => set('nationalId', e.target.value)} />
          </Field>
        </div>

        <Field label="درباره فروشگاه">
          <Textarea rows={4} value={s.description} onChange={(e) => set('description', e.target.value)} />
        </Field>

        <Field label="آدرس فروشگاه">
          <Textarea rows={2} value={s.address} onChange={(e) => set('address', e.target.value)} />
        </Field>

        <Field label="لوگوی فروشگاه">
          <VendorImageUpload value={s.logoPath} onChange={(p) => set('logoPath', p)} purpose="brand" />
        </Field>

        <div className="rounded-xl bg-white/5 px-4 py-3 text-2xs text-slate-400">
          نرخ کمیسیون فعلی شما: <span className="font-bold text-slate-200">{faNumber(profile.commissionRate)}٪</span>
          {' '}— این مقدار توسط مدیریت تنظیم می‌شود.
        </div>
      </Card>
    </motion.div>
  );
}
