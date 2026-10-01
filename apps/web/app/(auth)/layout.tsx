import Link from 'next/link';
import { LiveAuthBackground } from '@/components/live-auth-bg';
import { BrandSignature } from '@/components/brand-logo';

/**
 * Layout صفحات احراز هویت (login / register / forgot)
 *
 * پس‌زمینه: عکس auth-bg.png به‌صورت زنده (Live) — نئون‌ها روشن/خاموش
 * می‌شن، film grain سینمایی، pulse ملایم نور مرکزی.
 *
 * کارت: شفاف (transparent) با backdrop-blur خفیف — تا عکس پس‌زمینه
 * کاملاً دیده بشه و فقط متن فرم خوانا باشه.
 *
 * لوگو: همون BrandSignature که در هدر و فوتر سایت استفاده می‌شود
 * (با tone="dark" و size="lg" برای بزرگ‌تر دیده شدن در صفحه احراز هویت).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050a0e] px-4 py-10 text-slate-100">
      {/* ───── پس‌زمینه زنده (fixed position، z-index: 0) ───── */}
      <LiveAuthBackground />

      {/* ───── محتوا (z-index: 10) ───── */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
        {/* ───── لوگوی رسمی سایت (همان هدر/فوتر) ───── */}
        <Link href="/" className="mb-8 transition-transform hover:scale-105">
          <BrandSignature size="lg" tone="dark" />
        </Link>

        {/* ───── کارت شفاف ───── */}
        {/* کارت شفاف است (background: transparent) تا عکس پس‌زمینه دیده بشه.
            فقط یک backdrop-blur خفیف و border ظریف برای جداسازی فرم از پس‌زمینه. */}
        <div
          className="w-full max-w-md rounded-3xl border p-8"
          style={{
            borderColor: 'rgba(20, 184, 166, 0.20)',
            background: 'transparent',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(20, 184, 166, 0.05) inset',
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
