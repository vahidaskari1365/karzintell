'use client';

// صفحهٔ جزئیات محصول — چیدمان دیجی‌کالایی، تم تیرهٔ کارزینتل
// نگهداری تمام عملکردهای موجود: سبد، علاقه‌مندی، مقایسه، دیدگاه، پرسش و پاسخ

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck, CheckCircle2, ChevronLeft, Expand, Heart, Minus, Plus, RotateCcw,
  Scale, Share2, ShieldCheck, ShoppingCart, Store, Truck, X, Wallet,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { ProductDetailType, ProductVariantType } from '@/lib/types';
import { PageLoading, Button, Badge, Card, Textarea, Input, Select } from '@/components/ui';
import { Reveal } from '@/components/cinematic/fx';
import { PriceTag, RatingStars } from '@/components/display';
import { ProductCard } from '@/components/product-card';
import { faNumber, percentOff, toToman } from '@/lib/format';
import { getCartSession, toast, useAuthStore } from '@/lib/auth-store';
import { getCompareIds, toggleCompareId } from '@/lib/compare';

// ------------------------------------------------------- دکمه مقایسه
function CompareButton({ productId }: { productId: number }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [ids, setIds] = useState<number[]>(() => getCompareIds());
  const { data: serverIds } = useQuery({
    queryKey: ['compare-ids'],
    queryFn: async () => (await api<number[]>('/me/compare')).data,
    enabled: !!user,
  });
  const active = user ? (serverIds || []).includes(productId) : ids.includes(productId);

  const toggle = useMutation({
    mutationFn: async () => {
      if (user) {
        return (
          await api<{ inCompare: boolean; ids: number[] }>('/me/compare/toggle', {
            method: 'POST',
            body: { productId },
          })
        ).data;
      }
      const r = toggleCompareId(productId);
      if (r.full) throw new Error('حداکثر ۴ محصول را می‌توانید مقایسه کنید');
      setIds(r.ids);
      window.dispatchEvent(new Event('compare:changed'));
      return r;
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['compare-ids'] });
      toast.success(r?.inCompare ? 'به لیست مقایسه اضافه شد' : 'از لیست مقایسه حذف شد');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <button
      onClick={() => toggle.mutate()}
      className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${
        active
          ? 'border-teal-300/60 bg-teal-400/10 text-teal-300'
          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-teal-300/40 hover:text-teal-200'
      }`}
      title="مقایسه"
      aria-label={active ? 'حذف از لیست مقایسه' : 'افزودن به لیست مقایسه'}
    >
      <Scale className="h-5 w-5" />
    </button>
  );
}

// ------------------------------------------------------- دکمه علاقه‌مندی
function WishlistButton({
  active, loading, onClick,
}: {
  active: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${
        active
          ? 'border-rose-300/60 bg-rose-500/10 text-rose-400'
          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-rose-300/40 hover:text-rose-300'
      }`}
      aria-label={active ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
      title="علاقه‌مندی"
    >
      <Heart className={`h-5 w-5 ${active ? 'fill-rose-400' : ''}`} />
    </button>
  );
}

// ------------------------------------------------------- دکمه اشتراک‌گذاری
function ShareButton({ name }: { name: string }) {
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: name, url }); return; } catch { /* لغو توسط کاربر */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('لینک محصول کپی شد');
    } catch {
      toast.error('کپی لینک ممکن نشد');
    }
  };
  return (
    <button
      onClick={share}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-teal-300/40 hover:text-teal-200"
      aria-label="اشتراک‌گذاری"
      title="اشتراک‌گذاری"
    >
      <Share2 className="h-5 w-5" />
    </button>
  );
}

