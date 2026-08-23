'use client';

import Link from 'next/link';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faDate } from '@/lib/format';
import { PageLoading, Empty, Card } from '@/components/ui';

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  kind: 'post' | 'news';
  publishedAt: string | null;
}

export function BlogDetail({ slug }: { slug: string }) {
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => (await api<Post>(`/blog/${slug}`)).data,
    retry: false,
  });

  if (isLoading) return <PageLoading />;
  if (error || !post) return <div className="py-10"><Empty title="مقاله یافت نشد" /></div>;

  return (
    <article className="mx-auto max-w-3xl py-8">
      <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/" className="hover:text-slate-300">خانه</Link>
        <ChevronRight className="h-3 w-3 rotate-180" />
        <Link href={post.kind === 'news' ? '/news' : '/blog'} className="hover:text-slate-300">{post.kind === 'news' ? 'اخبار' : 'وبلاگ'}</Link>
        <ChevronRight className="h-3 w-3 rotate-180" />
        <span className="line-clamp-1 text-slate-400">{post.title}</span>
      </nav>

      <h1 className="text-2xl font-black leading-10 text-slate-100">{post.title}</h1>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
        <CalendarDays className="h-4 w-4" />
        {post.publishedAt ? faDate(post.publishedAt) : ''}
      </div>

      {post.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverUrl} alt={post.title} className="mt-6 w-full rounded-3xl object-cover" />
      )}

      <Card className="mt-6">
        <div className="prose-fa" dangerouslySetInnerHTML={{ __html: post.body }} />
      </Card>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.excerpt || undefined,
            image: post.coverUrl ? [post.coverUrl] : undefined,
            datePublished: post.publishedAt || undefined,
            dateModified: post.publishedAt || undefined,
            inLanguage: 'fa-IR',
            author: { '@type': 'Organization', name: 'کارزینتل' },
            publisher: {
              '@type': 'Organization',
              name: 'کارزینتل',
              logo: { '@type': 'ImageObject', url: `${typeof window !== 'undefined' ? window.location.origin : ''}/icon.svg` },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': typeof window !== 'undefined' ? window.location.href : undefined,
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'خانه', item: typeof window !== 'undefined' ? window.location.origin : undefined },
              {
                '@type': 'ListItem',
                position: 2,
                name: post.kind === 'news' ? 'اخبار' : 'وبلاگ',
                item: typeof window !== 'undefined' ? `${window.location.origin}/${post.kind === 'news' ? 'news' : 'blog'}` : undefined,
              },
              { '@type': 'ListItem', position: 3, name: post.title },
            ],
          }),
        }}
      />
    </article>
  );
}
