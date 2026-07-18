'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Heart, Minus, Plus, ShoppingCart, ShieldCheck, Truck } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { ProductDetailType, ProductVariantType } from '@/lib/types';
import { PageLoading, Button, Badge, Card, Textarea, Input, Select } from '@/components/ui';
import { PriceTag, RatingStars } from '@/components/display';
import { ProductGrid } from '@/components/product-card';
import { faNumber, toToman } from '@/lib/format';
import { getCartSession, toast, useAuthStore } from '@/lib/auth-store';

// ---------------------------------------------------------------- گالری
function Gallery({ images, videos }: { images: ProductDetailType['images']; videos: ProductDetailType['videos'] }) {
  const media = useMemo(() => {
    const items: Array<{ key: string; type: 'image' | 'video'; url: string; poster?: string | null }> = [];
    for (const img of images) if (img.url) items.push({ key: `i${img.id}`, type: 'image', url: img.url });
    for (const v of videos) if (v.url) items.push({ key: `v${v.id}`, type: 'video', url: v.url, poster: v.poster });
    return items;
  }, [images, videos]);
  const [active, setActive] = useState(0);
  const current = media[Math.min(active, media.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {current ? (
          current.type === 'video' ? (
            <video key={current.url} src={current.url} poster={current.poster || undefined} controls className="h-full w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url} alt="" className="h-full w-full object-contain" />
          )
        ) : (
          <span className="text-slate-300">بدون تصویر</span>
        )}
      </div>
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((m, i) => (
            <button
              key={m.key}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${i === active ? 'border-slate-800' : 'border-slate-200'}`}
            >
              {m.type === 'video' ? (
                <span className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] text-slate-500">ویدئو</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------ انتخاب تنوع
function VariantPicker({
  variants, selected, onSelect,
}: {
  variants: ProductVariantType[];
  selected: ProductVariantType | null;
  onSelect: (v: ProductVariantType) => void;
}) {
  // گروه‌بندی بر اساس نام صفت (رنگ، حافظه…)
  const groups = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const v of variants)
      for (const o of v.options) {
        const key = o.attributeName || `#${o.attributeId}`;
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(o.attributeValueId);
      }
    return map;
  }, [variants]);

  const selectedOptions = new Set((selected?.options || []).map((o) => o.attributeValueId));

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([attrName, valueIds]) => (
        <div key={attrName}>
          <span className="mb-2 block text-sm font-medium text-slate-700">{attrName}</span>
          <div className="flex flex-wrap gap-2">
            {[...valueIds].map((valueId) => {
              // تنوعی که با بقیه گزینه‌های انتخاب‌شده سازگار است
              const compatible = variants.filter((v) =>
                v.options.some((o) => o.attributeValueId === valueId) &&
                [...selectedOptions].every((sid) => valueId === sid || v.options.some((o) => o.attributeValueId === sid)),
              );
              const candidate = compatible[0];
              const label = candidate?.options.find((o) => o.attributeValueId === valueId)?.value || String(valueId);
              const isActive = selectedOptions.has(valueId);
              return (
                <button
                  key={valueId}
                  disabled={!candidate}
                  onClick={() => candidate && onSelect(candidate)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : candidate
                        ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                        : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- صفحه
export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const queryClient = useQueryClient();
  const { user, hydrated } = useAuthStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'specs' | 'description' | 'reviews' | 'questions'>('specs');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => (await api<ProductDetailType>(`/products/${slug}`)).data,
  });

  const selected: ProductVariantType | null = useMemo(() => {
    if (!product) return null;
    if (selectedId) return product.variants.find((v) => v.id === selectedId) || product.variants[0];
    return product.variants.find((v) => v.isDefault) || product.variants[0] || null;
  }, [product, selectedId]);

  const addToCart = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('تنوع انتخاب نشده است');
      const { data } = await api(`/cart/items`, {
        method: 'POST',
        body: { variantId: selected.id, quantity: qty },
        headers: { 'X-Cart-Session': getCartSession() },
      });
      return data;
    },
    onSuccess: () => {
      toast.success('به سبد خرید اضافه شد');
      window.dispatchEvent(new Event('cart:changed'));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const wishlist = useMutation({
    mutationFn: async () => api(`/me/wishlist/${product!.id}`, { method: 'POST' }),
    onSuccess: () => toast.success('به علاقه‌مندی‌ها اضافه شد'),
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading || !product) return <PageLoading />;

  const inStock = (selected?.stock ?? 0) > 0;

  return (
    <div className="py-6">
      {/* مسیر */}
      <nav className="mb-5 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-slate-700">خانه</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-slate-700">{product.category.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-600">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <Gallery images={product.images} videos={product.videos} />

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              {product.brand && <span className="text-sm text-slate-400">{product.brand.name}</span>}
              <h1 className="mt-1 text-xl font-black leading-9 text-slate-900">{product.name}</h1>
            </div>
            <button
              onClick={() => (hydrated && user ? wishlist.mutate() : toast.info('ابتدا وارد حساب شوید'))}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-400 hover:border-rose-300 hover:text-rose-500"
              title="علاقه‌مندی"
            >
              <Heart className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <RatingStars value={product.ratingAvg} count={product.ratingCount} />
            <span className="text-xs text-slate-400">کد کالا: {product.code || '—'}</span>
            <span className="text-xs text-slate-400">فروش: {faNumber(product.soldCount)}</span>
          </div>

          {product.features.length > 0 && (
            <Card className="bg-slate-50/50">
              <span className="mb-2 block text-sm font-bold text-slate-800">ویژگی‌های کلیدی</span>
              <ul className="space-y-1.5">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {product.variants.length > 1 && (
            <VariantPicker variants={product.variants} selected={selected} onSelect={(v) => setSelectedId(v.id)} />
          )}

          <Card className="mt-auto border-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <PriceTag price={selected?.price ?? product.minPrice} compareAt={selected?.compareAtPrice} size="lg" />
                {product.warrantyMonths ? (
                  <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> گارانتی {faNumber(product.warrantyMonths)} ماهه
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {inStock && (
                  <div className="flex items-center rounded-xl border border-slate-200">
                    <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="p-2.5 text-slate-500 hover:text-slate-900"><Plus className="h-4 w-4" /></button>
                    <span className="min-w-8 text-center text-sm font-bold">{faNumber(qty)}</span>
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5 text-slate-500 hover:text-slate-900"><Minus className="h-4 w-4" /></button>
                  </div>
                )}
                <Button size="lg" disabled={!selected || !inStock} loading={addToCart.isPending} onClick={() => addToCart.mutate()}>
                  <ShoppingCart className="h-5 w-5" />
                  {inStock ? 'افزودن به سبد خرید' : 'ناموجود'}
                </Button>
              </div>
            </div>
            {inStock && selected && selected.stock <= 5 && (
              <span className="mt-2 block text-xs font-medium text-amber-600">تنها {faNumber(selected.stock)} عدد در انبار باقی مانده</span>
            )}
            <span className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <Truck className="h-4 w-4" /> ارسال به سراسر کشور با پست پیشتاز
            </span>
          </Card>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="mt-10">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {[
            { key: 'specs', label: 'مشخصات فنی' },
            { key: 'description', label: 'توضیحات' },
            { key: 'reviews', label: `دیدگاه‌ها (${faNumber(product.ratingCount)})` },
            { key: 'questions', label: 'پرسش و پاسخ' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'specs' && (
            <div className="space-y-6">
              {product.specs.length === 0 && <p className="text-sm text-slate-400">مشخصاتی ثبت نشده است.</p>}
              {product.specs.map((g) => (
                <Card key={g.group}>
                  <h3 className="mb-3 font-bold text-slate-900">{g.group}</h3>
                  <dl className="divide-y divide-slate-100">
                    {g.items.map((s, i) => (
                      <div key={i} className="grid grid-cols-3 gap-4 py-2.5 text-sm">
                        <dt className="text-slate-400">{s.name}</dt>
                        <dd className="col-span-2 text-slate-800">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              ))}
            </div>
          )}

          {tab === 'description' && (
            <Card>
              {product.description ? (
                <div className="prose-fa" dangerouslySetInnerHTML={{ __html: product.description }} />
              ) : (
                <p className="text-sm text-slate-600">{product.shortDescription || 'توضیحاتی ثبت نشده است.'}</p>
              )}
            </Card>
          )}

          {tab === 'reviews' && <ReviewsSection productId={product.id} />}
          {tab === 'questions' && <QuestionsSection productId={product.id} />}
        </div>
      </div>

      {/* محصولات مرتبط */}
      {product.related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold">محصولات مرتبط</h2>
          <ProductGrid items={product.related} />
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------ دیدگاه‌ها
function ReviewsSection({ productId }: { productId: number }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ rating: 5, title: '', body: '' });
  const { data } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => (await api<any[]>(`/products/${productId}/reviews`)).data,
  });

  const submit = useMutation({
    mutationFn: async () =>
      api(`/products/${productId}/reviews`, { method: 'POST', body: form }),
    onSuccess: () => {
      toast.success('دیدگاه شما ثبت شد و پس از تأیید منتشر می‌شود');
      setForm({ rating: 5, title: '', body: '' });
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {(data || []).length === 0 && <p className="text-sm text-slate-400">هنوز دیدگاهی ثبت نشده است.</p>}
        {(data || []).map((r: any) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{r.userName}</span>
                {r.isBuyer && <Badge tone="green">خریدار محصول</Badge>}
              </div>
              <RatingStars value={r.rating} />
            </div>
            {r.title && <h4 className="mt-2 font-semibold">{r.title}</h4>}
            {r.body && <p className="mt-1 text-sm leading-7 text-slate-600">{r.body}</p>}
            {(r.pros?.length || r.cons?.length) && (
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                {!!r.pros?.length && <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">✅ {r.pros.join('، ')}</div>}
                {!!r.cons?.length && <div className="rounded-xl bg-rose-50 p-3 text-rose-700">❌ {r.cons.join('، ')}</div>}
              </div>
            )}
            {r.sellerReply && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-bold">پاسخ فروشگاه: </span>{r.sellerReply}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="h-fit">
        <h3 className="mb-3 font-bold">ثبت دیدگاه</h3>
        {user ? (
          <div className="space-y-3">
            <Select value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{faNumber(n)} ستاره</option>)}
            </Select>
            <Input placeholder="عنوان دیدگاه (اختیاری)" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="متن دیدگاه…" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            <Button className="w-full" onClick={() => submit.mutate()} loading={submit.isPending}>ارسال دیدگاه</Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">برای ثبت دیدگاه ابتدا <Link href="/login" className="text-blue-600 underline">وارد حساب</Link> شوید.</p>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------- پرسش و پاسخ
function QuestionsSection({ productId }: { productId: number }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const { data } = useQuery({
    queryKey: ['questions', productId],
    queryFn: async () => (await api<any[]>(`/products/${productId}/questions`)).data,
  });

  const submit = useMutation({
    mutationFn: async () => api(`/products/${productId}/questions`, { method: 'POST', body: { question: q } }),
    onSuccess: () => {
      toast.success('پرسش شما ثبت شد');
      setQ('');
      queryClient.invalidateQueries({ queryKey: ['questions', productId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-3 font-bold">پرسش خود را بپرسید</h3>
        {user ? (
          <div className="flex gap-2">
            <Input placeholder="پرسش شما درباره این محصول…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button onClick={() => submit.mutate()} loading={submit.isPending} disabled={!q.trim()}>ارسال</Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">برای پرسیدن سؤال ابتدا وارد حساب شوید.</p>
        )}
      </Card>
      {(data || []).map((question: any) => (
        <Card key={question.id}>
          <p className="text-sm font-semibold text-slate-800">❓ {question.question}</p>
          {question.answer && (
            <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              <span className="font-bold">پاسخ فروشگاه: </span>{question.answer}
            </p>
          )}
        </Card>
      ))}
      {(data || []).length === 0 && <p className="text-sm text-slate-400">هنوز پرسشی ثبت نشده است.</p>}
    </div>
  );
}
