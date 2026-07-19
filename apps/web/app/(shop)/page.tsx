'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BadgeCheck, BookOpen, Cable, ChevronDown, Cpu, Headphones, Laptop, Rocket, ShieldCheck, ShoppingBag, Smartphone,
  Star, Truck, Watch, Zap,
} from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { toToman, faNumber } from '@/lib/format';
import { CategoryNode, ProductCardType } from '@/lib/types';
import { frameWindow, useStickyProgress } from '@/lib/scroll-engine';
import { ProductGrid } from '@/components/product-card';
import { PageLoading } from '@/components/ui';
import {
  CountUp, Magnetic, Marquee, Parallax, Reveal, RevealGroup, ScrollProgress, TiltCard, revealItem,
} from '@/components/cinematic/fx';

/* فرار از قاب max-w-7xl برای سکشن‌های تمام‌قد */
const FULL = 'relative left-1/2 right-1/2 -mx-[50vw] w-screen';

const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  mobile: Smartphone, smartwatch: Watch, audio: Headphones, laptop: Laptop, accessories: Cpu,
};

/* شعار اختصاصی هر دسته — کپی‌رایتینگ فروشگاهی */
const CATEGORY_TAGLINES: Record<string, string> = {
  mobile: 'پرچمداران سال، گوشی‌های اقتصادی و هر چه بین این دو — همه با گارانتی رسمی و بهترین قیمت بازار.',
  smartwatch: 'ساعت‌هایی که سلامتی‌ات را می‌شناسند؛ ورزش، خواب و اعلان‌ها، همیشه روی مچ تو.',
  audio: 'از بیسِ عمیق تا سکوتِ نویزکنسلینگ؛ صدایی که واقعاً لیاقتش را داری.',
  laptop: 'قدرتِ کاری و سرگرمی در قالبی خوش‌ساخت؛ انتخابی که سال‌ها همراهت می‌ماند.',
  accessories: 'کابل، شارژر، کاور و همه جزئیات کوچکی که تجربه گجتت را کامل می‌کند.',
};

/* متن گرادیانی سبز برای زمینه روشن */
const GT = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-gradient-to-l from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">{children}</span>
);

// =============================================================== هیرو — آنباکسینگ سینمایی با عکس‌های واقعیِ خودِ مشتری (آیفون ۱۸ پرو)
/* موتور اسکرول: lib/scroll-engine.ts (رویداد خام + rAF + فال‌بک، کراس‌فید متقاطع واقعی) */
/* سه اسکرول = سه سکانس: بازشدن درِ جعبه → محتویات داخل جعبه → صحنه‌ی شناور پرده‌برداری */
const UNBOX_FRAMES = [
  { src: '/assets/unbox/rb1-box.jpg', alt: 'جعبه‌ی سفید مهروموم‌شده‌ی آیفون ۱۸ پرو زیر نور استودیو، روی صحنه‌ی سبز تیره' },
  { src: '/assets/unbox/rb2-lid.jpg', alt: 'درِ سفید جعبه کمی باز شده و بدنه‌ی تیره‌ی گوشی داخل قابش دیده می‌شود؛ صحنه‌ی سبز سینمایی' },
  { src: '/assets/unbox/rb3-gear.jpg', alt: 'سینی باز جعبه با گوشی صفحه‌سیاه، کابل بافت USB-C و دفترچه روی نور استودیوی سبز' },
  { src: '/assets/unbox/rb4-phone.jpg', alt: 'صحنه‌ی شناور آنباکسینگ: آیفون بنفش با سه لنز، پین سیم‌کارت، برگه‌ها و کابل روی سبز تیره' },
];

/* ذرات ظریف برای فضای صحنه */
const CHARCOAL_SEEDS: Array<[string, string, string]> = [
  ['12%', '30%', '0s'], ['20%', '68%', '1.2s'], ['33%', '22%', '.8s'], ['82%', '26%', '1.5s'],
  ['90%', '58%', '.5s'], ['72%', '80%', '2s'], ['45%', '15%', '1.8s'], ['8%', '82%', '2.3s'],
];

