'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BadgeCheck, Cpu, Headphones, Laptop, Rocket, ShieldCheck, Smartphone,
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

// =============================================================== هیرو — کاور اختصاصی برند به‌عنوان پس‌زمینه با متن‌های اصلی سایت
/* تصویر: assets/hero-cover.png | متن‌ها همان پیام‌های همیشگی هیرو، روی تصویر */

function CinematicHero() {
  return (
    <section className={`${FULL} relative flex min-h-[94svh] items-center justify-center overflow-hidden bg-[#0c0f10] text-center`}>
      <h1 className="sr-only">کارزینتل | فروشگاه موبایل، ساعت هوشمند، هدفون و قطعات الکترونیک — با ضمانت اصالت و ارسال سریع</h1>

      {/* پیش‌بارگذاری پُستر؛ تا لحظه‌ی آماده‌شدن ویدیو نمایش داده می‌شود */}
      <link rel="preload" as="image" href="/assets/hero-cover.png" />

      {/* ویدیوی هیرو — از ابتدای باز شدن صفحه پخش می‌شود */}
      <video
        src="/assets/hero-cover2.mp4"
        poster="/assets/hero-cover.png"
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        preload="auto"
        className="absolute inset-0 h-full w-full select-none object-cover object-center"
      />

      {/* لایه‌ی تیره برای خوانایی متن روی تصویر */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_20%,rgba(5,7,8,0.30)_0%,rgba(5,7,8,0.72)_100%)]" />
      {/* هاله‌ی نئونی امضای برند در پایین */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-emerald-500/15 via-emerald-500/5 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-6 py-24">
        <h2 className="animate-caption-in text-3xl font-black leading-snug text-white sm:text-4xl lg:text-5xl">
          <span className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">کارزین</span>{' '}
          <span className="bg-gradient-to-b from-emerald-400 to-emerald-600 bg-clip-text text-transparent">تل</span>
          ؛ <GT>قلب تپنده‌ی تکنولوژی</GT>
        </h2>

        <p className="animate-caption-in mt-5 text-lg font-extrabold text-slate-100 sm:text-xl" style={{ animationDelay: '.15s' }}>
          فروشگاه آنلاین قطعات و گجت‌های الکترونیک
        </p>

        <p className="animate-caption-in mx-auto mt-3 max-w-xl text-xs leading-6 text-slate-300/95 sm:text-sm sm:leading-7" style={{ animationDelay: '.25s' }}>
          جدیدترین پرچمداران، قطعات تخصصی، ساعت هوشمند و لوازم جانبی با ضمانت اصالت کالا و ارسال سریع به سراسر ایران
        </p>
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

// --------------------------------------------------------------- اسکرول سینمایی فروشگاه (ورود به قفسه‌ی هر دسته)
/* محصولات فقط از API می‌آیند؛ هیچ محصول نمایشی/الکی در فرانت هاردکد نشده است.
   اگر دسته‌ای محصولی نداشت، پیام «به‌زودی» نشان داده می‌شود. */
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
                items={stageQueries[i]?.data || []}
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

  const newestItems = newest || [];
  const bestItems = bestSellers || [];

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

      {/* 🛍 فروشگاه کلاسیک — فقط اگر محصول واقعی از API آمده باشد */}
      <div className="pb-4 pt-2">
        {newestItems.length > 0 && (
          <ShopSection title="تازه‌رسیده‌ها" desc="جدیدترین مدل‌هایی که همین روزها به قفسه‌های کارزینتل رسیده‌اند" href="/search?sort=-publishedAt">
            {loadingNew ? <PageLoading /> : <ProductGrid items={newestItems} />}
          </ShopSection>
        )}

        {bestItems.length > 0 && (
          <ShopSection title="منتخب کارشناس‌ها" desc="گزیده‌ای که تیم خرید ما با وسواس انتخاب کرده است" href="/search">
            <ProductGrid items={bestItems.slice(0, 5)} />
          </ShopSection>
        )}
      </div>
    </div>
  );
}


