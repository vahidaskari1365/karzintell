import Link from 'next/link';
import { BrandLockup } from '@/components/brand-logo';

/**
 * Layout صفحات احراز هویت (login / register / forgot)
 *
 * طراحی:
 *  - پس‌زمینه گرادیان تیره با افکت‌های نوری و grain
 *  - لوگوی متحرک (logo-tilt) در بالا
 *  - کارت شیشه‌ای (glassmorphism) با border ظریف
 *  - ایمیل/گوگل تکمیل نشده (در صفحه‌های داخلی اضافه می‌شود)
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#06080d] px-4 py-10">
      {/* لایه گرادیان پایه */}
      <div
        className="absolute inset-0 -z-30"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16, 185, 129, 0.10) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 80% 100%, rgba(99, 102, 241, 0.12) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 20% 80%, rgba(244, 63, 94, 0.08) 0%, transparent 60%)',
        }}
      />

      {/* شبکه‌بندی هندسی متحرک (motion) */}
      <div className="absolute inset-0 -z-20 overflow-hidden opacity-40">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" style={{ animationDuration: '11s', animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl animate-pulse" style={{ animationDuration: '9s', animationDelay: '1s' }} />
      </div>

      {/* خطوط نوری متحرک (motion graphics) */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <svg className="absolute left-1/2 top-0 h-[120%] w-[120%] -translate-x-1/2 opacity-30" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* خطوط متحرک مورب */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              x1={i * 70}
              y1="0"
              x2={i * 70 - 400}
              y2="800"
              stroke="url(#line-grad)"
              strokeWidth="1"
              className="animate-pulse"
              style={{ animationDelay: `${i * 0.2}s`, animationDuration: '6s' }}
            />
          ))}
        </svg>
      </div>

      {/* لوگو */}
      <Link href="/" className="mb-6 transition-transform hover:scale-105">
        <BrandLockup />
      </Link>

      {/* کارت شیشه‌ای */}
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
        {children}
      </div>

      <Link href="/" className="mt-6 text-sm text-slate-400 transition hover:text-slate-200">
        بازگشت به فروشگاه
      </Link>
    </div>
  );
}