// ----------------------------------------------------------------- گالری
function Gallery({
  images, videos,
}: {
  images: ProductDetailType['images'];
  videos: ProductDetailType['videos'];
}) {
  const media = useMemo(() => {
    const items: Array<{ key: string; type: 'image' | 'video'; url: string; poster?: string | null }> = [];
    for (const img of images) if (img.url) items.push({ key: `i${img.id}`, type: 'image', url: img.url });
    for (const v of videos) if (v.url) items.push({ key: `v${v.id}`, type: 'video', url: v.url, poster: v.poster });
    return items;
  }, [images, videos]);

  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const [lightbox, setLightbox] = useState(false);
  const current = media[Math.min(active, Math.max(0, media.length - 1))];

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-4">
      {/* تصویر اصلی */}
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40"
        onMouseMove={(e) => {
          if (!zoom) return;
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        onMouseEnter={() => current?.type === 'image' && setZoom(true)}
        onMouseLeave={() => setZoom(false)}
      >
        {current ? (
          current.type === 'video' ? (
            <video key={current.url} src={current.url} poster={current.poster || undefined} controls className="h-full w-full object-contain" />
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.url}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="h-full w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current.url}
                    alt=""
                    onClick={() => setLightbox(true)}
                    className="h-full w-full cursor-zoom-in object-contain transition-transform duration-150"
                    style={zoom ? { transform: 'scale(2.2)', transformOrigin: origin } : undefined}
                  />
                </motion.div>
              </AnimatePresence>
              <button
                onClick={() => setLightbox(true)}
                className="absolute bottom-3 end-3 rounded-full bg-slate-950/80 p-2 text-slate-300 shadow hover:text-teal-200"
                aria-label="بزرگ‌نمایی تصویر"
              >
                <Expand className="h-4 w-4" />
              </button>
            </>
          )
        ) : (
          <span className="text-slate-500">بدون تصویر</span>
        )}
      </div>

      {/* لایت‌باکس تمام‌صفحه */}
      {lightbox && current?.type === 'image' && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-6"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute end-5 top-5 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
            aria-label="بستن"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.url} alt="" className="max-h-full max-w-full cursor-zoom-out object-contain" />
        </div>
      )}

      {/* نوار تصاویر کوچک */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {media.map((m, i) => (
            <button
              key={m.key}
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                i === active ? 'border-teal-300/70' : 'border-white/10 hover:border-white/30'
              }`}
              aria-label={`تصویر ${faNumber(i + 1)}`}
            >
              {m.type === 'video' ? (
                <span className="flex h-full w-full items-center justify-center bg-white/5 text-[10px] text-slate-400">ویدئو</span>
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

// ------------------------------------------------------- انتخاب تنوع
function VariantPicker({
  variants, selected, onSelect,
}: {
  variants: ProductVariantType[];
  selected: ProductVariantType | null;
  onSelect: (v: ProductVariantType) => void;
}) {
  // گروه‌بندی گزینه‌ها بر اساس نام صفت (رنگ، حافظه و …)
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
          <span className="mb-2 block text-sm font-medium text-slate-300">{attrName}</span>
          <div className="flex flex-wrap gap-2">
            {[...valueIds].map((valueId) => {
              // تنوعی که با سایر گزینه‌های انتخاب‌شده سازگار باشد
              const compatible = variants.filter(
                (v) =>
                  v.options.some((o) => o.attributeValueId === valueId) &&
                  [...selectedOptions].every(
                    (sid) => valueId === sid || v.options.some((o) => o.attributeValueId === sid),
                  ),
              );
              const candidate = compatible[0];
              const label = candidate?.options.find((o) => o.attributeValueId === valueId)?.value || String(valueId);
              const isActive = selectedOptions.has(valueId);
              return (
                <button
                  key={valueId}
                  disabled={!candidate}
                  onClick={() => candidate && onSelect(candidate)}
                  className={`min-w-[3.5rem] rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-teal-300/70 bg-teal-400/15 text-teal-200'
                      : candidate
                        ? 'border-white/10 bg-slate-900/40 text-slate-300 hover:border-teal-300/40'
                        : 'cursor-not-allowed border-white/10 bg-slate-900/20 text-slate-500'
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

// ----------------------------------------------------------------- صفحه
export function ProductDetail({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const { user, hydrated } = useAuthStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  // تب پیش‌فرض: توضیحات (طبق چیدمان دیجی‌کالا)
  const [tab, setTab] = useState<'description' | 'specs' | 'reviews' | 'questions'>('description');

  // واکشی جزئیات محصول
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => (await api<ProductDetailType>(`/products/${slug}`)).data,
  });

  // تنوع پیش‌فرض یا انتخاب‌شده
  const selected: ProductVariantType | null = useMemo(() => {
    if (!product) return null;
    if (selectedId) return product.variants.find((v) => v.id === selectedId) || product.variants[0];
    return product.variants.find((v) => v.isDefault) || product.variants[0] || null;
  }, [product, selectedId]);

  // افزودن به سبد
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

  // وضعیت علاقه‌مندی
  const { data: wishlistIds } = useQuery({
    queryKey: ['wishlist-ids', product?.id],
    queryFn: async () => (await api<number[]>(`/me/wishlist/check?ids=${product!.id}`)).data,
    enabled: !!product && hydrated && !!user,
  });
  const inWishlist = (wishlistIds || []).includes(product?.id ?? -1);

  const wishlist = useMutation({
    mutationFn: async () =>
      (await api<{ inWishlist: boolean }>('/me/wishlist/toggle', {
        method: 'POST',
        body: { productId: product!.id },
      })).data,
    onSuccess: (r) => {
      toast.success(r.inWishlist ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد');
      queryClient.invalidateQueries({ queryKey: ['wishlist-ids'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading || !product) return <PageLoading />;

  const inStock = (selected?.stock ?? 0) > 0;
  const price = selected?.price ?? product.minPrice ?? 0;
  const compareAt = selected?.compareAtPrice ?? null;
  const off = percentOff(price, compareAt);

  // داده‌های ساخت‌یافته برای سئو (Schema.org Product)
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const productUrl = `${siteUrl}/products/${product.slug}`;
  const priceValidUntil = new Date();
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': productUrl,
    name: product.name,
    description: product.shortDescription || product.name,
    image: product.images.map((i) => i.url).filter(Boolean),
    url: productUrl,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    sku: selected?.sku || product.code || undefined,
    itemCondition: 'https://schema.org/NewCondition',
    aggregateRating:
      product.ratingCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAvg,
            bestRating: 5,
            reviewCount: product.ratingCount,
          }
        : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IRR',
      price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: productUrl,
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil: priceValidUntil.toISOString().slice(0, 10),
      seller: { '@type': 'Organization', name: 'کارزینتل' },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'خانه', item: siteUrl },
      ...(product.category
        ? [
            {
              '@type': 'ListItem' as const,
              position: 2,
              name: product.category.name,
              item: `${siteUrl}/categories/${product.category.slug}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: product.category ? 3 : 2,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  // آیتم‌های نوار اعتماد
  const trustItems = [
    { icon: RotateCcw, label: '۷ روز ضمانت بازگشت' },
    { icon: Truck, label: 'تحویل اکسپرس' },
    { icon: Wallet, label: 'پرداخت در محل' },
    { icon: BadgeCheck, label: 'ضمانت اصالت کالا' },
  ];

  const tabs = [
    { key: 'description', label: 'توضیحات' },
    { key: 'specs', label: 'مشخصات' },
    { key: 'reviews', label: `دیدگاه‌ها (${faNumber(product.ratingCount)})` },
    { key: 'questions', label: 'پرسش و پاسخ' },
  ] as const;

  return (
    <div className="py-4 sm:py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* ۱. مسیر */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-400" aria-label="مسیر">
        <Link href="/" className="hover:text-teal-300">خانه</Link>
        <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
        {product.category && (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-teal-300">{product.category.name}</Link>
            <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
          </>
        )}
        <span className="line-clamp-1 text-slate-300">{product.name}</span>
      </nav>

      {/* ۲. چیدمان دوستونی — گالری (۴۰٪) + اطلاعات (۶۰٪) */}
      <Reveal y={26}>
        <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
          {/* ستون چپ: گالری */}
          <div className="lg:col-span-2">
            <Gallery images={product.images} videos={product.videos} />
          </div>

          {/* ستون راست: اطلاعات محصول */}
          <div className="flex flex-col gap-5 lg:col-span-3">
            {/* عنوان، برند، ریتینگ + آیکن‌های کناری */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {product.brand && (
                  <Link
                    href={`/categories/${product.category?.slug || ''}`}
                    className="text-sm text-teal-300 hover:text-teal-200"
                  >
                    {product.brand.name}
                  </Link>
                )}
                <h1 className="mt-1 text-xl font-black leading-8 text-slate-100 sm:text-2xl sm:leading-9">
                  {product.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <RatingStars value={product.ratingAvg} count={product.ratingCount} />
                  <span className="hidden text-slate-500 sm:inline">|</span>
                  <span className="hidden text-xs text-slate-400 sm:inline">کد کالا: {product.code || '—'}</span>
                  <span className="hidden text-slate-500 sm:inline">|</span>
                  <span className="hidden text-xs text-slate-400 sm:inline">{faNumber(product.soldCount)} فروش</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <WishlistButton
                  active={inWishlist}
                  loading={wishlist.isPending}
                  onClick={() => (hydrated && user ? wishlist.mutate() : toast.info('ابتدا وارد حساب شوید'))}
                />
                <CompareButton productId={product.id} />
                <ShareButton name={product.name} />
              </div>
            </div>

            {/* قیمت و وضعیت موجودی */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-y border-white/10 py-4">
              <div>
                <PriceTag price={price} compareAt={compareAt} size="lg" />
                <span className="mt-1.5 block text-xs text-slate-500">قیمت برای واحد</span>
              </div>
              {inStock ? (
                <Badge tone="green" className="gap-1.5 px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  موجود در انبار
                </Badge>
              ) : (
                <Badge tone="red" className="px-3 py-1">ناموجود</Badge>
              )}
            </div>

            {/* انتخاب رنگ/تنوع */}
            {product.variants.length > 1 && (
              <VariantPicker
                variants={product.variants}
                selected={selected}
                onSelect={(v) => setSelectedId(v.id)}
              />
            )}

            {/* ویژگی‌های کلیدی */}
            {product.features.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <span className="mb-2.5 block text-sm font-bold text-slate-200">ویژگی‌های کلیدی</span>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {product.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* فروشنده و گارانتی */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Store className="h-4 w-4 text-teal-400" />
                <span>فروشنده:</span>
                <span className="font-medium text-slate-200">کارزینتل</span>
              </div>
              {product.warrantyMonths ? (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  گارانتی {faNumber(product.warrantyMonths)} ماهه
                </span>
              ) : null}
            </div>

            {/* نوار اعتماد — ۴ آیکن */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {trustItems.map((t, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-900/40 px-2 py-3 text-center"
                >
                  <t.icon className="h-5 w-5 text-teal-400" />
                  <span className="text-[11px] leading-tight text-slate-300">{t.label}</span>
                </div>
              ))}
            </div>

            {/* انتخاب تعداد + افزودن به سبد */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {inStock && (
                  <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/60">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="p-3 text-slate-400 transition hover:text-teal-300"
                      aria-label="کاهش تعداد"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-10 text-center text-sm font-bold text-slate-100">{faNumber(qty)}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(99, q + 1))}
                      className="p-3 text-slate-400 transition hover:text-teal-300"
                      aria-label="افزایش تعداد"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <Button
                  size="lg"
                  disabled={!selected || !inStock}
                  loading={addToCart.isPending}
                  onClick={() => addToCart.mutate()}
                  className="flex-1 bg-gradient-to-l from-teal-500 to-emerald-500 text-white hover:from-teal-400 hover:to-emerald-400 disabled:from-slate-600 disabled:to-slate-700"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {inStock ? 'افزودن به سبد خرید' : 'ناموجود'}
                </Button>
              </div>
              {inStock && selected && selected.stock <= 5 && (
                <span className="mt-2.5 block text-xs font-medium text-amber-400">
                  تنها {faNumber(selected.stock)} عدد در انبار باقی مانده
                </span>
              )}
              <span className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <Truck className="h-4 w-4 text-teal-400" /> ارسال به سراسر کشور با پست پیشتاز
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ۴. تب‌ها */}
      <div className="mt-10">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/40 p-1 [scrollbar-width:none]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`relative whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key ? 'text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === t.key && (
                <motion.span
                  layoutId="product-tab-pill"
                  className="absolute inset-0 rounded-lg bg-gradient-to-l from-teal-500/20 to-emerald-500/20 ring-1 ring-teal-300/30"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === 'description' && (
                <div className="space-y-4">
                  <Card>
                    {product.description ? (
                      <div className="prose-fa !text-slate-200" dangerouslySetInnerHTML={{ __html: product.description }} />
                    ) : (
                      <p className="text-sm text-slate-400">{product.shortDescription || 'توضیحاتی ثبت نشده است.'}</p>
                    )}
                  </Card>
                  {product.features.length > 0 && (
                    <Card>
                      <h3 className="mb-3 font-bold text-slate-100">ویژگی‌های محصول</h3>
                      <ul className="space-y-2">
                        {product.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              )}

              {tab === 'specs' && (
                <div className="space-y-4">
                  {product.specs.length === 0 && <p className="text-sm text-slate-400">مشخصاتی ثبت نشده است.</p>}
                  {product.specs.map((g) => (
                    <Card key={g.group}>
                      <h3 className="mb-3 font-bold text-slate-100">{g.group}</h3>
                      <dl className="divide-y divide-white/5">
                        {g.items.map((s, i) => (
                          <div key={i} className="grid grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-3 sm:gap-4">
                            <dt className="text-slate-400">{s.name}</dt>
                            <dd className="text-slate-100 sm:col-span-2">{s.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </Card>
                  ))}
                </div>
              )}

              {tab === 'reviews' && <ReviewsSection productId={product.id} />}
              {tab === 'questions' && <QuestionsSection productId={product.id} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ۵. محصولات مرتبط — اسکرول افقی */}
      {product.related.length > 0 && (
        <Reveal y={32}>
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100">محصولات مرتبط</h2>
              {product.category && (
                <Link
                  href={`/categories/${product.category.slug}`}
                  className="text-xs text-teal-300 hover:text-teal-200"
                >
                  مشاهده بیشتر
                </Link>
              )}
            </div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {product.related.map((p) => (
                <div key={p.id} className="w-40 shrink-0 snap-start sm:w-52">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* ۶. نوار چسبان افزودن به سبد در موبایل */}
      {inStock && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-md lg:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-slate-400">{product.name}</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-bold text-slate-100">{toToman(price)}</span>
                {compareAt ? (
                  <span className="text-xs text-slate-500 line-through">{toToman(compareAt)}</span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/60">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-2.5 text-slate-400 transition hover:text-teal-300"
                aria-label="کاهش تعداد"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-9 text-center text-sm font-bold text-slate-100">{faNumber(qty)}</span>
              <button
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                className="p-2.5 text-slate-400 transition hover:text-teal-300"
                aria-label="افزایش تعداد"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="lg"
              disabled={!selected || !inStock}
              loading={addToCart.isPending}
              onClick={() => addToCart.mutate()}
              className="bg-gradient-to-l from-teal-500 to-emerald-500 text-white hover:from-teal-400 hover:to-emerald-400"
            >
              <ShoppingCart className="h-5 w-5" />
              افزودن
            </Button>
          </div>
        </motion.div>
      )}

      {/* فاصله برای جلوگیری از پنهان شدن محتوا زیر نوار موبایل */}
      {inStock && <div className="h-20 lg:hidden" />}
    </div>
  );
}

// ----------------------------------------------------------- دیدگاه‌ها
function ReviewsSection({ productId }: { productId: number }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ rating: 5, title: '', body: '' });
  const { data } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => (await api<any[]>(`/products/${productId}/reviews`)).data,
  });

  const submit = useMutation({
    mutationFn: async () => api(`/products/${productId}/reviews`, { method: 'POST', body: form }),
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
                <span className="font-bold text-slate-100">{r.userName}</span>
                {r.isBuyer && <Badge tone="green">خریدار محصول</Badge>}
              </div>
              <RatingStars value={r.rating} />
            </div>
            {r.title && <h4 className="mt-2 font-semibold text-slate-100">{r.title}</h4>}
            {r.body && <p className="mt-1 text-sm leading-7 text-slate-300">{r.body}</p>}
            {(r.pros?.length || r.cons?.length) && (
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                {!!r.pros?.length && <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-300">✅ {r.pros.join('، ')}</div>}
                {!!r.cons?.length && <div className="rounded-xl bg-rose-500/10 p-3 text-rose-300">❌ {r.cons.join('، ')}</div>}
              </div>
            )}
            {r.sellerReply && (
              <div className="mt-3 rounded-xl bg-slate-900/60 p-3 text-sm text-slate-300">
                <span className="font-bold">پاسخ فروشگاه: </span>{r.sellerReply}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="h-fit">
        <h3 className="mb-3 font-bold text-slate-100">ثبت دیدگاه</h3>
        {user ? (
          <div className="space-y-3">
            <Select value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{faNumber(n)} ستاره</option>)}
            </Select>
            <Input
              placeholder="عنوان دیدگاه (اختیاری)"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              placeholder="متن دیدگاه…"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
            <Button
              className="w-full bg-gradient-to-l from-teal-500 to-emerald-500 text-white hover:from-teal-400 hover:to-emerald-400"
              onClick={() => submit.mutate()}
              loading={submit.isPending}
            >
              ارسال دیدگاه
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            برای ثبت دیدگاه ابتدا <Link href="/login" className="text-teal-300 underline">وارد حساب</Link> شوید.
          </p>
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
        <h3 className="mb-3 font-bold text-slate-100">پرسش خود را بپرسید</h3>
        {user ? (
          <div className="flex gap-2">
            <Input
              placeholder="پرسش شما درباره این محصول…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button
              className="bg-gradient-to-l from-teal-500 to-emerald-500 text-white hover:from-teal-400 hover:to-emerald-400"
              onClick={() => submit.mutate()}
              loading={submit.isPending}
              disabled={!q.trim()}
            >
              ارسال
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-400">برای پرسیدن سؤال ابتدا وارد حساب شوید.</p>
        )}
      </Card>
      {(data || []).map((question: any) => (
        <Card key={question.id}>
          <p className="text-sm font-semibold text-slate-100">❓ {question.question}</p>
          {question.answer && (
            <p className="mt-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
              <span className="font-bold">پاسخ فروشگاه: </span>{question.answer}
            </p>
          )}
        </Card>
      ))}
      {(data || []).length === 0 && <p className="text-sm text-slate-400">هنوز پرسشی ثبت نشده است.</p>}
    </div>
  );
}
