'use client';

/* ==========================================================================
   لایوت پنل فروشنده — شامل سایدبار، تاپ‌بار و گارد احراز هویت
   --------------------------------------------------------------------------
   - کل مسیر /vendor/* درون AuthGuard قرار می‌گیرد (نیازمند ورود).
   - تم تیره‌ی سایت حفظ می‌شود (bg-[#121518]) و طراحی RTL فارسی است.
   - از framer-motion برای انیمیشن‌های نرم سایدبار موبایل و تعویض صفحات استفاده
     می‌شود.
   ========================================================================== */

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { VendorShell } from './_shared';

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    // فقط نیازمند ورود است — مجوز seller.dashboard در هر صفحه جداگانه بررسی می‌شود
    // (تا صفحات /vendor/apply و /vendor/profile برای کاربران عادی هم قابل دسترس باشند)
    <AuthGuard>
      <div dir="rtl" lang="fa" className="min-h-screen text-slate-200">
        <VendorShell>{children}</VendorShell>
      </div>
    </AuthGuard>
  );
}
