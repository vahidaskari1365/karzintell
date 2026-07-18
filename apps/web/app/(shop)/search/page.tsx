'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, qs } from '@/lib/api-client';
import { PageLoading, Empty, Select } from '@/components/ui';
import { ProductGrid } from '@/components/product-card';
import { Pagination } from '@/components/display';
import { faNumber } from '@/lib/format';

function SearchResults() {
  const sp = useSearchParams();
  const q = sp.get('q') || '';
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('-soldCount');

  const { data, isLoading } = useQuery({
    queryKey: ['search', q, page, sort],
    queryFn: async () => api<{ items: any[]; engine: string }>(`/search${qs({ q, page, limit: 20, sort })}`),
    enabled: true,
  });

  return (
    <div className="py-6">
      <h1 className="mb-1 text-xl font-black text-slate-900">
        {q ? <>نتایج جستجو برای «{q}»</> : 'همه محصولات'}
      </h1>
      <p className="mb-6 text-sm text-slate-400">
        {data ? `${faNumber(data.meta?.total || 0)} کالا یافت شد` : 'در حال جستجو…'}
      </p>

      <div className="mb-4 flex justify-end">
        <Select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className="max-w-52">
          <option value="-soldCount">پرفروش‌ترین</option>
          <option value="-publishedAt">جدیدترین</option>
          <option value="price">ارزان‌ترین</option>
          <option value="-price">گران‌ترین</option>
        </Select>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : data?.data.items.length ? (
        <>
          <ProductGrid items={data.data.items} />
          <Pagination page={page} limit={20} total={data.meta?.total || 0} onPage={setPage} />
        </>
      ) : (
        <Empty title="چیزی پیدا نشد" description="عبارت دیگری را جستجو کنید" />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SearchResults />
    </Suspense>
  );
}
