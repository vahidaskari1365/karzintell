'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-500 hover:-translate-y-1.5 hover:border-amber-300/70 hover:shadow-[0_16px_40px_-12px_rgba(245,158,11,0.35)]"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image || placeholder}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
        />
        {product.inStock === false && (
          <span className="absolute right-2 top-2 rounded-lg bg-slate-800/80 px-2 py-1 text-[11px] text-white">ناموجود</span>
        )}
        {/* برق گرادیانی هنگام هاور */}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-amber-200/0 opacity-0 transition-opacity duration-500 group-hover:via-white/25 group-hover:to-amber-200/10 group-hover:opacity-100" />
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

const gridItem = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

export function ProductGrid({ items }: { items: ProductCardType[] }) {
  if (!items.length) return null;
  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-5% 0px' }}
      transition={{ staggerChildren: 0.05 }}
    >
      {items.map((p) => (
        <motion.div key={p.id} variants={gridItem}>
          <ProductCard product={p} />
        </motion.div>
      ))}
    </motion.div>
  );
}
