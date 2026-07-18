'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  BadgeCheck, ChevronDown, Cpu, Flame, Headphones, Laptop, Rocket, ShieldCheck, Smartphone,
  Star, Truck, Watch, Zap,
} from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { toToman, faNumber } from '@/lib/format';
import { CategoryNode, ProductCardType } from '@/lib/types';
import { ProductGrid } from '@/components/product-card';
import { PageLoading } from '@/components/ui';
import {
  CountUp, GradientText, Magnetic, Marquee, Parallax, Reveal, RevealGroup, ScrollProgress, TiltCard, revealItem,
} from '@/components/cinematic/fx';

const HeroScene = dynamic(() => import('@/components/cinematic/scene3d').then((m) => m.HeroScene), { ssr: false });

/* فرار از قاب max-w-7xl برای سکشن‌های تمام‌قد سینمایی */
const FULL = 'relative left-1/2 right-1/2 -mx-[50vw] w-screen';

const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  mobile: Smartphone, smartwatch: Watch, audio: Headphones, laptop: Laptop, accessories: Cpu,
};

// --------------------------------------------------------------- هیرو سه‌بعدی
function CinematicHero() {
  return (
    <section className={`${FULL} cinema cinema-grain min-h-[94svh] overflow-hidden`}>
      <h1 className="sr-only">کارزینتل | فروشگاه موبایل، ساعت هوشمند، هدفون و قطعات الکترونیک</h1>
      {/* هاله‌های نور */}
      <div className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-emerald-500/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 left-10 h-64 w-64 rounded-full bg-emerald-600/20 blur-[110px]" />

      {/* صحنه Three.js */}
      <div className="absolute inset-0 opacity-80"><HeroScene /></div>

      {/* محتوای متنی */}
      <div className="relative z-10 mx-auto flex min-h-[94svh] max-w-6xl flex-col items-center justify-center px-6 text-center">
        <Reveal delay={0.1} y={30}>
          <p className="max-w-2xl text-base leading-9 text-slate-300 sm:text-xl sm:leading-10">
            موبایل، ساعت هوشمند، هدفون و هزاران قطعه‌ی الکترونیک اورجینال — با ضمانت اصالت کالا،
            ارسال سریع سراسری و پشتیبانی واقعی.
          </p>
        </Reveal>

        <Reveal delay={0.25} y={24}>
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
                <Flame className="h-4.5 w-4.5 text-green-400" /> راهنمای خرید
              </Link>
            </Magnetic>
          </div>
        </Reveal>

        {/* نشانگر اسکرول */}
        <motion.div
          className="absolute bottom-8 flex flex-col items-center gap-1 text-slate-500"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          <span className="text-2xs">اسکرول کنید</span>
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- نوار برندها
function BrandStrip() {
  const brands = ['سامسونگ', 'اپل', 'شیائومی', 'انکر', 'جی‌بی‌ال', 'سونی', 'هوآوی', 'ریلمی', 'ونوس', 'گرین‌لاین'];
  return (
    <section className={`${FULL} cinema border-y border-white/5 bg-[#070c16]/80 py-2`}>
      <Marquee>
        {brands.map((b) => (
          <span key={b} className="flex shrink-0 items-center gap-2 text-sm font-bold text-slate-500">
            <Star className="h-3.5 w-3.5 text-emerald-500/60" /> {b}
          </span>
        ))}
      </Marquee>
    </section>
  );
}

// --------------------------------------------------------------- اسکرول سینمایی دسته‌بندی‌ها (ورود به فروشگاه هر دسته)
const STAGE_AURAS = [
  'bg-emerald-500/20', 'bg-cyan-500/20', 'bg-emerald-600/20', 'bg-teal-500/20', 'bg-green-500/20', 'bg-lime-500/15',
];

function MiniGlassCard({ p }: { p: ProductCardType }) {
  return (
    <Link
      href={`/products/${p.slug}`}
      className="glass-dark group overflow-hidden rounded-2xl transition hover:border-emerald-400/50"
    >
      <div className="relative h-28 overflow-hidden bg-slate-900/60 sm:h-36">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">📱</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0b1120] to-transparent" />
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-2xs font-bold text-slate-200 sm:text-xs">{p.name}</h3>
        <p className="mt-1 text-xs font-black text-emerald-400 sm:text-sm">{p.minPrice ? `${toToman(p.minPrice)} تومان` : '—'}</p>
      </div>
    </Link>
  );
}

function CategoryStage({ cat, items, isLoading, idx, total }: { cat: CategoryNode; items: ProductCardType[]; isLoading: boolean; idx: number; total: number }) {
  const Icon = CATEGORY_ICONS[cat.slug] || Cpu;
  return (
    <div className="absolute inset-0 flex items-center">
      <div className={`pointer-events-none absolute -top-20 right-10 h-96 w-96 rounded-full blur-[130px] ${STAGE_AURAS[idx % STAGE_AURAS.length]}`} />
      <div className="pointer-events-none absolute bottom-0 left-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 lg:grid-cols-2">
        {/* متن و CTA */}
        <div>
          <motion.span
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="text-xs font-bold tracking-widest text-emerald-400"
          >
            فروشگاه {cat.name} — مرحله {faNumber(idx + 1)} از {faNumber(total)}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 text-5xl font-black leading-tight text-slate-50 sm:text-7xl"
          >
            {cat.name}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
            className="mt-5 max-w-md text-sm leading-8 text-slate-400"
          >
            بهترین و اورجینال‌ترین مدل‌های {cat.name} با ضمانت اصالت و قیمت رقابتی — همین حالا انتخاب کن.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Magnetic className="mt-8">
              <Link
                href={`/categories/${cat.slug}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-green-600 px-7 py-3.5 text-sm font-black text-slate-950 transition-transform hover:scale-105"
              >
                <Icon className="h-5 w-5" /> ورود به فروشگاه {cat.name}
              </Link>
            </Magnetic>
          </motion.div>
        </div>

        {/* کارت‌های محصول شناور */}
        <motion.div
          initial={{ opacity: 0, y: 90, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-2 gap-4"
        >
          {isLoading && [1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-dark h-44 animate-pulse rounded-2xl" />
          ))}
          {(items || []).slice(0, 4).map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.09 }}>
              <MiniGlassCard p={p} />
            </motion.div>
          ))}
          {!isLoading && !(items || []).length && (
            <div className="glass-dark col-span-2 flex h-44 items-center justify-center rounded-2xl text-sm text-slate-400">
              به‌زودی محصولات این دسته اضافه می‌شوند
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function CinematicCategoryScroll({ tree }: { tree: CategoryNode[] }) {
  const cats = (tree || []).slice(0, 6);
  const n = Math.max(cats.length, 1);
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ['start start', 'end end'] });
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setIdx(Math.min(n - 1, Math.max(0, Math.floor(v * n))));
  });

  // پیش‌بارگذاری محصولات همه مرحله‌ها (موازی)
  const stageQueries = useQueries({
    queries: cats.map((c) => ({
      queryKey: ['stage-products', c.slug],
      queryFn: async () =>
        (await api<{ items: ProductCardType[] }>('/products' + qs({ category: c.slug, limit: 4, sort: '-soldCount' }))).data.items,
      staleTime: 300_000,
    })),
  });

  if (!cats.length) return null;
  return (
    <section ref={targetRef} className={`${FULL} cinema cinema-grain relative`} style={{ height: `${(n + 1) * 85}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* عنوان ثابت بالای صحنه */}
        <div className="pointer-events-none absolute inset-x-0 top-8 z-20 text-center">
          <span className="text-2xs font-bold tracking-[0.3em] text-slate-500">سفر در فروشگاه کارزینتل</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={cats[idx].id}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 90, scale: 0.97, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -90, scale: 0.97, filter: 'blur(10px)' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <CategoryStage
              cat={cats[idx]}
              items={stageQueries[idx]?.data || []}
              isLoading={!!stageQueries[idx]?.isLoading}
              idx={idx}
              total={cats.length}
            />
          </motion.div>
        </AnimatePresence>

        {/* ریل پیشرفت سمت چپ */}
        <div className="absolute left-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-4 md:flex">
          {cats.map((c, i) => (
            <div key={c.id} className="flex flex-col items-center gap-4">
              <span
                className={`rounded-full transition-all duration-500 ${
                  i === idx ? 'h-8 w-2 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'h-2 w-2 bg-slate-700'
                }`}
              />
              <span className={`text-2xs transition-colors duration-300 ${i === idx ? 'font-bold text-emerald-300' : 'text-slate-600'}`}>
                {c.name}
              </span>
            </div>
          ))}
        </div>

        {/* خط پیشرفت پایین */}
        <div className="absolute inset-x-0 bottom-6 z-20 mx-auto h-1 w-56 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full origin-right bg-gradient-to-l from-emerald-500 to-cyan-400" style={{ scaleX: scrollYProgress }} />
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- ریل افقی محصولات (اسکرول استیکی)
function GlassProductCard({ p }: { p: ProductCardType }) {
  return (
    <Link
      href={`/products/${p.slug}`}
      className="glass-dark group w-64 shrink-0 overflow-hidden rounded-3xl transition hover:border-emerald-400/40 sm:w-72"
    >
      <div className="relative h-52 overflow-hidden bg-slate-900/60">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">📱</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b1120] to-transparent" />
        {!!p.soldCount && (
          <span className="absolute top-3 right-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-2xs font-black text-slate-950">
            🔥 پرفروش
          </span>
        )}
      </div>
      <div className="p-4">
        {p.brandName && <p className="text-2xs text-cyan-400">{p.brandName}</p>}
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-6 text-slate-100">{p.name}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-black text-emerald-400">
            {p.minPrice ? `${toToman(p.minPrice)} تومان` : '—'}
          </span>
          {!!p.ratingAvg && (
            <span className="flex items-center gap-1 text-2xs text-slate-400">
              <Star className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" /> {faNumber(Number(p.ratingAvg).toFixed(1))}
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
    <section ref={targetRef} className={`${FULL} cinema cinema-grain relative h-[340vh]`}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="pointer-events-none absolute top-20 left-0 h-80 w-80 rounded-full bg-violet-600/15 blur-[110px]" />
        <div className="mx-auto mb-10 w-full max-w-7xl px-6">
          <span className="text-xs font-bold tracking-widest text-emerald-400">پرفروش‌ترین‌ها</span>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            با اسکرول، در فروشگاه <GradientText>سفر کن</GradientText>
          </h2>
        </div>
        <motion.div ref={stripRef} style={{ x: smoothX }} className="flex w-max gap-6 px-6">
          {items.map((p) => <GlassProductCard key={p.id} p={p} />)}
          <Link
            href="/search?sort=-soldCount"
            className="glass-dark flex w-56 shrink-0 flex-col items-center justify-center gap-3 rounded-3xl text-sm font-bold text-emerald-300"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15"><Rocket className="h-6 w-6" /></span>
            مشاهده همه ←
          </Link>
        </motion.div>
        {/* خط پیشرفت ریل */}
        <div className="mx-auto mt-10 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full origin-right bg-gradient-to-l from-emerald-500 to-cyan-400" style={{ scaleX: scrollYProgress }} />
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- آمار + اعتماد
function StatsBand() {
  const stats = [
    { label: 'محصول فعال', value: 5200, suffix: '+', icon: Cpu },
    { label: 'مشتری خوشحال', value: 48000, suffix: '+', icon: BadgeCheck },
    { label: 'سفارش موفق', value: 96000, suffix: '+', icon: Truck },
    { label: 'رضایت خرید', value: 97, suffix: '٪', icon: Star },
  ];
  return (
    <section className={`${FULL} cinema border-y border-white/5 bg-[#070c16]/80 py-16`}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08}>
            <div className="glass-dark rounded-2xl p-6 text-center">
              <s.icon className="mx-auto mb-3 h-7 w-7 text-emerald-400" />
              <p className="text-3xl font-black text-slate-50"><CountUp to={s.value} suffix={s.suffix} /></p>
              <p className="mt-1 text-xs text-slate-500">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function TrustRow() {
  const items = [
    { icon: ShieldCheck, title: 'ضمانت اصالت کالا', desc: 'هر محصول با گارانتی معتبر' },
    { icon: Truck, title: 'ارسال سریع سراسری', desc: 'پست، تیپاکس و پیک تهران' },
    { icon: Zap, title: 'پرداخت امن', desc: 'چند درگاه رسمی بانکی' },
    { icon: BadgeCheck, title: '۷ روز بازگشت', desc: 'بازیابی بی‌دردسر کالا' },
  ];
  return (
    <section className={`${FULL} cinema cinema-grain py-20`}>
      <RevealGroup className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 lg:grid-cols-4" step={0.08}>
        {items.map((f) => (
          <motion.div key={f.title} variants={revealItem}>
            <TiltCard amount={8} className="glass-dark h-full rounded-2xl p-5">
              <f.icon className="mb-3 h-6 w-6 text-cyan-400" />
              <p className="text-sm font-bold text-slate-100">{f.title}</p>
              <p className="mt-1 text-2xs leading-5 text-slate-500">{f.desc}</p>
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
    <section className={`${FULL} cinema cinema-grain py-24`}>
      <Reveal className="mx-auto max-w-4xl px-6">
        <div className="orbit-border">
          <div className="orbit-inner glass-dark rounded-3xl p-10 text-center sm:p-16">
            <Parallax speed={0.4}>
              <h2 className="text-3xl font-black leading-normal sm:text-5xl sm:leading-normal">
                انتخابِ درست، فقط یک <GradientText>قدم</GradientText> با شما فاصله دارد
              </h2>
            </Parallax>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-8 text-slate-400">
              اصالت تضمین‌شده، قیمت رقابتی، ارسال سریع و پشتیبانی واقعی — آنچه یک خرید حرفه‌ای را کامل می‌کند، همین‌جاست.
            </p>
            <Magnetic className="mt-9">
              <Link
                href="/search"
                className="pulse-glow inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-green-600 px-10 py-4 text-base font-black text-slate-950 transition-transform hover:scale-105"
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

// --------------------------------------------------------------- سکشن روشن (منتقل‌کننده به حالت فروشگاهی)
function ShopSection({ title, href, children, idx }: { title: string; href?: string; children: React.ReactNode; idx: number }) {
  return (
    <Reveal className="mt-14">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-3 text-xl font-black text-slate-900">
          <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-emerald-500 to-green-600" />
          {title}
        </h2>
        {href && <Link href={href} className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-900 hover:text-white">مشاهده همه ←</Link>}
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
  });

  const { data: newest, isLoading: loadingNew } = useQuery({
    queryKey: ['products', 'newest'],
    queryFn: async () => (await api<{ items: ProductCardType[] }>('/products' + qs({ sort: '-publishedAt', limit: 10 }))).data.items,
  });

  const { data: bestSellers } = useQuery({
    queryKey: ['products', 'best'],
    queryFn: async () => (await api<{ items: ProductCardType[] }>('/products' + qs({ sort: '-soldCount', limit: 12 }))).data.items,
  });

  return (
    <div>
      <ScrollProgress />

      {/* 🎬 پرده‌ی اول: سینمایی سه‌بعدی */}
      <CinematicHero />
      <BrandStrip />
      <CinematicCategoryScroll tree={tree || []} />
      <HorizontalRail items={bestSellers || []} />
      <StatsBand />
      <TrustRow />
      <FinaleCTA />

      {/* 🛍 پرده‌ی دوم: فروشگاه کلاسیک */}
      <div className="pb-4 pt-2">
        <ShopSection title="جدیدترین محصولات" href="/search?sort=-publishedAt" idx={0}>
          {loadingNew ? <PageLoading /> : <ProductGrid items={newest || []} />}
        </ShopSection>

        <ShopSection title="منتخب سردبیر" href="/search" idx={1}>
          <ProductGrid items={(bestSellers || []).slice(0, 5)} />
        </ShopSection>
      </div>
    </div>
  );
}
