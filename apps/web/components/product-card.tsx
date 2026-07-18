'use client';

import Link from 'next/link';
import { ProductCardType } from '@/lib/types';
import { PriceTag, RatingStars } from './display';

const placeholder = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#f1f5f9"/><g fill="#cbd5e1" font-family="sans-serif" font-size="20" text-anchor="middle"><text x="200" y="195">کارزینتل</text><text x="200" y="225" font-size="14">بدون تصویر</text></g></svg>`,
);

export function ProductCard({ product }: { product: ProductCardType }) {
  const brand = product.brand || product.brandName;
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image || placeholder}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {product.inStock === false && (
          <span className="absolute right-2 top-2 rounded-lg bg-slate-800/80 px-2 py-1 text-[11px] text-white">ناموجود</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {brand && <span className="text-xs text-slate-400">{brand}</span>}
        <h3 className="line-clamp-2 min-h-[2.6rem] text-sm font-medium leading-6 text-slate-800">{product.name}</h3>
        {(product.ratingAvg ?? 0) > 0 && <RatingStars value={product.ratingAvg || 0} count={product.ratingCount} />}
        <div className="mt-auto pt-1">
          <PriceTag price={product.minPrice} size="sm" />
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ items }: { items: ProductCardType[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
