import Link from 'next/link';
import { BrandLockup } from '@/components/brand-logo';
import { LiveAuthBackground } from '@/components/live-auth-bg';

/**
 * Layout صفحات احراز هویت (login / register / forgot)
 *
 * پس‌زمینه: عکس auth-bg.png به‌صورت زنده (Live) — نئون‌ها روشن/خاموش
 * می‌شن، film grain سینمایی، pulse ملایم نور مرکزی.
 * کارت: شیشه‌ای با border teal.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050a0e] px-4 py-10 text-slate-100">
      {/* ───── پس‌زمینه زنده (fixed position، z-index: 0) ───── */}
      <LiveAuthBackground />

      {/* ───── محتوا (z-index: 10) ───── */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
        {/* لوگو */}
        <Link href="/" className="mb-8 transition-transform hover:scale-105">
          <BrandLockup />
        </Link>

        {/* کارت شیشه‌ای */}
        <div
          className="w-full max-w-md rounded-3xl border p-8 shadow-2xl backdrop-blur-xl"
          style={{
            borderColor: 'rgba(20, 184, 166, 0.25)',
            background: 'rgba(8, 16, 20, 0.75)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(20, 184, 166, 0.08) inset, 0 0 60px rgba(20, 184, 166, 0.05)',
          }}
        >
          {children}
        </div>

        <Link href="/" className="mt-6 text-sm text-slate-300 transition hover:text-teal-300">
          بازگشت به فروشگاه
        </Link>
      </div>
    </div>
  );
}
