'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, MotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  BadgeCheck, ChevronDown, Cpu, Headphones, Laptop, Rocket, ShieldCheck, ShoppingBag, Smartphone,
  Sparkles, Star, Truck, Watch, Zap,
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

// =============================================================== هیرو — آنباکسینگ سینمایی آیفون ۱۷ پرو (زمینه ذغالی)
/* سه اسکرول = سه سکانس: بازشدن درِ جعبه → بیرون‌آمدن محتویات → پرده‌برداری از گوشی */
const UNBOX_FRAMES = [
  { src: '/assets/unbox/ib1-closed.jpg', alt: 'جعبه سفید آیفون ۱۷ پرو با عکس گوشی روی بدنه، روی میز ذغالی' },
  { src: '/assets/unbox/ib2-opening.jpg', alt: 'درِ جعبه آیفون در حال باز شدن با نور سبز و ذرات نورانی' },
  { src: '/assets/unbox/ib3-accessories.jpg', alt: 'کابل بافت سفید و لوازم آیفون شناور بالای جعبه باز' },
  { src: '/assets/unbox/ib4-phone.jpg', alt: 'آیفون ۱۷ پرو سبز با نوار دوربین تمام‌عرض، ایستاده با نور سبز' },
];

const UNBOX_COPY = [
  {
    step: 'رویداد ویژه',
    title: 'جعبه روی میز است…',
    desc: 'فقط سه اسکرول با تجربه‌ی یک آنباکسینگ واقعی فاصله داری.',
  },
  {
    step: 'اسکرول اول',
    title: 'درِ جعبه باز شد.',
    desc: 'نوری که از این شکاف بیرون می‌زند، از دلِ فناوری است.',
  },
  {
    step: 'اسکرول دوم',
    title: 'همه‌چیز سر جای خودش.',
    desc: 'کابل بافت USB-C، پین سیم‌کارت و شناسنامه‌ی دستگاه — مرتب و آماده.',
  },
  {
    step: 'اسکرول سوم',
    title: 'آیفون ۱۷ پرو رسید.',
    desc: 'پرچمدار جدید، همین حالا در قفسه‌ی کارزینتل — با گارانتی رسمی و قیمت رقابتی.',
  },
];

const UNBOX_DOT_LABELS = ['جعبه', 'بازشدن', 'محتویات', 'دستگاه'];

/* ذرات ذغالی‌رنگ برای فضای صحنه */
const CHARCOAL_SEEDS: Array<[string, string, string]> = [
  ['12%', '30%', '0s'], ['20%', '68%', '1.2s'], ['33%', '22%', '.8s'], ['82%', '26%', '1.5s'],
  ['90%', '58%', '.5s'], ['72%', '80%', '2s'], ['45%', '15%', '1.8s'], ['8%', '82%', '2.3s'],
];

/** هر فریم تصویر — کوپل با خودِ اسکرول: کراس‌فید + پوش‌این لنز */
function UnboxFrame({ progress, idx, total, src, alt }: { progress: MotionValue<number>; idx: number; total: number; src: string; alt: string }) {
  const seg = 1 / total;
  const start = idx * seg;
  const tIn = start + (idx === 0 ? 0 : seg * 0.34);
  const tOut = start + seg - (idx === total - 1 ? 0 : seg * 0.34);
  const end = start + seg;

  const opacity = useTransform(
    progress,
    idx === 0 ? [0, tOut, end] : idx === total - 1 ? [start, tIn, 1] : [start, tIn, tOut, end],
    idx === 0 ? [1, 1, 0] : idx === total - 1 ? [0, 1, 1] : [0, 1, 1, 0],
  );
  const scale = useTransform(progress, [start, end], [1.02, 1.08]);
  const y = useTransform(progress, [start, end], [idx === 0 ? 0 : 22, -20]);

  return (
    <motion.div style={{ opacity, scale, y }} className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className="h-full w-full select-none object-cover object-center" />
    </motion.div>
  );
}

