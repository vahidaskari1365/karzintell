'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, PageLoading, Empty } from '@/components/ui';

export default function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['page', slug],
    queryFn: async () => (await api<{ title: string; body: string }>(`/pages/${slug}`)).data,
    retry: false,
  });

  if (isLoading) return <PageLoading />;
  if (isError || !page)
    return (
      <div className="py-16">
        <Empty title="صفحه یافت نشد" />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-black text-slate-900">{page.title}</h1>
      <Card>
        <div className="prose-fa" dangerouslySetInnerHTML={{ __html: page.body }} />
      </Card>
    </div>
  );
}
