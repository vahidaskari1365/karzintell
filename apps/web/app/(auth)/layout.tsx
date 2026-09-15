import Link from 'next/link';
import { BrandLockup } from '@/components/brand-logo';

/**
 * Layout صفحات احراز هویت (login / register / forgot)
 *
 * Design brief — Karzintell: یک فروشگاه قطعات و گجت‌های الکترونیک
 * (موبایل، ساعت هوشمند، هدفون). کاربران علاقه‌مند به تکنولوژی.
 *
 * Design choice:
 * - تم: تاریک با tint آبی-فیروزه‌ای (cyan/teal) — رنگ دنیای تکنولوژی
 * - پس‌زمینه: گرافیک circuit board (مدار چاپی) که با موضوع قطعات الکترونیک
 *   مرتبط است. این یک انتخاب متمایز از gradient‌های generic است.
 * - لایه‌های گرادیان عمیق برای عمق دادن به صحنه
 * - کارت شیشه‌ای با border ظریف
 * - موشن فقط برای یک لحظه ارکستراسیون‌شده (نه scattered animations)
 *
 * Palete:
 *   #050a0e (base — عمیق‌تر از near-black تا cyan tint)
 *   #0a1419 (card surface)
 *   #14b8a6 (teal — رنگ badge کارزینتل)
 *   #06b6d4 (cyan — accent)
 *   #f0fdfa (text high)
 *   #94a3b8 (text muted)
 *
 * Type:
 *   Vazirmatn (already loaded globally) — فونت فارسی، weights 400/500/700/900
 *
 * No emoji, no scattered animations, no gradient-wash SaaS cards.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050a0e] px-4 py-10 text-slate-100">
      {/* ───── لایه ۱: گرادیان عمیق پایه ───── */}
      <div
        className="absolute inset-0 -z-40"
        style={{
          background:
            'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(20, 184, 166, 0.10) 0%, transparent 50%),' +
            'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(6, 182, 212, 0.08) 0%, transparent 60%),' +
            'linear-gradient(180deg, #050a0e 0%, #03070a 100%)',
        }}
      />

      {/* ───── لایه ۲: گرافیک مدار چاپی (circuit board) ───── */}
      {/* این گرافیک با موضوع "قطعات الکترونیک" مرتبط است — خطوط مدار،
          پدهای لحیم، نقاط اتصال — مثل PCB موبایل. */}
      <svg
        className="absolute inset-0 -z-30 h-full w-full opacity-[0.18]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
      >
        <defs>
          <pattern id="circuit-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            {/* خطوط مدار */}
            <path
              d="M 0 20 L 30 20 L 30 40 L 60 40 L 60 80"
              stroke="#14b8a6"
              strokeWidth="0.6"
              fill="none"
            />
            <path
              d="M 80 0 L 80 30 L 50 30 L 50 60 L 0 60"
              stroke="#06b6d4"
              strokeWidth="0.6"
              fill="none"
            />
            {/* پدهای لحیم */}
            <circle cx="30" cy="20" r="1.5" fill="#14b8a6" />
            <circle cx="30" cy="40" r="1.5" fill="#14b8a6" />
            <circle cx="60" cy="40" r="1.5" fill="#14b8a6" />
            <circle cx="50" cy="30" r="1.5" fill="#06b6d4" />
            <circle cx="50" cy="60" r="1.5" fill="#06b6d4" />
            <circle cx="80" cy="30" r="1.5" fill="#06b6d4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit-grid)" />
      </svg>

      {/* ───── لایه ۳: نورهای رنگی (diffuse glow) ───── */}
      {/* یک noor فیروزه‌ای بزرگ در بالا — مثل نور آباژور تکنولوژیکی */}
      <div
        className="absolute left-1/2 top-0 -z-20 h-[600px] w-[800px] -translate-x-1/2"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(20, 184, 166, 0.18) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* ───── لایه ۴: خطوط نوری افقی (motion) ───── */}
      {/* یک لحظه ارکستراسیون‌شده: خط نوری از بالا می‌آید و fade می‌شود */}
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
          borderColor: 'rgba(20, 184, 166, 0.15)',
          background: 'rgba(10, 20, 25, 0.6)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(20, 184, 166, 0.05) inset',
        }}
      >
        {children}
      </div>

      <Link href="/" className="mt-6 text-sm text-slate-400 transition hover:text-teal-300">
        بازگشت به فروشگاه
      </Link>
    </div>
  );
}
