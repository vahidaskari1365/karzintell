'use client';

import Link from 'next/link';
import { Instagram, Send, MessageCircle, Phone, Play } from 'lucide-react';
import { useBranding } from '@/lib/branding';
import { BrandLockup } from './brand-logo';

const SOCIAL_META: Array<{ key: 'instagram' | 'telegram' | 'whatsapp' | 'aparat'; label: string; icon: typeof Instagram }> = [
  { key: 'instagram', label: 'اینستاگرام', icon: Instagram },
  { key: 'telegram', label: 'تلگرام', icon: Send },
  { key: 'whatsapp', label: 'واتساپ', icon: MessageCircle },
  { key: 'aparat', label: 'آپارات', icon: Play },
];

export function Footer() {
  const brand = useBranding();
  const socials = SOCIAL_META.filter((s) => brand.socials[s.key]);

  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0e1113]/90 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-4">
            {/* اندازه md (هم‌اندازه‌ی هدر) + بدون انیمیشن ورود/شناور تا در فوتر تمیز و حرفه‌ای دیده شود */}
            <BrandLockup dark subtitle={false} size="md" pop={false} animated={false} />
          </div>
          <p className="text-sm leading-7 text-slate-400">
            فروشگاه اینترنتی قطعات و گجت‌های الکترونیک؛ موبایل، ساعت هوشمند، هدفون و لوازم جانبی با ضمانت اصالت کالا.
          </p>
          {socials.length > 0 && (
            <div className="mt-4 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={brand.socials[s.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 text-slate-400 transition hover:border-emerald-400 hover:text-emerald-300"
                >
                  <s.icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-100">دسترسی سریع</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/categories/mobile" className="hover:text-emerald-300">موبایل</Link></li>
            <li><Link href="/categories/smartwatch" className="hover:text-emerald-300">ساعت هوشمند</Link></li>
            <li><Link href="/categories/audio" className="hover:text-emerald-300">هدفون و هندزفری</Link></li>
            <li><Link href="/categories/accessories" className="hover:text-emerald-300">لوازم جانبی</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-100">خدمات مشتریان</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/account/orders" className="hover:text-emerald-300">پیگیری سفارش</Link></li>
            <li><Link href="/track" className="hover:text-emerald-300">رهگیری مرسوله</Link></li>
            <li><Link href="/account/tickets" className="hover:text-emerald-300">پشتیبانی و تیکت</Link></li>
            <li><Link href="/blog" className="hover:text-emerald-300">وبلاگ</Link></li>
            <li><Link href="/news" className="hover:text-emerald-300">اخبار</Link></li>
            <li><Link href="/faq" className="hover:text-emerald-300">سوالات متداول</Link></li>
            <li><Link href="/pages/terms" className="hover:text-emerald-300">شرایط و قوانین</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-100">ارتباط با ما</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/pages/about-us" className="hover:text-emerald-300">درباره {brand.name}</Link></li>
            <li><Link href="/pages/contact-us" className="hover:text-emerald-300">تماس با ما</Link></li>
            {brand.supportPhone && (
              <li className="flex items-center gap-1.5" dir="ltr">
                <span className="justify-end text-slate-300">{brand.supportPhone}</span>
                <Phone className="h-3.5 w-3.5" />
              </li>
            )}
            <li>support@karzintell.ir</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {brand.name}. تمامی حقوق محفوظ است.
      </div>
    </footer>
  );
}
