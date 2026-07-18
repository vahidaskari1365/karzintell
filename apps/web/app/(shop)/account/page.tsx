'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast, useAuthStore } from '@/lib/auth-store';
import { Button, Card, Field, Input, Badge } from '@/components/ui';
import { TwoFactorCard } from '@/components/twofactor-card';
import { useState } from 'react';
import { faDateTime, toToman } from '@/lib/format';

export default function AccountPage() {
  const { user, setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({ fullName: user?.fullName || '', email: user?.email || '', nationalCode: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => (await api<{ balance: number }>('/me/wallet')).data,
  });

  const { data: orders } = useQuery({
    queryKey: ['my-orders', 1],
    queryFn: async () => (await api<any[]>('/me/orders?limit=3')).data,
  });

  const saveProfile = useMutation({
    mutationFn: async () => api<any>('/me', { method: 'PATCH', body: profile }),
    onSuccess: (r) => {
      toast.success('اطلاعات ذخیره شد');
      useAuthStore.getState().setAuth(useAuthStore.getState().accessToken!, r.data);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const changePassword = useMutation({
    mutationFn: async () => api('/auth/change-password', { method: 'POST', body: passwords }),
    onSuccess: () => {
      toast.success('رمز عبور تغییر کرد');
      setPasswords({ currentPassword: '', newPassword: '' });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-700 text-white">
          <span className="text-xs text-slate-300">موجودی کیف پول</span>
          <div className="mt-1 text-2xl font-black">{toToman(wallet?.balance || 0)}</div>
          <Link href="/account/wallet" className="mt-2 block text-xs text-amber-300">مدیریت کیف پول ←</Link>
        </Card>
        <Card>
          <span className="text-xs text-slate-400">آخرین سفارش</span>
          <div className="mt-1 text-lg font-bold text-slate-800" dir="ltr">
            {orders?.[0] ? orders[0].code : '—'}
          </div>
          <Link href="/account/orders" className="mt-2 block text-xs text-slate-500">همه سفارش‌ها ←</Link>
        </Card>
        <Card>
          <span className="text-xs text-slate-400">وضعیت حساب</span>
          <div className="mt-2"><Badge tone="green">فعال</Badge></div>
          <span className="mt-2 block text-xs text-slate-400" dir="ltr">{user.phone}</span>
        </Card>
      </div>

      {user.mustChangePassword && (
        <Card className="border-amber-300 bg-amber-50 text-sm text-amber-800">
          حساب شما توسط مدیر ساخته شده است — لطفاً رمز عبور خود را همین‌جا تغییر دهید.
        </Card>
      )}

      <Card>
        <h2 className="mb-4 font-bold">ویرایش اطلاعات کاربری</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="نام و نام خانوادگی">
            <Input value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} />
          </Field>
          <Field label="ایمیل">
            <Input dir="ltr" value={profile.email || ''} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
          </Field>
          <Field label="کد ملی">
            <Input dir="ltr" value={profile.nationalCode} onChange={(e) => setProfile((p) => ({ ...p, nationalCode: e.target.value }))} placeholder="اختیاری" />
          </Field>
        </div>
        <Button className="mt-4" onClick={() => saveProfile.mutate()} loading={saveProfile.isPending}>ذخیره تغییرات</Button>
      </Card>

      <Card>
        <h2 className="mb-4 font-bold">تغییر رمز عبور</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رمز فعلی">
            <Input dir="ltr" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} />
          </Field>
          <Field label="رمز جدید" hint="حداقل ۸ کاراکتر">
            <Input dir="ltr" type="password" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} />
          </Field>
        </div>
        <Button className="mt-4" variant="secondary" onClick={() => changePassword.mutate()} loading={changePassword.isPending} disabled={!passwords.currentPassword || passwords.newPassword.length < 8}>
          تغییر رمز
        </Button>
      </Card>

      <TwoFactorCard />
    </div>
  );
}
