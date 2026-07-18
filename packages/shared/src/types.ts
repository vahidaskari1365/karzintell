/** تایپ‌های مشترک API بین فرانت و بک‌اند. */

/** Envelope استاندارد پاسخ‌ها */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
  traceId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

/** وضعیت‌های دامنه (هم‌خوان با ENUM دیتابیس) */
export const ORDER_STATUSES = [
  'pending_payment', 'paid', 'processing', 'ready_to_ship',
  'shipped', 'delivered', 'cancelled', 'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PRODUCT_STATUSES = ['draft', 'pending', 'published', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const USER_STATUSES = ['active', 'pending', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
