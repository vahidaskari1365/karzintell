'use client';

/**
 * لوگوی برند کارزینتل — علامت K + نام دو‌رنگ (سبز/نقره‌ای)
 * اگر از پنل ادمین لوگوی سفارشی آپلود شود، همان نمایش داده می‌شود.
 */
import { useBranding } from '@/lib/branding';

export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  const brand = useBranding();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brand.logo || '/neon-k-3d.jpg'}
      alt={brand.name}
      className={`${className} rounded-xl bg-[#020604] object-cover ring-1 ring-emerald-500/30 drop-shadow-[0_0_14px_rgba(16,185,129,0.55)]`}
    />
  );
}

/** نام برند — پیش‌فرض کارزینتل به صورت دو‌رنگ (کارزین سبز + تل تیره/روشن) */
export function BrandName({ dark = false, className = 'text-xl' }: { dark?: boolean; className?: string }) {
  const brand = useBranding();
  if (brand.name === 'کارزینتل') {
    return (
      <span className={`${className} font-black tracking-tight`}>
        <span className="bg-gradient-to-l from-emerald-400 to-emerald-600 bg-clip-text text-transparent">کارزین</span>
        <span className={dark ? 'text-slate-100' : 'text-slate-900'}>تل</span>
      </span>
    );
  }
  return <span className={`${className} font-black tracking-tight ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{brand.name}</span>;
}
