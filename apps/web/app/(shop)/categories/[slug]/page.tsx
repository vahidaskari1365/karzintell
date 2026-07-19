'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, qs } from '@/lib/api-client';
import { PageLoading, Select, Empty } from '@/components/ui';
import { ProductGrid } from '@/components/product-card';
import { Pagination } from '@/components/display';
import { faNumber } from '@/lib/format';

interface FilterAttr {
  id: number;
  name: string;
  code: string;
  type: string;
  isVariant: boolean;
  values: Array<{ id: number; value: string }>;
}

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('-soldCount');
  const [brandIds, setBrandIds] = useState<number[]>([]);
  const [inStock, setInStock] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [appliedPrice, setAppliedPrice] = useState<{ min?: number; max?: number }>({});

  const { data: catData, isLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () =>
      (await api<{ category: { id: number; name: string }; breadcrumb: Array<{ name: string; slug: string }>; filters: FilterAttr[] }>(`/categories/${slug}`)).data,
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api<any[]>('/brands')).data,
    staleTime: 300_000,
  });

  const params_qs = qs({
    category: slug,
    brand: brandIds.length ? brandIds.join(',') : undefined,
    inStock: inStock ? 1 : undefined,
    minRating: minRating || undefined,
    minPrice: appliedPrice.min ? Math.round(appliedPrice.min * 10) : undefined,
    maxPrice: appliedPrice.max ? Math.round(appliedPrice.max * 10) : undefined,
    sort,
    page,
    limit: 20,
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', slug, sort, brandIds, inStock, minRating, appliedPrice, page],
    queryFn: async () => api<{ items: any[] }>(`/products${params_qs}`),
  });

  if (isLoading) return <PageLoading />;
  const category = catData?.category;

  return (
    <div className="py-6">
      <nav className="mb-4 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-slate-300">خانه</Link>
        {(catData?.breadcrumb || []).map((b) => (
          <span key={b.slug} className="flex items-center gap-2">
            <span>/</span>
            <Link href={`/categories/${b.slug}`} className="hover:text-slate-300">{b.name}</Link>
          </span>
        ))}
      </nav>

      <h1 className="mb-6 text-2xl font-black text-slate-100">{category?.name}</h1>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* فیلترها */}
        <aside className="h-fit space-y-5 rounded-2xl border border-white/10 bg-[#181c20] p-5 lg:sticky lg:top-24">
          <div>
            <span className="mb-2 block text-sm font-bold">برند</span>
            <div className="space-y-1.5">
              {(brands || []).map((b: any) => (
                <label key={b.id} className="flex items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-slate-900"
                    checked={brandIds.includes(b.id)}
                    onChange={(e) => {
                      setPage(1);
                      setBrandIds((ids) => (e.target.checked ? [...ids, b.id] : ids.filter((x) => x !== b.id)));
                    }}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <input type="checkbox" className="h-4 w-4 rounded accent-slate-900" checked={inStock} onChange={(e) => { setPage(1); setInStock(e.target.checked); }} />
            فقط کالاهای موجود
          </label>

          {/* بازه قیمت (تومان) */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="mb-2 text-sm font-bold text-slate-300">محدوده قیمت (تومان)</p>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="از"
                className="w-full rounded-lg border border-white/10 px-2 py-1.5 text-xs outline-none focus:border-orange-400"
              />
              <input
                inputMode="numeric"
                value={priceTo}
                onChange={(e) => setPriceTo(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="تا"
                className="w-full rounded-lg border border-white/10 px-2 py-1.5 text-xs outline-none focus:border-orange-400"
              />
            </div>
            <button
              onClick={() => { setPage(1); setAppliedPrice({ min: priceFrom ? Number(priceFrom) : undefined, max: priceTo ? Number(priceTo) : undefined }); }}
              className="mt-2 w-full rounded-lg bg-slate-800 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
            >
              اعمال فیلتر قیمت
            </button>
          </div>

          {/* حداقل امتیاز */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="mb-2 text-sm font-bold text-slate-300">امتیاز</p>
            {[
              { v: 0, label: 'همه' },
              { v: 4, label: '۴ ستاره و بالاتر' },
              { v: 3, label: '۳ ستاره و بالاتر' },
            ].map((o) => (
              <label key={o.v} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-slate-400">
                <input
                  type="radio"
                  name="minRating"
                  checked={minRating === o.v}
                  onChange={() => { setPage(1); setMinRating(o.v); }}
                  className="accent-orange-500"
                />
                {o.label}
              </label>
            ))}
          </div>
        </aside>

        {/* نتایج */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-400">
              {products ? `${faNumber(products.meta?.total || 0)} کالا` : ''}
            </span>
            <Select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className="max-w-52">
              <option value="-soldCount">پرفروش‌ترین</option>
              <option value="-publishedAt">جدیدترین</option>
              <option value="price">ارزان‌ترین</option>
              <option value="-price">گران‌ترین</option>
              <option value="-ratingAvg">بالاترین امتیاز</option>
              <option value="-discount">بیشترین تخفیف</option>
            </Select>
          </div>

          {loadingProducts ? (
            <PageLoading />
          ) : products?.data.items.length ? (
            <>
              <ProductGrid items={products.data.items} />
              <Pagination page={page} limit={20} total={products.meta?.total || 0} onPage={setPage} />
            </>
          ) : (
            <Empty title="کالایی یافت نشد" description="فیلترها را تغییر دهید یا دسته دیگری را ببینید" />
          )}
        </div>
      </div>
    </div>
  );
}
