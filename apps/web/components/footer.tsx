'use client';

import Link from 'next/link';
import { Zap, Instagram, Send, MessageCircle, Phone, Play } from 'lucide-react';
import { useBranding } from '@/lib/branding';

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
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            {brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt={brand.name} className="h-9 w-auto max-w-36 object-contain" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
                <Zap className="h-5 w-5 text-amber-400" />
              </span>
            )}
            <span className="text-lg font-black">{brand.name}</span>
          </div>
          <p className="text-sm leading-7 text-slate-500">
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
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-900 hover:text-slate-900"
                >
                  <s.icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-800">دسترسی سریع</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/categories/mobile" className="hover:text-slate-800">موبایل</Link></li>
            <li><Link href="/categories/smartwatch" className="hover:text-slate-800">ساعت هوشمند</Link></li>
            <li><Link href="/categories/audio" className="hover:text-slate-800">هدفون و هندزفری</Link></li>
            <li><Link href="/categories/accessories" className="hover:text-slate-800">لوازم جانبی</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-800">خدمات مشتریان</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/account/orders" className="hover:text-slate-800">پیگیری سفارش</Link></li>
            <li><Link href="/track" className="hover:text-slate-800">رهگیری مرسوله</Link></li>
            <li><Link href="/account/tickets" className="hover:text-slate-800">پشتیبانی و تیکت</Link></li>
            <li><Link href="/blog" className="hover:text-slate-800">وبلاگ</Link></li>
            <li><Link href="/news" className="hover:text-slate-800">اخبار</Link></li>
            <li><Link href="/faq" className="hover:text-slate-800">سوالات متداول</Link></li>
            <li><Link href="/pages/terms" className="hover:text-slate-800">شرایط و قوانین</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-800">ارتباط با ما</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/pages/about-us" className="hover:text-slate-800">درباره {brand.name}</Link></li>
            <li><Link href="/pages/contact-us" className="hover:text-slate-800">تماس با ما</Link></li>
            {brand.supportPhone && (
              <li className="flex items-center gap-1.5" dir="ltr">
                <span className="justify-end text-slate-700">{brand.supportPhone}</span>
                <Phone className="h-3.5 w-3.5" />
              </li>
            )}
            <li>support@karzintell.ir</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {brand.name}. تمامی حقوق محفوظ است.
      </div>
    </footer>
  );
}
