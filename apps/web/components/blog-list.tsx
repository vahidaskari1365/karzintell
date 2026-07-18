'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Newspaper, PenLine } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faDate } from '@/lib/format';
import { Card, Empty, PageLoading } from '@/components/ui';

export interface BlogCard {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverUrl: string | null;
  kind: 'post' | 'news';
  publishedAt: string | null;
}

export function BlogList({ kind }: { kind: 'post' | 'news' }) {
  const { data, isLoading } = useQuery({
    queryKey: ['blog', kind],
    queryFn: async () => (await api<BlogCard[]>(`/${kind === 'news' ? 'news' : 'blog'}?limit=30`)).data,
  });

  if (isLoading) return <PageLoading />;
  const items = data || [];

  return (
    <div className="py-8">
      <h1 className="mb-2 flex items-center gap-2 text-2xl font-black">
        {kind === 'news' ? <Newspaper className="h-6 w-6" /> : <PenLine className="h-6 w-6" />}
        {kind === 'news' ? 'اخبار کارزینتل' : 'وبلاگ کارزینتل'}
      </h1>
      <p className="mb-6 text-sm text-slate-400">
        {kind === 'news' ? 'آخرین خبرها و اطلاعیه‌های فروشگاه' : 'راهنماهای خرید، نقد و بررسی و آموزش دنیای دیجیتال'}
      </p>

      {items.length === 0 && (
        <Empty title={kind === 'news' ? 'خبری منتشر نشده است' : 'مقاله‌ای منتشر نشده است'} description="به‌زودی محتوای جدید اضافه می‌شود." />
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
            <div className="aspect-video bg-slate-100">
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt={p.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl">📰</div>
              )}
            </div>
            <div className="p-4">
              <h2 className="line-clamp-2 font-bold leading-7 text-slate-900 group-hover:text-blue-700">{p.title}</h2>
              {p.excerpt && <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">{p.excerpt}</p>}
              <div className="mt-3 text-2xs text-slate-400">{p.publishedAt ? faDate(p.publishedAt) : ''}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
