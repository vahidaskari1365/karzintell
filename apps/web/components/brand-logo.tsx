'use client';

import clsx from 'clsx';
import { DEFAULT_BRANDING, useBranding } from '@/lib/branding';

const DEFAULT_FULL_LOGO = DEFAULT_BRANDING.logo || '/karzin-logo-full.png';
const DEFAULT_MARK_LOGO = '/karzin-logo-mark.png';

function isCustomBrandLogo(path?: string | null) {
  if (!path) return false;
  return !path.endsWith(DEFAULT_FULL_LOGO) && !path.endsWith('/karzin-logo.png');
}

/** نشان سه‌بعدی K با شیشه، عمق و هاله‌ی نئونی */
export function BrandMark({
  className = 'h-10 w-10',
  motion = '',
  tone = 'light',
}: {
  className?: string;
  motion?: string;
  tone?: 'light' | 'dark';
}) {
  const brand = useBranding();

  return (
    <span
      className={clsx(
        'brand-mark-frame',
        tone === 'dark' ? 'brand-mark-frame-dark' : 'brand-mark-frame-light',
        motion,
        className,
      )}
    >
      <span aria-hidden className="brand-mark-aurora" />
      <span aria-hidden className="brand-mark-grid" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={DEFAULT_MARK_LOGO} alt={brand.name} className="brand-mark-image" />
      <span aria-hidden className="brand-mark-reflection" />
    </span>
  );
}

/** لوگوی خام آپلودشده/پیش‌فرض؛ برای جاهایی که خودِ تصویر لازم است */
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
  const resolved = src || brand.logo || DEFAULT_FULL_LOGO;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={brand.name} className={clsx(className, 'w-auto object-contain', motion)} />
  );
}

/** نوشته‌ی برند با حس فلزی/نئونی و عمق بیشتر */
export function BrandName({ dark = false, className = 'text-xl' }: { dark?: boolean; className?: string }) {
  const brand = useBranding();

  if (brand.name === 'کارزینتل') {
    return (
      <span className={clsx('brand-wordmark', dark ? 'brand-wordmark-dark' : 'brand-wordmark-light', className)} dir="rtl">
        <span className="brand-wordmark-metal">کارزین</span>
        <span className="brand-wordmark-accent">تل</span>
      </span>
    );
  }

  return <span className={clsx(className, 'font-black tracking-tight', dark ? 'text-slate-100' : 'text-slate-900')}>{brand.name}</span>;
}

/**
 * امضای اصلی برند برای هدر/فوتر: نشان سه‌بعدی + وردمارک یکپارچه با شیشه و نور.
 * اگر لوگوی سفارشی از تنظیمات پنل آمده باشد، همان تصویر داخل شِل سه‌بعدی نمایش داده می‌شود.
 */
export function BrandSignature({
  tone = 'light',
  size = 'md',
  className,
  tagline = false,
  subtitle = false,
  pop = false,
}: {
  tone?: 'light' | 'dark';
  size?: 'md' | 'lg';
  className?: string;
  tagline?: boolean;
  subtitle?: boolean;
  pop?: boolean;
}) {
  const brand = useBranding();
  const customLogo = isCustomBrandLogo(brand.logo) ? brand.logo : null;

  const sizes = {
    md: {
      shell: 'gap-3 rounded-[1.55rem] px-3.5 py-2.5',
      mark: 'h-12 w-12',
      word: 'text-[2rem] sm:text-[2.2rem]',
      custom: 'h-11 sm:h-12',
      sub: 'text-[10px]',
    },
    lg: {
      shell: 'gap-4 rounded-[1.9rem] px-4.5 py-3.5',
      mark: 'h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]',
      word: 'text-[2.65rem] sm:text-[3rem]',
      custom: 'h-16 sm:h-[4.5rem]',
      sub: 'text-[11px] sm:text-xs',
    },
  } as const;

  const scale = sizes[size];

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <div
        className={clsx(
          'brand-shell brand-shell-3d',
          tone === 'dark' ? 'brand-shell-dark' : 'brand-shell-light',
          scale.shell,
          pop && 'logo-pop',
          className,
        )}
      >
        <span aria-hidden className="brand-shell-ambient" />
        <span aria-hidden className="brand-shell-grid" />

        {customLogo ? (
          <span className="relative z-[2] block" style={{ transform: 'translateZ(8px)' }}>
            <BrandLogo className={clsx(scale.custom, 'logo-glow')} src={customLogo} />
          </span>
        ) : (
          <BrandMark className={scale.mark} tone={tone} motion="brand-mark-float" />
        )}

        <div className="relative z-[2] flex min-w-0 flex-col items-start justify-center">
          <BrandName dark={tone === 'dark'} className={clsx(scale.word, 'leading-none')} />
          {tagline && (
            <span className={clsx('brand-shell-tagline mt-1.5', scale.sub)}>
              واردات و فروش قطعات الکترونیکی
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <span className={clsx('brand-caption ps-2', scale.sub, tone === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
          تجربه‌ی خرید سریع، مطمئن و مدرن
        </span>
      )}
    </div>
  );
}

/** نسخه‌ی جمع‌وجور برای صفحات احراز هویت و فوتر */
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
  return <BrandSignature tone={dark ? 'dark' : 'light'} size={size} tagline subtitle={subtitle} pop={pop} />;
}
