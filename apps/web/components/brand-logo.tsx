'use client';

/**
 * لوگوی رسمی کارزینتل — دقیقاً مطابق تصویر برند:
 * علامت K (سبز + شورون نقره‌ای + نقطه سبز) و نوشته «کارزین تل»
 * که در آن «کارزین» نقره‌ای و «تل» سبز است.
 */
import { useBranding } from '@/lib/branding';

export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  const brand = useBranding();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logo || '/logo-mark.svg'} alt={brand.name} className={`${className} object-contain`} />
  );
}

/** نوشته لوگو: «کارزین» نقره‌ای/خاکستری + «تل» سبز (روی زمینه تیره نقره‌ای روشن‌تر می‌شود) */
export function BrandName({ dark = false, className = 'text-xl' }: { dark?: boolean; className?: string }) {
  const brand = useBranding();
  if (brand.name === 'کارزینتل') {
    return (
      <span className={`${className} font-black tracking-tight`} dir="rtl">
        <span
          className={
            dark
              ? 'bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent'
              : 'bg-gradient-to-b from-slate-500 to-slate-800 bg-clip-text text-transparent'
          }
        >
          کارزین
        </span>{' '}
        <span className="bg-gradient-to-b from-emerald-400 to-emerald-600 bg-clip-text text-transparent">تل</span>
      </span>
    );
  }
  return <span className={`${className} font-black tracking-tight ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{brand.name}</span>;
}

/** نسخه کامل استک‌شده لوگو (علامت + نوشته + شعار) — برای فوتر و صفحات احراز */
export function BrandLockup({ dark = false, subtitle = true }: { dark?: boolean; subtitle?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <BrandMark className="h-16 w-16" />
      <BrandName dark={dark} className="text-3xl" />
      {subtitle && (
        <span className={`text-2xs tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          واردات و فروش قطعات الکترونیکی
        </span>
      )}
    </div>
  );
}