function CinematicHero() {
  const total = UNBOX_FRAMES.length; // ۴ فریم = ۳ اسکرول
  const targetRef = useRef<HTMLElement | null>(null);
  const p = useStickyProgress(targetRef);
  const idx = Math.min(total - 1, Math.max(0, Math.floor(p * total)));

  // ─── موشن‌گرفی اسکرول‌محور: هر حرکت مستقیم از انگشت کاربر فرمان می‌گیرد (مثل اسکراب تایم‌لاین فیلم) ───
  const segT = 1 / total;
  const H = segT * 0.24; // نیمه‌پهنای هم‌پوشانی کراس‌فید
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  // شدت موج هر مرز: دقیقاً در لحظه‌ی تعویض صحنه اوج می‌گیرد و بعد آرام می‌خوابد — مثل ضرب‌آهنگ برش فیلم
  const wave = (b: number) => clamp01((p - (b - H)) / (2 * H)) * (1 - clamp01((p - b) / segT));
  const w1 = wave(segT);     // مرز اول: بازشدن درِ جعبه ← پرتوهای نور از شکاف
  const w2 = wave(2 * segT); // مرز دوم: برخاستن محتویات به هوا
  const w3 = wave(3 * segT); // مرز سوم: شوک‌ویو تولد صحنه‌ی نهایی
  const glowBoost = Math.min(1, w1 + w2 + w3); // نور صحنه در اوج هر برش دم می‌گیرد
  const purpleGlow = frameWindow(p, 3, total, 0.24) * 0.55; // آکسنت بنفش گوشی در سکانس نهایی با صحنه هم‌خوان می‌شود

  return (
    <section ref={targetRef} className={`${FULL}`} style={{ height: `${total * 100 + 35}vh` }}>
      <h1 className="sr-only">کارزینتل | فروشگاه موبایل، ساعت هوشمند، هدفون و قطعات الکترونیک — آنباکسینگ آیفون ۱۸ پرو</h1>

      {/* ساختار دقیقاً هم‌الگو با اسکرول قفسه‌های پایین صفحه که روی دستگاه شما سالم کار می‌کند */}
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-[radial-gradient(120%_95%_at_50%_12%,#1a2125_0%,#0c0f10_72%)]">
        {/* صحنه‌ی ذغالی سینما + تقویت نور در اوج هر برش + لایه‌ی همیشه‌زنده‌ی فیلم */}
        <div aria-hidden className="absolute inset-0">
          <div
            className="absolute inset-x-0 bottom-0 top-[40%] bg-[radial-gradient(62%_58%_at_50%_76%,rgba(16,185,129,.18),transparent_72%)]"
            style={{ opacity: 0.5 + glowBoost * 0.5 }}
          />
          {/* پرتوی سینمایی رقصان پشت قاب‌ها — مثل نور پروژکتورِ سالن سینما */}
          <div
            className="rays-sway absolute inset-x-[-22%] bottom-0 top-[44%] bg-[conic-gradient(from_-90deg_at_50%_100%,transparent_0deg,rgba(16,185,129,0.12)_8deg,transparent_17deg,rgba(255,255,255,0.05)_23deg,transparent_31deg,rgba(16,185,129,0.10)_41deg,transparent_54deg)]"
            style={{ opacity: 0.55 + glowBoost * 0.45 }}
          />
          {/* هاله‌ی بنفش سکانس نهایی — هم‌رنگ گوشی */}
          <div className="absolute inset-x-[22%] bottom-[6%] h-64 rounded-full bg-violet-500/25 blur-3xl" style={{ opacity: purpleGlow }} />
          <div className="absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_0%,transparent_56%,rgba(5,7,8,.62))]" />
          {CHARCOAL_SEEDS.map(([x, y, d], i) => (
            <i key={i} className="neon-seed" style={{ left: x, top: y, animationDelay: d, opacity: 0.35 }} />
          ))}
          {/* جرقه‌های شناور — هوای صحنه همیشه در حرکت است */}
          {[['16%', '32%', '0s'], ['80%', '26%', '1.3s'], ['28%', '64%', '2.4s'], ['68%', '58%', '3.2s'], ['50%', '18%', '4.1s'], ['86%', '50%', '5s']].map(([x, y, d], n) => (
            <i key={n} className="spark-drift absolute block h-1 w-1 rounded-full bg-emerald-300/80" style={{ left: x, top: y, animationDelay: d }} />
          ))}
        </div>

        {/* پیش‌بارگذاری هر ۴ فریم — قبل از اولین اسکرول آماده‌اند */}
        {UNBOX_FRAMES.map((f) => (
          <link key={f.src} rel="preload" as="image" href={f.src} />
        ))}

        {/* چهار قاب واقعی — هر سکانس با ورود سه‌بعدیِ مختص خودش، هم‌ریتم با آنباکس واقعی */}
        {UNBOX_FRAMES.map((f, i) => {
          const active = i === idx;
          const enter = i === 0 ? 1 : clamp01((p - (i * segT - H)) / (2 * H));            // روند ورود — دقیقاً همگام با کراس‌فید
          const exit = i === total - 1 ? 0 : clamp01((p - ((i + 1) * segT - H)) / (2 * H)); // روند خروج — صحنه به‌سمت بیننده می‌آید
          const local = clamp01((p - i * segT) / segT);                                   // پیشرفت داخل سکانس
          // زبانه‌ی ورود هر صحنه — موشن‌گرفی همان لحظه‌ی آنباکس:
          let enter3d = '';
          if (i === 1) enter3d = ` translateY(${(1 - enter) * 90}px) rotateX(-${(1 - enter) * 16}deg)`; // درِ جعبه به‌سمت بیننده باز می‌شود و می‌نشیند
          if (i === 2) enter3d = ` translateY(${(1 - enter) * 130}px) scale(${0.9 + enter * 0.1})`;     // محتویات از دلِ جعبه سربرمی‌آورند
          if (i === 3) enter3d = ` scale(${0.78 + enter * 0.22}) rotate(${(1 - enter) * -6}deg)`;        // شات نهایی با ضرب تولد پیدا می‌کند
          const driftY = (i % 2 === 0 ? 1 : -1) * local * 12;         // شناوری ظریف داخل صحنه — نفس کشیدن تصویر
          const driftScale = 1 + local * 0.05 + exit * 0.08;          // دوربین آهسته نزدیک می‌شود؛ هنگام برش به‌سمت بیننده
          return (
            <div
              key={f.src}
              aria-hidden={!active}
              className="absolute inset-0 will-change-[opacity]"
              style={{
                opacity: frameWindow(p, i, total, 0.24),
                transition: 'opacity .18s linear',
                pointerEvents: active ? 'auto' : 'none',
                zIndex: active ? 10 : 0,
              }}
            >
              <div className="flex h-full items-center justify-center px-4 pb-10" style={{ perspective: '1500px' }}>
                <div
                  className="relative w-[min(92vw,calc(54svh*1.4406))] sm:w-[min(74vw,calc(54svh*1.4406))] lg:w-[min(58vw,calc(56svh*1.4406))]"
                  style={{
                    aspectRatio: '1200/833',
                    transform: `translateY(${driftY}px) scale(${driftScale})${enter3d}`,
                    transformStyle: 'preserve-3d',
                    transition: 'transform .12s linear',
                  }}
                >
                  {/* سکانس زنده: نفس‌کشیدن فیلم + برق دوربین روی قاب */}
                  <div className="film-breath relative h-full w-full" style={{ animationDelay: `${i * 0.9}s` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.src} alt={f.alt} draggable={false}
                      fetchPriority={i === 0 ? 'high' : undefined}
                      className="h-full w-full select-none rounded-[2rem] object-cover object-center shadow-[0_45px_140px_-18px_rgba(0,0,0,0.9)] ring-1 ring-white/15"
                      style={{ transform: `scale(${1.045 - local * 0.045})`, transition: 'transform .12s linear' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                    />
                    {/* برق لنز که چرخه‌ای روی قاب می‌غزه — حس پخش زنده‌ی فیلم */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
                      <div
                        className="sheen-sweep absolute -top-[30%] bottom-[-30%] right-0 w-[38%] bg-gradient-to-l from-transparent via-white/15 to-transparent"
                        style={{ animationDelay: `${1.2 + i * 1.5}s` }}
                      />
                    </div>
                  </div>
                  {/* قاب نئون ظریف دور عکس */}
                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[2rem] shadow-[inset_0_0_0_1px_rgba(16,185,129,0.10)]" />
                </div>
              </div>
            </div>
          );
        })}

        {/* ─── موج ۱: پرتوهای نور از شکاف جعبه — هنگام بازشدن در ─── */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-[34%] z-[15]" style={{ opacity: w1 }}>
          <div
            className="absolute inset-x-[-25%] bottom-[16%] h-full bg-[conic-gradient(from_-90deg_at_50%_100%,transparent_0deg,rgba(74,222,128,0.30)_10deg,transparent_20deg,rgba(255,255,255,0.18)_28deg,transparent_38deg,rgba(16,185,129,0.26)_50deg,transparent_62deg)]"
            style={{ transform: `scaleY(${0.35 + w1 * 0.75})`, transformOrigin: '50% 100%' }}
          />
          <div className="absolute inset-x-[34%] bottom-[24%] h-20 rounded-full bg-emerald-400/40 blur-3xl" />
        </div>

        {/* ─── موج ۲: کابل، دفترچه و گوشی از دلِ جعبه به هوا برمی‌خیزند ─── */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[15]" style={{ opacity: w2 }}>
          {[
            { Icon: Cable, x: '22%', k: 1.0, r: -14 },
            { Icon: Smartphone, x: '47%', k: 1.6, r: 6 },
            { Icon: BookOpen, x: '70%', k: 0.8, r: 12 },
          ].map(({ Icon, x, k, r }, n) => (
            <Icon
              key={n}
              className="absolute h-9 w-9 text-emerald-200 drop-shadow-[0_0_16px_rgba(16,185,129,0.75)] sm:h-11 sm:w-11"
              style={{ left: x, bottom: '22%', transform: `translateY(${-w2 * 150 * k}px) rotate(${r * w2}deg)`, transition: 'transform .16s linear' }}
            />
          ))}
        </div>

        {/* ─── موج ۳: حلقه‌ی شوک‌ویو + بارش ذرات — تولد شات نهایی ─── */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[15]" style={{ opacity: w3 }}>
          <div
            className="absolute left-1/2 top-1/2 h-28 w-28 rounded-full border-2 border-emerald-300/80"
            style={{ transform: `translate(-50%,-50%) scale(${0.3 + w3 * 3})`, opacity: 1 - w3 }}
          />
          <div className="absolute left-1/2 top-1/2 h-40 w-40 rounded-full bg-white/25 blur-2xl" style={{ transform: 'translate(-50%,-50%)', opacity: 0.5 * (1 - w3) }} />
          {Array.from({ length: 12 }, (_, n) => (
            <span
              key={n}
              className="absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full bg-emerald-200"
              style={{ transform: `translate(-50%,-50%) rotate(${n * 30}deg) translateX(${w3 * (150 + (n % 4) * 45)}px)`, opacity: 1 - w3 }}
            />
          ))}
        </div>

        {/* سکانس پایانی: فقط دکمه‌های خرید، تمیز و مینیمال — مرکز پایین صحنه */}
        {idx === total - 1 && (
          <div key={idx} className="animate-caption-in absolute inset-x-0 bottom-24 z-20 flex justify-center">
            <div className="flex flex-wrap justify-center gap-3">
              <Magnetic>
                <Link
                  href="/search?category=mobile"
                  className="pulse-glow inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-green-600 px-6 py-3 text-sm font-black text-slate-950 transition-transform hover:scale-105"
                >
                  <ShoppingBag className="h-4.5 w-4.5" /> مشاهده و خرید
                </Link>
              </Magnetic>
              <Magnetic>
                <Link
                  href="/search"
                  className="glass-dark inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-300"
                >
                  ورود به فروشگاه
                </Link>
              </Magnetic>
            </div>
          </div>
        )}

        {/* خط پیشرفت پایین */}
        <div className="absolute inset-x-0 bottom-6 z-20 mx-auto h-1 w-56 overflow-hidden rounded-full bg-white/10">
          <div className="h-full origin-right bg-gradient-to-l from-emerald-400 to-teal-300" style={{ transform: `scaleX(${p})` }} />
        </div>

        {/* راهنمای اسکرول — فقط سکانس اول (بدون کتابخانه؛ خالص CSS تا هیچ‌وقت گیر نکند) */}
        <div
          className={`absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 animate-bounce flex-col items-center gap-1 text-slate-400 transition-opacity duration-300 ${
            idx === 0 ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <span className="text-2xs font-bold">اسکرول کن — جعبه باز می‌شود</span>
          <ChevronDown className="h-5 w-5" />
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- نوار برندها (روشن)
function BrandStrip() {
  const brands = ['سامسونگ', 'اپل', 'شیائومی', 'انکر', 'جی‌بی‌ال', 'سونی', 'هوآوی', 'ریلمی', 'ونوس', 'گرین‌لاین'];
  return (
    <section className={`${FULL} border-y border-white/10 bg-[#171a1d] py-2`}>
      <Marquee>
        {brands.map((b) => (
          <span key={b} className="flex shrink-0 items-center gap-2 text-sm font-bold text-slate-400">
            <Star className="h-3.5 w-3.5 fill-emerald-500/70 text-emerald-500/70" /> {b}
          </span>
        ))}
      </Marquee>
    </section>
  );
}

// --------------------------------------------------------------- داده‌های نمایشی با تصویر واقعی
/* تا وقتی بک‌اند آنلاین نیست یا دسته‌ای خالی است، صفحه اول با محصولات نمایشیِ خوش‌ساخت زنده می‌ماند؛
   به محض آنلاین‌شدن API، محصولات واقعی جایگزین می‌شوند. */
const P = (id: number, name: string, slug: string, brand: string, image: string, price: number, rating: number, sold: number): ProductCardType =>
  ({ id, name, slug, brandName: brand, image, minPrice: price, ratingAvg: rating, ratingCount: sold, soldCount: sold, inStock: true });

const PR_GALAXY = P(-101, 'گوشی موبایل سامسونگ گلکسی S25 اولترا 5G ظرفیت 256 گیگابایت', 'samsung-galaxy-s25-ultra', 'سامسونگ', '/assets/products/p-galaxy-green.jpg', 780_000_000, 4.8, 320);
const PR_IPHONE = P(-102, 'گوشی موبایل اپل iPhone 16 Pro Max ظرفیت 256 گیگابایت', 'apple-iphone-16-pro-max', 'اپل', '/assets/products/p-iphone-gray.jpg', 890_000_000, 4.9, 287);
const PR_REDMI = P(-103, 'گوشی موبایل شیائومی Redmi Note 14 Pro ظرفیت 256 گیگابایت', 'xiaomi-redmi-note-14-pro', 'شیائومی', '/assets/products/p-redmi-blue.jpg', 168_000_000, 4.6, 950);
const PR_AWATCH = P(-104, 'ساعت هوشمند اپل واچ سری 10 آلومینیوم 46 میلی‌متری', 'apple-watch-series-10-46', 'اپل', '/assets/products/p-watch-black.jpg', 215_000_000, 4.9, 410);
const PR_GWATCH = P(-105, 'ساعت هوشمند سامسونگ گلکسی واچ 7 مدل 44 میلی‌متری', 'samsung-galaxy-watch-7-44', 'سامسونگ', '/assets/products/p-watch-silver.jpg', 149_000_000, 4.7, 388);
const PR_AIRPODS = P(-106, 'هندزفری بی‌سیم اپل AirPods Pro 2 با کیس شارژ MagSafe', 'apple-airpods-pro-2', 'اپل', '/assets/products/p-buds-white.jpg', 128_000_000, 4.8, 620);
const PR_SONY = P(-107, 'هدفون بی‌سیم سونی WH-1000XM5 با نویزکنسلینگ', 'sony-wh-1000xm5', 'سونی', '/assets/products/p-headphone-green.jpg', 198_000_000, 4.9, 214);
const PR_CHARGER = P(-108, 'شارژر بی‌سیم سریع 15 وات انکر مدل PowerWave', 'anker-powerwave-15w', 'انکر', '/assets/products/p-charger-white.jpg', 18_500_000, 4.5, 1200);
const PR_POWERBANK = P(-109, 'پاوربانک 20000 میلی‌آمپر انکر PowerCore با نمایشگر', 'anker-powercore-20000', 'انکر', '/assets/products/p-powerbank-silver.jpg', 24_800_000, 4.7, 890);

const FALLBACK_STAGE_PRODUCTS: Record<string, ProductCardType[]> = {
  mobile: [PR_GALAXY, PR_IPHONE, PR_REDMI],
  smartwatch: [PR_AWATCH, PR_GWATCH],
  audio: [PR_AIRPODS, PR_SONY],
  accessories: [PR_CHARGER, PR_POWERBANK],
};
const FALLBACK_NEWEST: ProductCardType[] = [PR_GALAXY, PR_AWATCH, PR_AIRPODS, PR_IPHONE, PR_REDMI, PR_SONY, PR_GWATCH, PR_CHARGER, PR_POWERBANK];
const FALLBACK_BEST: ProductCardType[] = [...FALLBACK_NEWEST].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));

const pickProducts = (items: ProductCardType[] | undefined, fallback: ProductCardType[]) =>
  items && items.length ? items : fallback;

// --------------------------------------------------------------- اسکرول سینمایی فروشگاه (ورود به قفسه‌ی هر دسته)
function MiniGlassCard({ p }: { p: ProductCardType }) {
  return (
    <Link
      href={`/products/${p.slug}`}
      className="glass-light group overflow-hidden rounded-2xl transition hover:-translate-y-1 hover:border-emerald-400/60"
    >
      <div className="relative h-28 overflow-hidden bg-[#10130f] sm:h-36">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><Smartphone className="h-10 w-10" /></div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-2xs font-bold text-slate-300 sm:text-xs">{p.name}</h3>
        <p className="mt-1 text-xs font-black text-emerald-400 sm:text-sm">{p.minPrice != null ? toToman(p.minPrice) : '—'}</p>
      </div>
    </Link>
  );
}

function CategoryStage({ cat, items, isLoading, idx, total }: { cat: CategoryNode; items: ProductCardType[]; isLoading: boolean; idx: number; total: number }) {
  const Icon = CATEGORY_ICONS[cat.slug] || Cpu;
  const tagline = CATEGORY_TAGLINES[cat.slug] || `منتخبی از بهترین‌های ${cat.name} با ضمانت اصالت کالا و ارسال سریع — انتخاب با تو.`;
  return (
    <div className="absolute inset-0 flex items-center">
      {/* هاله‌های نرم روی زمینه روشن */}
      <div className="pointer-events-none absolute -top-16 right-8 h-96 w-96 rounded-full bg-emerald-500/100/15 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 left-8 h-80 w-80 rounded-full bg-teal-500/10 blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-6 px-6 pt-24 sm:gap-8 sm:pt-16 lg:grid-cols-2 lg:pt-0">
        {/* متن و CTA */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/100/10 px-4 py-1.5 text-2xs font-black text-emerald-300 ring-1 ring-emerald-400/30">
            <Icon className="h-3.5 w-3.5" /> قفسه‌ی {cat.name} — بخش {faNumber(idx + 1)} از {faNumber(total)}
          </span>
          <h2 className="mt-4 text-4xl font-black leading-tight text-slate-100 sm:text-5xl lg:text-6xl xl:text-7xl">
            <Link href={`/categories/${cat.slug}`} className="transition-colors hover:text-emerald-400">{cat.name}</Link>
          </h2>
          <p className="mt-4 max-w-md text-xs leading-7 text-slate-400 sm:text-sm sm:leading-8">{tagline}</p>
          <Magnetic className="mt-8">
            <Link
              href={`/categories/${cat.slug}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-green-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-105"
            >
              <Icon className="h-5 w-5" /> ورود به قفسه‌ی {cat.name}
            </Link>
          </Magnetic>
        </div>

        {/* کارت‌های محصول */}
        <div className="grid grid-cols-2 gap-4">
          {isLoading && [1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-light h-44 animate-pulse rounded-2xl" />
          ))}
          {(items || []).slice(0, 4).map((px, i) => (
            <div key={px.id} className={i > 1 ? 'hidden sm:block' : ''}>
              <MiniGlassCard p={px} />
            </div>
          ))}
          {!isLoading && !(items || []).length && (
            <div className="glass-light col-span-2 flex h-44 items-center justify-center rounded-2xl text-sm text-slate-400">
              به‌زودی محصولات این قفسه چیده می‌شوند
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** دسته‌های پیش‌فرض — اگر API هنوز دسته‌ای برنگرداند، قفسه‌ها با این‌ها چیده می‌شوند */
const FALLBACK_CATS: CategoryNode[] = [
  { id: -1, name: 'موبایل', slug: 'mobile', children: [] },
  { id: -2, name: 'ساعت هوشمند', slug: 'smartwatch', children: [] },
  { id: -3, name: 'هدفون و ایرپاد', slug: 'audio', children: [] },
  { id: -4, name: 'لوازم جانبی', slug: 'accessories', children: [] },
];

function CinematicCategoryScroll({ tree }: { tree: CategoryNode[] }) {
  const PRIORITY = ['mobile', 'smartwatch', 'audio'];
  const source = tree && tree.length ? tree : FALLBACK_CATS;
  const cats = [...source]
    .sort((a, b) => {
      const pa = PRIORITY.indexOf(a.slug);
      const pb = PRIORITY.indexOf(b.slug);
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    })
    .slice(0, 8);
  const n = Math.max(cats.length, 1);
  const targetRef = useRef<HTMLElement | null>(null);
  const p = useStickyProgress(targetRef);
  const idx = Math.min(n - 1, Math.max(0, Math.floor(p * n)));

  /* پیش‌بارگذاری محصولات همه قفسه‌ها (موازی) */
  const stageQueries = useQueries({
    queries: cats.map((c) => ({
      queryKey: ['stage-products', c.slug],
      queryFn: async () =>
        (await api<{ items: ProductCardType[] }>('/products' + qs({ category: c.slug, limit: 4, sort: '-soldCount' }))).data.items,
      staleTime: 300_000,
      retry: 1,
    })),
  });

  /* پریدن نرم به قفسه‌ی انتخابی از ریل سمت چپ */
  const jumpTo = (i: number) => {
    const el = targetRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const scrollable = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (i + 0.02) * (scrollable / n), behavior: 'smooth' });
  };

  if (!cats.length) return null;
  return (
    <section ref={targetRef} className={`${FULL}`} style={{ height: `${n * 85 + 30}vh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-gradient-to-br from-[#15191c] via-[#171b1e] to-[#131719]">
        {/* بافت روشن با عمق — عکس واقعی فروشگاه (خیلی کم‌رنگ) + نقطه‌چین + هاله‌های سبز کرمی */}
        <div aria-hidden className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/store-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.14]" />
          <div className="absolute inset-0 bg-grid-dots opacity-40" />
          <div className="animate-aurora pointer-events-none absolute -top-20 right-[12%] h-[26rem] w-[26rem] rounded-full bg-emerald-500/100/20 blur-[120px]" />
          <div className="animate-aurora pointer-events-none absolute bottom-[-10%] left-[8%] h-[22rem] w-[22rem] rounded-full bg-teal-500/15 blur-[110px]" style={{ animationDuration: '28s', animationDelay: '4s' }} />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#121518]/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#121518]/80 to-transparent" />
        </div>

        {/* عنوان ثابت بالای صحنه */}
        <div className="pointer-events-none absolute inset-x-0 top-7 z-30 text-center">
          <span className="rounded-full bg-white/5 px-5 py-1.5 text-2xs font-black tracking-[0.28em] text-slate-400 ring-1 ring-white/15 backdrop-blur">
            قدم به قدم در فروشگاه کارزینتل
          </span>
        </div>

        {/* صحنه‌ها — شفافیت/حرکت‌ هر کدام لحظه‌ای از موقعیت اسکرول محاسبه می‌شود */}
        {cats.map((c, i) => {
          const active = i === idx;
          return (
            <div
              key={c.id}
              aria-hidden={!active}
              className="absolute inset-0 will-change-[opacity,transform]"
              style={{
                opacity: frameWindow(p, i, n, 0.24),
                transform: `translateY(${active ? 0 : 26}px) scale(${active ? 1 : 0.97})`,
                transition: 'opacity .18s linear, transform .3s ease-out',
                pointerEvents: active ? 'auto' : 'none',
                zIndex: active ? 10 : 0,
              }}
            >
              <CategoryStage
                cat={c}
                items={pickProducts(stageQueries[i]?.data, FALLBACK_STAGE_PRODUCTS[c.slug] || FALLBACK_BEST.slice(0, 4))}
                isLoading={!!stageQueries[i]?.isLoading}
                idx={i}
                total={n}
              />
            </div>
          );
        })}

        {/* ریل ناوبری سمت چپ — کلیک = سفر نرم به همان قفسه */}
        <div className="absolute left-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-4 md:flex">
          {cats.map((c, i) => (
            <button key={c.id} onClick={() => jumpTo(i)} className="group flex flex-col items-center gap-4" aria-label={`رفتن به قفسه‌ی ${c.name}`}>
              <span
                className={`rounded-full transition-all duration-500 ${
                  i === idx ? 'h-8 w-2 bg-emerald-500/100 shadow-[0_0_12px_rgba(16,185,129,0.55)]' : 'h-2 w-2 bg-white/20 group-hover:bg-emerald-400/60'
                }`}
              />
              <span className={`text-2xs transition-colors duration-300 ${i === idx ? 'font-black text-emerald-400' : 'text-slate-400 group-hover:text-slate-400'}`}>
                {c.name}
              </span>
            </button>
          ))}
        </div>

        {/* خط پیشرفت پایین */}
        <div className="absolute inset-x-0 bottom-6 z-30 mx-auto h-1 w-56 overflow-hidden rounded-full bg-white/10">
          <div className="h-full origin-right bg-gradient-to-l from-emerald-500 to-teal-400" style={{ transform: `scaleX(${p})` }} />
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- ریل افقی محصولات (قفسه‌ی متحرک فروشگاه)
function GlassProductCard({ p }: { p: ProductCardType }) {
  return (
    <Link
      href={`/products/${p.slug}`}
      className="glass-light group w-64 shrink-0 overflow-hidden rounded-3xl transition hover:-translate-y-1.5 hover:border-emerald-400/60 hover:shadow-xl hover:shadow-emerald-500/10 sm:w-72"
    >
      <div className="relative h-52 overflow-hidden bg-[#10130f]">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><Smartphone className="h-14 w-14" /></div>
        )}
        {!!p.soldCount && (
          <span className="absolute top-3 right-3 rounded-full bg-emerald-600/95 px-2.5 py-1 text-2xs font-black text-white shadow-lg shadow-emerald-600/25">
            پرفروش
          </span>
        )}
      </div>
      <div className="p-4">
        {p.brandName && <p className="text-2xs font-bold text-teal-400">{p.brandName}</p>}
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-6 text-slate-100">{p.name}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-black text-emerald-400">{p.minPrice != null ? toToman(p.minPrice) : '—'}</span>
          {!!p.ratingAvg && (
            <span className="flex items-center gap-1 text-2xs font-bold text-slate-400">
              <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" /> {faNumber(Number(p.ratingAvg).toFixed(1))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function HorizontalRail({ items }: { items: ProductCardType[] }) {
  const targetRef = useRef<HTMLElement | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(800);
  const p = useStickyProgress(targetRef);

  useEffect(() => {
    const measure = () => {
      const el = stripRef.current;
      if (el) setTravel(Math.max(0, el.scrollWidth - window.innerWidth + 48));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [items.length]);

  if (!items.length) return null;
  return (
    <section ref={targetRef} className={`${FULL} relative h-[340vh] bg-gradient-to-b from-[#141a16] to-[#101416]`}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div className="pointer-events-none absolute top-20 left-0 h-80 w-80 rounded-full bg-emerald-500/100/15 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-10 right-0 h-72 w-72 rounded-full bg-teal-500/10 blur-[110px]" />
        <div className="relative mx-auto mb-10 w-full max-w-7xl px-6">
          <span className="rounded-full bg-emerald-500/100/10 px-4 py-1.5 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/30">انتخاب مشتری‌ها</span>
          <h2 className="mt-4 text-3xl font-black text-slate-100 sm:text-4xl">
            با اسکرول، در <GT>قفسه‌های فروشگاه</GT> بچرخ
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-7 text-slate-400">
            محصولاتی که بیشترین رضایت را از خریداران گرفته‌اند؛ یکی‌یکی جلوی چشمت رد می‌شوند.
          </p>
        </div>
        <div
          ref={stripRef}
          className="relative flex w-max gap-6 px-6 will-change-transform"
          style={{ transform: `translateX(${p * travel}px)`, transition: 'transform .12s linear' }}
        >
          {items.map((px) => <GlassProductCard key={px.id} p={px} />)}
          <Link
            href="/search?sort=-soldCount"
            className="glass-light flex w-56 shrink-0 flex-col items-center justify-center gap-3 rounded-3xl text-sm font-black text-emerald-400 transition hover:border-emerald-400/60"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15"><Rocket className="h-6 w-6" /></span>
            مشاهده همه ←
          </Link>
        </div>
        {/* خط پیشرفت ریل */}
        <div className="relative mx-auto mt-10 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full origin-right bg-gradient-to-l from-emerald-500 to-teal-400" style={{ transform: `scaleX(${p})` }} />
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- آمار — نوار سبز امضای برند
function StatsBand() {
  const stats = [
    { label: 'محصول فعال', value: 5200, suffix: '+', icon: Cpu },
    { label: 'مشتری خوشحال', value: 48000, suffix: '+', icon: BadgeCheck },
    { label: 'سفارش موفق', value: 96000, suffix: '+', icon: Truck },
    { label: 'رضایت خرید', value: 97, suffix: '٪', icon: Star },
  ];
  return (
    <section className={`${FULL} bg-gradient-to-l from-emerald-600 via-green-600 to-emerald-700 py-16`}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08}>
            <div className="rounded-2xl bg-white/10 p-6 text-center ring-1 ring-white/20 backdrop-blur-sm">
              <s.icon className="mx-auto mb-3 h-7 w-7 text-emerald-100" />
              <p className="text-3xl font-black text-white"><CountUp to={s.value} suffix={s.suffix} /></p>
              <p className="mt-1 text-xs font-bold text-emerald-100/90">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// --------------------------------------------------------------- اعتماد
function TrustRow() {
  const items = [
    { icon: ShieldCheck, title: 'ضمانت اصالت کالا', desc: 'هر محصول با گارانتی معتبر و رسمی' },
    { icon: Truck, title: 'ارسال سریع سراسری', desc: 'پست، تیپاکس و پیک ویژه تهران' },
    { icon: Zap, title: 'پرداخت امن', desc: 'چند درگاه رسمی و شتابی بانکی' },
    { icon: BadgeCheck, title: '۷ روز مهلت بازگشت', desc: 'بازگرداندن کالا بدون قید و شرط' },
  ];
  return (
    <section className={`${FULL} bg-transparent py-20`}>
      <RevealGroup className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 lg:grid-cols-4" step={0.08}>
        {items.map((f) => (
          <motion.div key={f.title} variants={revealItem}>
            <TiltCard amount={8} className="glass-light h-full rounded-2xl p-5">
              <f.icon className="mb-3 h-6 w-6 text-emerald-400" />
              <p className="text-sm font-black text-slate-100">{f.title}</p>
              <p className="mt-1.5 text-2xs leading-5 text-slate-400">{f.desc}</p>
            </TiltCard>
          </motion.div>
        ))}
      </RevealGroup>
    </section>
  );
}

// --------------------------------------------------------------- CTA نهایی
function FinaleCTA() {
  return (
    <section className={`${FULL} bg-gradient-to-b from-[#12161a] to-emerald-950/40 py-24`}>
      <Reveal className="mx-auto max-w-4xl px-6">
        <div className="rounded-[2rem] bg-gradient-to-l from-emerald-400/60 via-teal-400/40 to-emerald-400/60 p-[1.5px] shadow-2xl shadow-emerald-500/10">
          <div className="glass-light rounded-[calc(2rem-1.5px)] p-10 text-center sm:p-16">
            <Parallax speed={0.4}>
              <h2 className="text-3xl font-black leading-normal text-slate-100 sm:text-5xl sm:leading-normal">
                انتخابِ درست، فقط یک <GT>قدم</GT> با شما فاصله دارد
              </h2>
            </Parallax>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-8 text-slate-400">
              اصالت تضمین‌شده، قیمت رقابتی، ارسال سریع و پشتیبانی واقعی — آنچه یک خرید حرفه‌ای را کامل می‌کند، همین‌جاست.
            </p>
            <Magnetic className="mt-9">
              <Link
                href="/search"
                className="pulse-glow inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-green-600 px-10 py-4 text-base font-black text-white shadow-xl shadow-emerald-500/25 transition-transform hover:scale-105"
              >
                <Rocket className="h-5 w-5" /> ورود به فروشگاه
              </Link>
            </Magnetic>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// --------------------------------------------------------------- سکشن فروشگاهی کلاسیک
function ShopSection({ title, desc, href, children }: { title: string; desc?: string; href?: string; children: React.ReactNode }) {
  return (
    <Reveal className="mt-14">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-xl font-black text-slate-100">
            <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-emerald-500 to-green-600" />
            {title}
          </h2>
          {desc && <p className="mt-2 pr-4 text-xs text-slate-400">{desc}</p>}
        </div>
        {href && <Link href={href} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-slate-400 transition hover:bg-emerald-600 hover:text-white">مشاهده همه ←</Link>}
      </div>
      {children}
    </Reveal>
  );
}

// --------------------------------------------------------------- صفحه اصلی
export default function HomePage() {
  const { data: tree } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: async () => (await api<CategoryNode[]>('/categories')).data,
    staleTime: 300_000,
    retry: 1,
  });

  const { data: newest, isLoading: loadingNew } = useQuery({
    queryKey: ['products', 'newest'],
    queryFn: async () => (await api<{ items: ProductCardType[] }>('/products' + qs({ sort: '-publishedAt', limit: 10 }))).data.items,
    retry: 1,
  });

  const { data: bestSellers } = useQuery({
    queryKey: ['products', 'best'],
    queryFn: async () => (await api<{ items: ProductCardType[] }>('/products' + qs({ sort: '-soldCount', limit: 12 }))).data.items,
    retry: 1,
  });

  const newestItems = pickProducts(newest, FALLBACK_NEWEST);
  const bestItems = pickProducts(bestSellers, FALLBACK_BEST);

  return (
    <div>
      <ScrollProgress />

      {/* 📦 آنباکسینگ سینمایی — سه اسکرول تا پرچمدار */}
      <CinematicHero />
      <BrandStrip />

      {/* 🏬 قدم‌گذاشتن در فروشگاه — قفسه‌به‌قفسه */}
      <CinematicCategoryScroll tree={tree || []} />

      {/* 🛒 قفسه‌ی متحرک پرفروش‌ها */}
      <HorizontalRail items={bestItems} />

      {/* 💚 نوار آماری برند */}
      <StatsBand />
      <TrustRow />
      <FinaleCTA />

      {/* 🛍 فروشگاه کلاسیک */}
      <div className="pb-4 pt-2">
        <ShopSection title="تازه‌رسیده‌ها" desc="جدیدترین مدل‌هایی که همین روزها به قفسه‌های کارزینتل رسیده‌اند" href="/search?sort=-publishedAt">
          {loadingNew ? <PageLoading /> : <ProductGrid items={newestItems} />}
        </ShopSection>

        <ShopSection title="منتخب کارشناس‌ها" desc="گزیده‌ای که تیم خرید ما با وسواس انتخاب کرده است" href="/search">
          <ProductGrid items={bestItems.slice(0, 5)} />
        </ShopSection>
      </div>
    </div>
  );
}
