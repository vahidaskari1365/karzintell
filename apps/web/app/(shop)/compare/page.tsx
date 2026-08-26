'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Scale, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore, toast, getCartSession } from '@/lib/auth-store';
import { getCompareIds, setCompareIds } from '@/lib/compare';
import { Empty, PageLoading, Card, Button } from '@/components/ui';
import { PriceTag, RatingStars } from '@/components/display';
import { faNumber } from '@/lib/format';

type CompareItem = {
  id: number; name: string; slug: string; image: string | null;
  brandName: string | null; categoryName: string | null;
  price: number | null; maxPrice: number | null;
  ratingAvg: number; ratingCount: number; inStock: boolean;
  specs: Record<string, string>;
};

export default function ComparePage() {
  const { user, hydrated } = useAuthStore();
  const queryClient = useQueryClient();
  const [localIds, setLocalIds] = useState<number[]>([]);

  useEffect(() => {
    const sync = () => setLocalIds(getCompareIds());
    sync();
    window.addEventListener('compare:changed', sync);
    return () => window.removeEventListener('compare:changed', sync);
  }, []);

  const { data: serverIds } = useQuery({
    queryKey: ['compare-ids'],
    queryFn: async () => (await api<number[]>('/me/compare')).data,
    enabled: hydrated && !!user,
  });

  const ids = useMemo(() => {
    const base = user ? (serverIds || []) : localIds;
    return [...new Set(base)].slice(0, 4);
  }, [user, serverIds, localIds]);

  const { data, isLoading } = useQuery({
    queryKey: ['compare-data', ids.join(',')],
    queryFn: async () =>
      (await api<{ items: CompareItem[]; attributeNames: string[] }>(`/compare/data?ids=${ids.join(',')}`)).data,
    enabled: ids.length > 0,
  });

  const remove = (id: number) => {
    if (user) {
      api('/me/compare/toggle', { method: 'POST', body: { productId: id } })
        .then(() => queryClient.invalidateQueries({ queryKey: ['compare-ids'] }))
        .catch((e) => toast.error(e.message));
    } else {
      setLocalIds(setCompareIds(ids.filter((x) => x !== id)));
    }
  };

  if (!hydrated) return <PageLoading />;

  return (
    <div className="py-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-black"><Scale className="h-6 w-6" /> مقایسه محصولات</h1>

      {ids.length === 0 && (
        <Empty
          title="لیست مقایسه خالی است"
          description="از صفحه محصول، دکمه «مقایسه» را بزنید تا تا ۴ محصول اینجا کنار هم قرار بگیرند."
          action={<Link href="/search" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">دیدن محصولات</Link>}
        />
      )}

      {isLoading && ids.length > 0 && <PageLoading />}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 rounded-2xl border border-white/10 bg-[#181c20] text-sm">
            <thead>
              <tr>
                <th className="sticky right-0 w-32 border-b border-l border-white/10 bg-[#10130f] p-3 text-right text-xs text-slate-400">محصول</th>
                {data.items.map((p) => (
                  <th key={p.id} className="min-w-52 border-b border-white/10 p-4 align-top">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Link href={`/products/${p.slug}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image || '/karzin-logo-mark.png'} alt={p.name} className="h-28 w-28 rounded-2xl object-cover" />
                      </Link>
                      <Link href={`/products/${p.slug}`} className="line-clamp-2 text-sm font-bold leading-6 hover:text-blue-400">{p.name}</Link>
                      <RatingStars value={p.ratingAvg} count={p.ratingCount} />
                      <PriceTag price={p.price} size="sm" />
                      <div className="flex gap-2">
                        <AddFirstVariantButton productSlug={p.slug} inStock={p.inStock} />
                        <button onClick={() => remove(p.id)} className="rounded-xl border border-white/10 p-2 text-rose-500 hover:bg-rose-500/10" title="حذف از مقایسه">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#10130f]/60">
                <td className="sticky right-0 border-b border-l border-white/10 bg-[#10130f] p-3 text-xs text-slate-400">برند</td>
                {data.items.map((p) => <td key={p.id} className="border-b border-white/10 p-3 text-center">{p.brandName || '—'}</td>)}
              </tr>
              <tr>
                <td className="sticky right-0 border-b border-l border-white/10 bg-[#10130f] p-3 text-xs text-slate-400">دسته‌بندی</td>
                {data.items.map((p) => <td key={p.id} className="border-b border-white/10 p-3 text-center">{p.categoryName || '—'}</td>)}
              </tr>
              <tr className="bg-[#10130f]/60">
                <td className="sticky right-0 border-b border-l border-white/10 bg-[#10130f] p-3 text-xs text-slate-400">وضعیت موجودی</td>
                {data.items.map((p) => (
                  <td key={p.id} className="border-b border-white/10 p-3 text-center">
                    {p.inStock ? <span className="font-bold text-emerald-400">موجود</span> : <span className="font-bold text-rose-500">ناموجود</span>}
                  </td>
                ))}
              </tr>
              {data.attributeNames.map((attr, i) => (
                <tr key={attr} className={i % 2 ? 'bg-[#10130f]/60' : ''}>
                  <td className="sticky right-0 border-b border-l border-white/10 bg-[#10130f] p-3 text-xs text-slate-400">{attr}</td>
                  {data.items.map((p) => (
                    <td key={p.id} className={`border-b border-white/10 p-3 text-center ${p.specs[attr] ? 'font-medium text-slate-100' : 'text-slate-300'}`}>
                      {p.specs[attr] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.items.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">💡 می‌توانید تا {faNumber(4)} محصول را هم‌زمان مقایسه کنید.</p>
      )}
    </div>
  );
}

function AddFirstVariantButton({ productSlug, inStock }: { productSlug: string; inStock: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  if (!inStock) return <span className="rounded-xl bg-white/10 px-3 py-2 text-xs text-slate-400">ناموجود</span>;

  const add = async () => {
    setBusy(true);
    try {
      const { data: p } = await api<any>(`/products/${productSlug}`);
      const variant = p.variants.find((v: any) => v.isDefault) || p.variants[0];
      if (!variant) throw new Error('تنوع یافت نشد');
      await api('/cart/items', { method: 'POST', body: { variantId: variant.id, quantity: 1 }, headers: { 'X-Cart-Session': getCartSession() } });
      window.dispatchEvent(new Event('cart:changed'));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('به سبد خرید اضافه شد');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button size="sm" onClick={add} loading={busy}>
      <ShoppingCart className="h-4 w-4" /> افزودن به سبد
    </Button>
  );
}