function CinematicHero() {
  const total = UNBOX_FRAMES.length; // 4 فریم = 3 اسکرول
  const targetRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ['start start', 'end end'] });
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setIdx(Math.min(total - 1, Math.max(0, Math.floor(v * total))));
  });

  const jumpTo = (i: number) => {
    const el = targetRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const scrollable = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (i + 0.02) * (scrollable / total), behavior: 'smooth' });
  };

  const copy = UNBOX_COPY[idx];
  return (
    <section ref={targetRef} className={`${FULL} relative`} style={{ height: `${total * 100 + 35}vh` }}>
      <h1 className="sr-only">کارزینتل | فروشگاه موبایل، ساعت هوشمند، هدفون و قطعات الکترونیک — آنباکسینگ آیفون ۱۷ پرو</h1>

      <div className="cinema-grain sticky top-0 h-[100svh] overflow-hidden bg-[#14171a]">
        {/* نور صحنه: پایه نور سبز زیر محصول + وینیت ذغالی */}
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-x-0 bottom-0 top-[45%] bg-[radial-gradient(60%_55%_at_50%_78%,rgba(16,185,129,.16),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_55%,rgba(9,11,12,.55))]" />
          {CHARCOAL_SEEDS.map(([x, y, d], i) => (
            <i key={i} className="neon-seed" style={{ left: x, top: y, animationDelay: d, opacity: 0.35 }} />
          ))}
        </div>

        {/* چهار فریم آنباکسینگ */}
        {UNBOX_FRAMES.map((f, i) => (
          <UnboxFrame key={f.src} progress={scrollYProgress} idx={i} total={total} src={f.src} alt={f.alt} />
        ))}

        {/* محو پایین برای خوانایی کپشن */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#0a0d0e]/85 to-transparent" />

        {/* نشان رویداد بالای صحنه */}
        <div className="pointer-events-none absolute inset-x-0 top-7 z-20 text-center">
          <span className="glass-dark inline-flex items-center gap-2 rounded-full px-5 py-1.5 text-2xs font-black tracking-[0.2em] text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> رویداد ویژه: سری پرو جدید
          </span>
        </div>

        {/* کپشن هر سکانس — با تعویض صحنه، نرم عوض می‌شود */}
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -22, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-28 right-6 z-20 max-w-sm text-right sm:bottom-24 sm:right-14"
          >
            <span className="text-2xs font-black tracking-[0.25em] text-emerald-400">{copy.step}</span>
            <h2 className="mt-2 text-3xl font-black leading-snug text-white sm:text-4xl">{copy.title}</h2>
            <p className="mt-3 text-xs leading-7 text-slate-300/90 sm:text-sm sm:leading-7">{copy.desc}</p>

            {idx === total - 1 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-6 flex flex-wrap justify-end gap-3"
              >
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
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ناوبری سکانس‌ها — سمت چپ */}
        <div className="absolute left-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-4 md:flex">
          {UNBOX_DOT_LABELS.map((label, i) => (
            <button key={label} onClick={() => jumpTo(i)} className="group flex flex-col items-center gap-4" aria-label={`رفتن به سکانس ${label}`}>
              <span
                className={`rounded-full transition-all duration-500 ${
                  i === idx ? 'h-8 w-2 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'h-2 w-2 bg-slate-600 group-hover:bg-emerald-500/60'
                }`}
              />
              <span className={`text-2xs transition-colors duration-300 ${i === idx ? 'font-black text-emerald-300' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* خط پیشرفت پایین */}
        <div className="absolute inset-x-0 bottom-6 z-20 mx-auto h-1 w-56 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full origin-right bg-gradient-to-l from-emerald-400 to-teal-300" style={{ scaleX: scrollYProgress }} />
        </div>

        {/* راهنمای اسکرول — فقط سکانس اول */}
        <motion.div
          className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-slate-400"
          animate={{ y: [0, 10, 0], opacity: idx === 0 ? 1 : 0 }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          <span className="text-2xs font-bold">اسکرول کن — جعبه باز می‌شود</span>
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

// --------------------------------------------------------------- اسکرول سینمایی فروشگاه (ورود به قفسه‌ی هر دسته)
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

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-6 px-6 pt-24 sm:gap-8 sm:pt-16 lg:grid-cols-2 lg:pt-0">
        {/* متن و CTA */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-2xs font-black text-emerald-700 ring-1 ring-emerald-200">
            <Icon className="h-3.5 w-3.5" /> قفسه‌ی {cat.name} — بخش {faNumber(idx + 1)} از {faNumber(total)}
          </span>
          <h2 className="mt-4 text-4xl font-black leading-tight text-slate-900 sm:text-5xl lg:text-6xl xl:text-7xl">
            <Link href={`/categories/${cat.slug}`} className="transition-colors hover:text-emerald-600">{cat.name}</Link>
          </h2>
          <p className="mt-4 max-w-md text-xs leading-7 text-slate-600 sm:text-sm sm:leading-8">{tagline}</p>
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
    <section ref={targetRef} className={`${FULL} relative`} style={{ height: `${n * 85 + 30}vh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-gradient-to-br from-[#e2e7e4] via-[#edf1ee] to-[#dde4e0]">
        {/* بافت روشن با عمق — نقطه‌چین + هاله‌های سبز کرمی (بدون عکس) */}
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-grid-dots opacity-40" />
          <div className="animate-aurora pointer-events-none absolute -top-20 right-[12%] h-[26rem] w-[26rem] rounded-full bg-emerald-300/35 blur-[120px]" />
          <div className="animate-aurora pointer-events-none absolute bottom-[-10%] left-[8%] h-[22rem] w-[22rem] rounded-full bg-teal-200/50 blur-[110px]" style={{ animationDuration: '28s', animationDelay: '4s' }} />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/70 to-transparent" />
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

// --------------------------------------------------------------- ریل افقی محصولات (قفسه‌ی متحرک فروشگاه)
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
    <section ref={targetRef} className={`${FULL} relative h-[340vh] bg-gradient-to-b from-[#e7ece9] to-[#f0f3f1]`}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
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
    <section className={`${FULL} bg-transparent py-20`}>
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

// --------------------------------------------------------------- CTA نهایی
function FinaleCTA() {
  return (
    <section className={`${FULL} bg-gradient-to-b from-[#edf1ee] to-emerald-100/60 py-24`}>
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
