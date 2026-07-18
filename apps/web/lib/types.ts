/** تایپ‌های پاسخ API (سبک و عملیاتی) */

export interface ProductCardType {
  id: number;
  name: string;
  slug: string;
  brand?: string | null;
  brandName?: string | null;
  minPrice: number | null;
  image?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
  soldCount?: number;
  inStock?: boolean;
}

export interface ProductVariantType {
  id: number;
  sku: string;
  barcode?: string | null;
  title?: string | null;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  stock: number;
  weightG?: number | null;
  isDefault: boolean;
  isActive: boolean;
  options: Array<{
    attributeId: number;
    attributeName?: string;
    attributeCode?: string;
    attributeValueId: number;
    value?: string;
  }>;
}

export interface ProductDetailType {
  id: number;
  code?: string | null;
  name: string;
  slug: string;
  status: string;
  shortDescription?: string | null;
  description?: string | null;
  features: string[];
  warrantyMonths?: number | null;
  weightG?: number | null;
  dimensions?: { length?: number | null; width?: number | null; height?: number | null };
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  viewCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  category?: { id: number; name: string; slug: string } | null;
  brand?: { id: number; name: string; slug: string; logo?: string | null } | null;
  images: Array<{ id: number; url: string | null; alt?: string | null; sortOrder: number; isPrimary: boolean }>;
  videos: Array<{ id: number; title?: string | null; provider: string; url: string | null; poster?: string | null }>;
  variants: ProductVariantType[];
  specs: Array<{ group: string; items: Array<{ name: string; value: string }> }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  related: ProductCardType[];
}

export interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  icon?: string | null;
  children: CategoryNode[];
}

export interface CartType {
  id: number;
  items: Array<{
    id: number;
    variantId: number;
    quantity: number;
    unitPrice: number;
    productId: number;
    productName: string;
    variantTitle: string | null;
    image: string | null;
    sku: string;
    available: number;
  }>;
  couponCode: string | null;
  couponDiscount: number;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
}

export interface OrderType {
  id: number;
  code: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingCost: number;
  grandTotal: number;
  couponCode?: string | null;
  shippingMethod?: string | null;
  placedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface OrderDetailType extends OrderType {
  address?: Record<string, unknown>;
  customerNote?: string | null;
  adminNote?: string | null;
  items: Array<{
    id: number;
    productId: number;
    variantId: number;
    sku: string;
    productName: string;
    variantTitle?: string | null;
    unitPrice: number;
    quantity: number;
    discountAmount: number;
    totalPrice: number;
    warrantyMonths?: number | null;
  }>;
  histories: Array<{ from: string | null; to: string; note?: string | null; at: string; by?: number | null }>;
  payments: Array<{
    id: number; gateway: string; amount: number; status: string;
    refId?: string | null; paidAt?: string | null; createdAt: string;
  }>;
  shipment?: {
    id: number; provider: string; method?: string | null; trackingCode?: string | null;
    status: string; shippedAt?: string | null; deliveredAt?: string | null;
  } | null;
  allowedTransitions?: string[];
}

export interface AddressType {
  id: number;
  title: string;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  postalCode?: string | null;
  address: string;
  plaque?: string | null;
  unit?: string | null;
  isDefault: boolean;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  processing: 'در حال پردازش',
  ready_to_ship: 'آماده ارسال',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
  refunded: 'مستردشده',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  processing: 'bg-blue-100 text-blue-800',
  ready_to_ship: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-violet-100 text-violet-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-rose-100 text-rose-800',
  refunded: 'bg-slate-200 text-slate-700',
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending: 'در انتظار بازبینی',
  published: 'منتشرشده',
  archived: 'بایگانی',
};
