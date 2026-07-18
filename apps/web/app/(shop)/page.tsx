'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { motion, MotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  BadgeCheck, ChevronDown, Cpu, Flame, Headphones, Laptop, Rocket, ShieldCheck, ShoppingBag,
  Smartphone, Star, Truck, Watch, Zap,
} from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { toToman, faNumber } from '@/lib/format';
import { CategoryNode, ProductCardType } from '@/lib/types';
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
  <span className="bg-gradient-to-l from-emerald-600 via-green-500 to-teal-500 bg-clip-text text-transparent">{children}</span>
);

// --------------------------------------------------------------- هیرو — امضای نئونی برند (تیره) با موشن زنده
const HERO_SEEDS: Array<[string, string, string]> = [
  ['8%', '20%', '0s'], ['15%', '55%', '.6s'], ['12%', '78%', '1.1s'], ['22%', '35%', '1.7s'],
  ['28%', '65%', '.4s'], ['36%', '25%', '2s'], ['42%', '70%', '.9s'], ['50%', '40%', '1.4s'],
  ['58%', '60%', '2.2s'], ['66%', '30%', '.2s'], ['74%', '55%', '1.8s'], ['82%', '25%', '1s'],
  ['88%', '70%', '.7s'], ['94%', '45%', '2.4s'], ['48%', '85%', '1.5s'], ['70%', '88%', '.8s'],
];

