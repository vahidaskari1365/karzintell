'use client';

/* ==========================================================================
   صفحه‌ی ویرایش محصول فروشنده
   --------------------------------------------------------------------------
   - ابتدا محصول از طریق /seller/products/:id واکشی می‌شود (تأیید مالکیت).
   - سپس جزئیات کامل (تنوع + تصاویر) از /products/:slug (عمومی) واکشی می‌شود.
     اگر محصول هنوز منتشر نشده (draft)، جزئیات عمومی ۴۰۴ می‌خورد و فقط
     داده‌های پایه نمایش داده می‌شود.
   - فرم به PATCH /products/:id ارسال می‌شود.
   ========================================================================== */

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { api } from '@/lib/api-client';
import { PageLoading, VendorGuard, type SellerProduct } from '../../_shared';
import {
  SellerProductForm, formFromProduct, type ProductVariantLite,
} from '../_form';
import { mediaUrl } from '@/lib/branding';

/** جزئیات عمومی محصول (شامل تنوع‌ها و تصاویر) — فقط برای محصولات منتشرشده */
interface PublicProductDetail {
  id: number;
  slug: string;
  status: string;
  variants: ProductVariantLite[];
  images: Array<{ id: number; url: string | null; alt?: string | null; isPrimary: boolean }>;
}

export default function EditVendorProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // ۱) واکشی محصول فروشنده (تأیید مالکیت + داده‌های پایه)
  const { data: product, isLoading } = useQuery({
    queryKey: ['seller-product', id],
    queryFn: async () => (await api<SellerProduct>(`/seller/products/${id}`)).data,
  });

  // ۲) تلاش برای واکشی جزئیات کامل عمومی (تنوع + تصاویر) — فقط برای منتشرشده‌ها
  const { data: detail } = useQuery({
    queryKey: ['public-product-detail', product?.slug],
    queryFn: async () => {
      try {
        return (await api<PublicProductDetail>(`/products/${product!.slug}`)).data;
      } catch {
        // محصول draft است یا هنوز منتشر نشده → جزئیات تنوع/تصویر در دسترس نیست
        return null;
      }
    },
    enabled: !!product?.slug,
    retry: 0,
  });

  if (isLoading || !product) return <PageLoading label="در حال بارگذاری محصول…" />;

  // تنوع پیش‌فرض (اولین تنوع یا آنکه isDefault=true است)
  const defaultVariant =
    detail?.variants?.find((v) => v.isDefault) || detail?.variants?.[0] || null;

  // نگاشت تصاویر عمومی به فرمت فرم (تبدیل URL → path)
  const images = (detail?.images || [])
    .filter((i) => i.url)
    .map((i) => ({
      path: pathFromMediaUrl(i.url),
      alt: i.alt || '',
      isPrimary: !!i.isPrimary,
    }));

  const initial = formFromProduct(product, { variant: defaultVariant, images });

  return (
    <VendorGuard>
      <SellerProductForm productId={Number(id)} initial={initial} />
    </VendorGuard>
  );
}

/**
 * تبدیل URL کامل تصویر (مثل http://host/uploads/products/x.webp یا /uploads/...)
 * به مسیر نسبی (products/x.webp) برای ذخیره در فرم.
 */
function pathFromMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  const full = mediaUrl(url) || url;
  const m = full.match(/\/uploads\/(.+)$/);
  if (m) return m[1];
  return full;
}
