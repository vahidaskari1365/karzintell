'use client';

/**
 * لوگوی رسمی کارزینتل — دقیقاً مطابق فایل برند (karzin-logo.png):
 * نشان K (ساقه سبز + شورون نقره‌ای + نقطه سبز) و نوشته «کارزین تل»
 * (کارزین نقره‌ای، تل سبز) روی زمینه مشکی.
 *
 * فایل‌ها:
 *  - /karzin-logo-full.png → لوگوی کامل (نشان + نوشته) بدون حاشیه اضافه
 *  - /karzin-logo-mark.png → فقط نشان K (تقریباً مربع)
 *  - /app/icon.png         → فاوآیکون (همان نشان)
 *
 * موشن‌گرافیک (کلاس‌ها در globals.css): logo-glow (هاله سبز)، logo-float (شناوری)،
 * logo-sheen (برق نور)، logo-pop (ورود پاپ)، logo-tilt (چرخش هاور).
 */
import { useBranding } from '@/lib/branding';

/** فقط نشان K — مربعی؛ برای پنل ادمین و جای‌های ریز (برشِ رسمیِ همان لوگو) */
export function BrandMark({ className = 'h-9 w-9', motion = '' }: { className?: string; motion?: string }) {
  const brand = useBranding();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/karzin-logo-mark.png" alt={brand.name} className={`${className} rounded-lg object-contain ${motion}`} />
  );
}

/**
 * لوگوی کامل (نشان + نوشته «کارزین تل») — نسبت ۴۲۰×۲۹۴؛
 * ارتفاع را با h-* بدهید، عرض خودکار می‌ماند.
 */
export function BrandLogo({
  className = 'h-14',
  motion = '',
  src,
}: {
  className?: string;
  motion?: string;
  src?: string;
}) {
  const brand = useBranding();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || brand.logo || '/karzin-logo-full.png'}
      alt={brand.name}
      className={`${className} w-auto object-contain ${motion}`}
    />
  );
}

/** نوشته «کارزین» نقره‌ای + «تل» سبز — فقط جایی که متنِ جدا لازم باشد (روی زمینه تیره روشن‌تر) */
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

/**
 * نسخه کامل استک‌شده لوگو روی پلاک تیره با هاله سبز — برای فوتر و صفحات احراز هویت.
 * موشن: ورود پاپ + هاله نفس‌کش + برق نور گذرا.
 */
export function BrandLockup({
  dark = false,
  subtitle = true,
  size = 'lg',
  pop = true,
}: {
  dark?: boolean;
  subtitle?: boolean;
  size?: 'md' | 'lg';
  pop?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`logo-sheen logo-glow relative rounded-2xl bg-[#05080f]/95 px-5 py-3 ring-1 ring-emerald-400/25 shadow-2xl shadow-emerald-950/40 ${
          pop ? 'logo-pop' : ''
        }`}
      >
        <BrandLogo className={size === 'lg' ? 'h-24 sm:h-28' : 'h-16 sm:h-20'} />
      </div>
      {subtitle && (
        <span className={`text-2xs tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          واردات و فروش قطعات الکترونیکی
        </span>
      )}
    </div>
  );
}