function CinematicHero() {
  return (
    <section className={`${FULL} cinema cinema-grain min-h-[94svh] overflow-hidden`}>
      <h1 className="sr-only">کارزینتل | فروشگاه موبایل، ساعت هوشمند، هدفون و قطعات الکترونیک</h1>

      {/* پس‌زمینه: K مداری نئونی — نئون‌ها نفس می‌کشند و نور سبز ساطع می‌کنند */}
      <div aria-hidden className="absolute inset-0">
        <div className="animate-neon-drift absolute inset-0 bg-[url('/assets/neon-k-bg.jpg')] bg-cover bg-center opacity-60" />

        {/* موج نورانی که هر چند ثانیه روی مدار K جاری می‌شود */}
        <div className="neon-surge left-[6%] top-[10%] h-[80%] w-[46%] rounded-full" />
        <div className="neon-surge left-[-4%] top-[22%] h-[58%] w-[30%] rounded-full" style={{ animationDelay: '4.5s' }} />

        {/* رشته‌نورهای شهابی سبز — عبور آرام و بدون آزار چشم */}
        <i className="neon-comet top-[30%]" style={{ animationDelay: '1s' }} />
        <i className="neon-comet top-[44%]" style={{ animationDelay: '6s', animationDuration: '15s' }} />
        <i className="neon-comet top-[21%]" style={{ animationDelay: '9.5s', animationDuration: '10s', width: '160px' }} />

        {/* ذرات سبز درخشان شناور */}
        {HERO_SEEDS.map(([x, y, d], i) => (
          <i key={i} className="neon-seed" style={{ left: x, top: y, animationDelay: d }} />
        ))}

        {/* هاله‌های نبض‌دار سبز ملایم */}
        <div className="animate-neon-pulse pointer-events-none absolute top-1/4 right-1/4 h-80 w-80 rounded-full bg-emerald-500/15 blur-[130px]" />
        <div className="animate-neon-pulse pointer-events-none absolute bottom-10 left-1/5 h-72 w-72 rounded-full bg-green-400/10 blur-[120px]" style={{ animationDelay: '2s' }} />

        {/* محو تدریجی برای خوانایی و اتصال نرم به سکشن روشن بعدی */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#05080f]/55 via-transparent to-[#05080f]" />
      </div>

      {/* محتوا */}
      <div className="relative z-10 mx-auto flex min-h-[94svh] max-w-6xl flex-col items-center justify-center px-6 text-center">
        <Reveal delay={0.05} y={18}>
          <span className="glass-dark inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-2xs font-bold text-emerald-300">
            <ShoppingBag className="h-3.5 w-3.5" /> واردات و فروش تخصصی قطعات و گجت‌های الکترونیک
          </span>
        </Reveal>

        <Reveal delay={0.15} y={28}>
          <p className="mt-6 max-w-2xl text-base leading-9 text-slate-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-xl sm:leading-10">
            از پرچمداران موبایل تا ظریف‌ترین قطعات — هر گجتی که به ذهنت می‌رسد این‌جاست؛
            با اصالتِ تضمین‌شده، قیمتِ رقابتی و پشتیبانی واقعی.
          </p>
        </Reveal>

        <Reveal delay={0.28} y={22}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Magnetic>
              <Link
                href="/search"
                className="pulse-glow inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-green-600 px-7 py-3.5 text-sm font-black text-slate-950 transition-transform hover:scale-105"
              >
                <Zap className="h-4.5 w-4.5" /> شروع خرید
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                href="/blog"
                className="glass-dark inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-300"
              >
                <Flame className="h-4.5 w-4.5 text-green-400" /> راهنمای انتخاب هوشمند
              </Link>
            </Magnetic>
          </div>
        </Reveal>

        {/* نشانگر اسکرول */}
        <motion.div
          className="absolute bottom-8 flex flex-col items-center gap-1 text-slate-400"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          <span className="text-2xs">قدم به فروشگاه بگذار</span>
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- نوار برندها (روشن)
function BrandStrip() {
  const brands = ['سامسونگ', 'اپل', 'شیائومی', 'انکر', 'جی‌بی‌ال', 'سونی', 'هوآوی', 'ریلمی', 'ونوس', 'گرین‌لاین'];
  return (
    <section className={`${FULL} border-y border-slate-200/80 bg-white py-2`}>
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

// --------------------------------------------------------------- اسکرول سینمایی فروشگاه (ورود به قفسه‌ی هر دسته) — بهینه‌شده
function MiniGlassCard({ p }: { p: ProductCardType }) {
  return (
    <Link
      href={`/products/${p.slug}`}
      className="glass-light group overflow-hidden rounded-2xl transition hover:-translate-y-1 hover:border-emerald-300"
    >
      <div className="relative h-28 overflow-hidden bg-slate-50 sm:h-36">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><Smartphone className="h-10 w-10" /></div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-2xs font-bold text-slate-700 sm:text-xs">{p.name}</h3>
        <p className="mt-1 text-xs font-black text-emerald-600 sm:text-sm">{p.minPrice != null ? toToman(p.minPrice) : '—'}</p>
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
      <div className="pointer-events-none absolute -top-16 right-8 h-96 w-96 rounded-full bg-emerald-200/50 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 left-8 h-80 w-80 rounded-full bg-teal-100/60 blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 lg:grid-cols-2">
        {/* متن و CTA */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-2xs font-black text-emerald-700 ring-1 ring-emerald-200">
            <Icon className="h-3.5 w-3.5" /> قفسه‌ی {cat.name} — بخش {faNumber(idx + 1)} از {faNumber(total)}
          </span>
          <h2 className="mt-5 text-5xl font-black leading-tight text-slate-900 sm:text-7xl">
            <Link href={`/categories/${cat.slug}`} className="transition-colors hover:text-emerald-600">{cat.name}</Link>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-8 text-slate-600">{tagline}</p>
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
          {(items || []).slice(0, 4).map((px) => <MiniGlassCard key={px.id} p={px} />)}
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

/** هر صحنه با خودِ اسکرول نرم ظاهر/محو می‌شود (crossfade پیوسته و کوپله با حرکت انگشت) */
function StageView({ progress, idx, total, children, active }: { progress: MotionValue<number>; idx: number; total: number; children: React.ReactNode; active: boolean }) {
  const seg = 1 / total;
  const start = idx * seg;
  const tIn = start + (idx === 0 ? 0 : seg * 0.22);
  const tOut = start + seg - (idx === total - 1 ? 0 : seg * 0.22);
  const end = start + seg;

  const opacity = useTransform(
    progress,
    idx === 0 ? [0, tOut, end] : idx === total - 1 ? [start, tIn, 1] : [start, tIn, tOut, end],
    idx === 0 ? [1, 1, 0] : idx === total - 1 ? [0, 1, 1] : [0, 1, 1, 0],
  );
  const y = useTransform(progress, [start, end], [idx === 0 ? 0 : 56, idx === total - 1 ? 0 : -56]);
  const scale = useTransform(
    progress,
    idx === 0 ? [0, tOut, end] : idx === total - 1 ? [start, tIn, 1] : [start, tIn, tOut, end],
    idx === 0 ? [1, 1, 0.965] : idx === total - 1 ? [0.965, 1, 1] : [0.965, 1, 1, 0.965],
  );

  if (total === 1) return <div className="absolute inset-0">{children}</div>;
  return (
    <motion.div
      style={{ opacity, y, scale, pointerEvents: active ? 'auto' : 'none', zIndex: active ? 10 : 0 }}
      aria-hidden={!active}
      className="absolute inset-0"
    >
      {children}
    </motion.div>
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
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ['start start', 'end end'] });
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setIdx(Math.min(n - 1, Math.max(0, Math.floor(v * n))));
  });

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
    <section ref={targetRef} className={`${FULL} relative`} style={{ height: `${n * 100 + 45}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-white">
        {/* بک‌گراند عکس فروشگاه واقعی با نفسِ آرام */}
        <div aria-hidden className="absolute inset-0">
          <div className="animate-soft-zoom absolute inset-0 bg-[url('/assets/store-bg.jpg')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-white/84" />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
        </div>

        {/* عنوان ثابت بالای صحنه */}
        <div className="pointer-events-none absolute inset-x-0 top-7 z-30 text-center">
          <span className="rounded-full bg-white/80 px-5 py-1.5 text-2xs font-black tracking-[0.28em] text-slate-500 ring-1 ring-slate-200 backdrop-blur">
            قدم به قدم در فروشگاه کارزینتل
          </span>
        </div>

        {/* صحنه‌ها — همه سوار بر یک اسکرول پیوسته */}
        {cats.map((c, i) => (
          <StageView key={c.id} progress={scrollYProgress} idx={i} total={n} active={i === idx}>
            <CategoryStage
              cat={cats[i]}
              items={pickProducts(stageQueries[i]?.data, FALLBACK_STAGE_PRODUCTS[c.slug] || FALLBACK_BEST.slice(0, 4))}
              isLoading={!!stageQueries[i]?.isLoading}
              idx={i}
              total={n}
            />
          </StageView>
        ))}

        {/* ریل ناوبری سمت چپ — کلیک = سفر نرم به همان قفسه */}
        <div className="absolute left-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-4 md:flex">
          {cats.map((c, i) => (
            <button key={c.id} onClick={() => jumpTo(i)} className="group flex flex-col items-center gap-4" aria-label={`رفتن به قفسه‌ی ${c.name}`}>
              <span
                className={`rounded-full transition-all duration-500 ${
                  i === idx ? 'h-8 w-2 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]' : 'h-2 w-2 bg-slate-300 group-hover:bg-emerald-300'
                }`}
              />
              <span className={`text-2xs transition-colors duration-300 ${i === idx ? 'font-black text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'}`}>
                {c.name}
              </span>
            </button>
          ))}
        </div>

        {/* خط پیشرفت پایین */}
        <div className="absolute inset-x-0 bottom-6 z-30 mx-auto h-1 w-56 overflow-hidden rounded-full bg-slate-200">
          <motion.div className="h-full origin-right bg-gradient-to-l from-emerald-500 to-teal-400" style={{ scaleX: scrollYProgress }} />
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- ریل افقی محصولات (قفسه‌ی متحرک فروشگاه) — روشن
function GlassProductCard({ p }: { p: ProductCardType }) {
  return (
    <Link
      href={`/products/${p.slug}`}
      className="glass-light group w-64 shrink-0 overflow-hidden rounded-3xl transition hover:-translate-y-1.5 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10 sm:w-72"
    >
      <div className="relative h-52 overflow-hidden bg-slate-50">
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
        {p.brandName && <p className="text-2xs font-bold text-teal-600">{p.brandName}</p>}
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-6 text-slate-800">{p.name}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-black text-emerald-700">{p.minPrice != null ? toToman(p.minPrice) : '—'}</span>
          {!!p.ratingAvg && (
            <span className="flex items-center gap-1 text-2xs font-bold text-slate-500">
              <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" /> {faNumber(Number(p.ratingAvg).toFixed(1))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function HorizontalRail({ items }: { items: ProductCardType[] }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(800);

  useEffect(() => {
    const measure = () => {
      const el = stripRef.current;
      if (el) setTravel(Math.max(0, el.scrollWidth - window.innerWidth + 48));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [items.length]);

  const { scrollYProgress } = useScroll({ target: targetRef, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0, 1], [0, travel]);
  const smoothX = useSpring(x, { stiffness: 90, damping: 22 });

  if (!items.length) return null;
  return (
    <section ref={targetRef} className={`${FULL} relative h-[340vh] bg-[#f6f8f7]`}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="pointer-events-none absolute top-20 left-0 h-80 w-80 rounded-full bg-emerald-100/80 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-10 right-0 h-72 w-72 rounded-full bg-teal-100/70 blur-[110px]" />
        <div className="relative mx-auto mb-10 w-full max-w-7xl px-6">
          <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">انتخاب مشتری‌ها</span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
            با اسکرول، در <GT>قفسه‌های فروشگاه</GT> بچرخ
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-7 text-slate-500">
            محصولاتی که بیشترین رضایت را از خریداران گرفته‌اند؛ یکی‌یکی جلوی چشمت رد می‌شوند.
          </p>
        </div>
        <motion.div ref={stripRef} style={{ x: smoothX }} className="relative flex w-max gap-6 px-6">
          {items.map((p) => <GlassProductCard key={p.id} p={p} />)}
          <Link
            href="/search?sort=-soldCount"
            className="glass-light flex w-56 shrink-0 flex-col items-center justify-center gap-3 rounded-3xl text-sm font-black text-emerald-700 transition hover:border-emerald-300"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"><Rocket className="h-6 w-6" /></span>
            مشاهده همه ←
          </Link>
        </motion.div>
        {/* خط پیشرفت ریل */}
        <div className="relative mx-auto mt-10 h-1 w-48 overflow-hidden rounded-full bg-slate-200">
          <motion.div className="h-full origin-right bg-gradient-to-l from-emerald-500 to-teal-400" style={{ scaleX: scrollYProgress }} />
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
    <section className={`${FULL} bg-white py-20`}>
      <RevealGroup className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 lg:grid-cols-4" step={0.08}>
        {items.map((f) => (
          <motion.div key={f.title} variants={revealItem}>
            <TiltCard amount={8} className="glass-light h-full rounded-2xl p-5">
              <f.icon className="mb-3 h-6 w-6 text-emerald-600" />
              <p className="text-sm font-black text-slate-800">{f.title}</p>
              <p className="mt-1.5 text-2xs leading-5 text-slate-500">{f.desc}</p>
            </TiltCard>
          </motion.div>
        ))}
      </RevealGroup>
    </section>
  );
}

// --------------------------------------------------------------- CTA نهایی — نسخه روشن با قاب گرادیانی
function FinaleCTA() {
  return (
    <section className={`${FULL} bg-gradient-to-b from-white to-emerald-50/70 py-24`}>
      <Reveal className="mx-auto max-w-4xl px-6">
        <div className="rounded-[2rem] bg-gradient-to-l from-emerald-300 via-teal-200 to-emerald-300 p-[1.5px] shadow-2xl shadow-emerald-500/10">
          <div className="glass-light rounded-[calc(2rem-1.5px)] p-10 text-center sm:p-16">
            <Parallax speed={0.4}>
              <h2 className="text-3xl font-black leading-normal text-slate-900 sm:text-5xl sm:leading-normal">
                انتخابِ درست، فقط یک <GT>قدم</GT> با شما فاصله دارد
              </h2>
            </Parallax>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-8 text-slate-600">
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
          <h2 className="flex items-center gap-3 text-xl font-black text-slate-900">
            <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-emerald-500 to-green-600" />
            {title}
          </h2>
          {desc && <p className="mt-2 pr-4 text-xs text-slate-400">{desc}</p>}
        </div>
        {href && <Link href={href} className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-emerald-600 hover:text-white">مشاهده همه ←</Link>}
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

      {/* 🎬 امضای نئونی برند */}
      <CinematicHero />
      <BrandStrip />

      {/* 🏬 قدم‌گذاشتن در فروشگاه — قفسه‌به‌قفسه با اسکرول سینمایی بهینه */}
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
