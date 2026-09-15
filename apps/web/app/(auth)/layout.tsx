import Link from 'next/link';
import { BrandLockup } from '@/components/brand-logo';

/**
 * Layout صفحات احراز هویت (login / register / forgot)
 *
 * Design: پس‌زمینه عکس گرافیکی متمایز کارزینتل (با موضوع قطعات و گجت‌های
 * الکترونیک)، کارت شیشه‌ای برای فرم، رنگ‌های teal که با badge لوگو هماهنگ‌اند.
 *
 * عکس پس‌زمینه: apps/web/public/auth-bg.png
 * - overlay تیره برای خوانایی متن
 * - کارت شیشه‌ای با backdrop-blur
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050a0e] px-4 py-10 text-slate-100">
      {/* ───── لایه ۱: عکس پس‌زمینه ───── */}
      <div
        className="absolute inset-0 -z-40 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/auth-bg.png)' }}
      />

      {/* ───── لایه ۲: overlay تیره برای خوانایی متن ───── */}
      <div
        className="absolute inset-0 -z-30"
        style={{
          background:
            'linear-gradient(135deg, rgba(5, 10, 14, 0.85) 0%, rgba(5, 10, 14, 0.75) 50%, rgba(5, 10, 14, 0.85) 100%)',
        }}
      />

      {/* ───── لایه ۳: glow teal در مرکز برای عمق ───── */}
      <div
        className="absolute left-1/2 top-1/2 -z-20 h-[700px] w-[900px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(20, 184, 166, 0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* ───── لایه ۴: خط نوری افقی (motion) ───── */}
      <div
        className="absolute inset-x-0 top-0 -z-10 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #14b8a6 50%, transparent 100%)',
          animation: 'auth-line-glow 4s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes auth-line-glow {
          0%, 100% { opacity: 0.2; transform: scaleX(0.6); }
          50% { opacity: 0.7; transform: scaleX(1); }
        }
      `}</style>

      {/* ───── لوگو ───── */}
      <Link href="/" className="mb-8 transition-transform hover:scale-105">
        <BrandLockup />
      </Link>

      {/* ───── کارت شیشه‌ای ───── */}
      <div
        className="w-full max-w-md rounded-3xl border p-8 shadow-2xl backdrop-blur-xl"
        style={{
          borderColor: 'rgba(20, 184, 166, 0.2)',
          background: 'rgba(10, 20, 25, 0.7)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(20, 184, 166, 0.08) inset',
        }}
      >
        {children}
      </div>

      <Link href="/" className="mt-6 text-sm text-slate-300 transition hover:text-teal-300">
        بازگشت به فروشگاه
      </Link>
    </div>
  );
}
