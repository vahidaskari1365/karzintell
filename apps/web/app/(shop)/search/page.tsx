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
  const [minRating, setMinRating] = useState(0);
  const [inStock, setInStock] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['search', q, page, sort, minRating, inStock],
    queryFn: async () =>
      api<{ items: any[]; engine: string }>(
        `/search${qs({ q, page, limit: 20, sort, minRating: minRating || undefined, inStock: inStock ? 1 : undefined })}`,
      ),
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={inStock} onChange={(e) => { setPage(1); setInStock(e.target.checked); }} className="h-4 w-4 accent-orange-500" />
            فقط موجود
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={minRating === 4} onChange={(e) => { setPage(1); setMinRating(e.target.checked ? 4 : 0); }} className="h-4 w-4 accent-orange-500" />
            ۴ ستاره و بالاتر
          </label>
        </div>
        <Select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className="max-w-52">
          <option value="-soldCount">پرفروش‌ترین</option>
          <option value="-publishedAt">جدیدترین</option>
          <option value="price">ارزان‌ترین</option>
          <option value="-price">گران‌ترین</option>
          <option value="-ratingAvg">بالاترین امتیاز</option>
          <option value="-discount">بیشترین تخفیف</option>
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
