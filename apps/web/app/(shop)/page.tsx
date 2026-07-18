'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, qs } from '@/lib/api-client';
import { CategoryNode, ProductCardType } from '@/lib/types';
import { ProductGrid } from '@/components/product-card';
import { PageLoading } from '@/components/ui';

interface BannerType {
  id: number;
  title: string;
  subtitle?: string | null;
  image: string | null;
  mobileImage?: string | null;
  linkUrl?: string | null;
}

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {href && <Link href={href} className="text-sm text-slate-500 hover:text-slate-800">مشاهده همه ←</Link>}
      </div>
      {children}
    </section>
  );
}

export default function HomePage() {
  const { data: banners } = useQuery({
    queryKey: ['banners', 'home_hero'],
    queryFn: async () => (await api<BannerType[]>('/banners?position=home_hero')).data,
  });

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
    queryFn: async () => (await api<{ items: ProductCardType[] }>('/products' + qs({ sort: '-soldCount', limit: 10 }))).data.items,
  });

  const hero = banners?.[0];
  const side = banners?.slice(1, 3) || [];

  return (
    <div className="py-6">
      {/* هیرو */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Link
          href={hero?.linkUrl || '/search'}
          className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 lg:col-span-2"
        >
          {hero?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.image} alt={hero.title} className="aspect-[16/7] w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex aspect-[16/7] w-full flex-col items-start justify-center gap-4 p-10 text-white">
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300">پیشنهاد ویژه</span>
              <h1 className="max-w-md text-3xl font-black leading-normal">جدیدترین گجت‌های دنیا در کارزینتل</h1>
              <p className="max-w-md text-sm leading-7 text-slate-300">موبایل، ساعت هوشمند، هدفون و هزاران قطعه الکترونیک با ضمانت اصالت و ارسال سریع</p>
              <span className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-900">شروع خرید</span>
            </div>
          )}
        </Link>
        <div className="hidden flex-col gap-4 lg:flex">
          {(side.length ? side : [null, null]).map((b, i) => (
            <Link key={i} href={b?.linkUrl || '/search'} className="flex flex-1 items-center justify-center rounded-3xl bg-slate-100 text-center text-sm font-bold text-slate-400">
              {b?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image} alt={b.title} className="h-full w-full rounded-3xl object-cover" />
              ) : (
                'تبلیغات شما'
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* دسته‌بندی‌ها */}
      <Section title="دسته‌بندی‌ها">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
          {(tree || []).map((c) => (
            <Link key={c.id} href={`/categories/${c.slug}`} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition-shadow hover:shadow-md">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                {c.icon || '📦'}
              </span>
              <span className="text-xs font-medium text-slate-700">{c.name}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* جدیدترین‌ها */}
      <Section title="جدیدترین محصولات" href="/search?sort=-publishedAt">
        {loadingNew ? <PageLoading /> : <ProductGrid items={newest || []} />}
      </Section>

      {/* پرفروش‌ترین‌ها */}
      <Section title="پرفروش‌ترین‌ها" href="/search?sort=-soldCount">
        <ProductGrid items={bestSellers || []} />
      </Section>
    </div>
  );
}
