/** انواع مشترک پاسخ API — مطابق مستندات docs/03-api-design.md */

export interface ApiMeta {
  requestId?: string;
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export interface ApiErrorItem {
  field?: string;
  message: string;
}

export type ApiResponse<T> =
  | { code: 0; message: "ok"; data: T; meta?: ApiMeta }
  | { code: number; message: string; data: null; errors?: ApiErrorItem[]; meta?: ApiMeta };

/* ------------------------------------------------------------------ */
/* سفارش                                                               */
/* وضعیت‌ها دقیقاً مطابق ENUM جدول orders در schema.sql هستند          */
/* ------------------------------------------------------------------ */

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  processing: "در حال پردازش",
  ready_to_ship: "آماده ارسال",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
  refunded: "عودت وجه‌شده",
};

/** گذار مجاز وضعیت سفارش (state machine سرور) */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["processing", "ready_to_ship", "cancelled", "refunded"],
  processing: ["ready_to_ship", "cancelled", "refunded"],
  ready_to_ship: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export const PAYMENT_STATUSES = ["initiated", "pending", "paid", "failed", "cancelled", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_GATEWAYS = ["zarinpal", "idpay", "zibal", "nextpay", "manual", "wallet"] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

/* ------------------------------------------------------------------ */
/* محصول                                                               */
/* ------------------------------------------------------------------ */

export const PRODUCT_STATUSES = ["draft", "pending", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "پیش‌نویس",
  pending: "در انتظار بررسی",
  published: "منتشرشده",
  archived: "آرشیوشده",
};

/* ------------------------------------------------------------------ */
/* کیف پول                                                             */
/* ------------------------------------------------------------------ */

export const WALLET_TX_TYPES = ["charge", "debit", "refund", "withdraw"] as const;
export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

export const WALLET_TX_TYPE_LABELS: Record<WalletTxType, string> = {
  charge: "شارژ کیف پول",
  debit: "پرداخت از کیف پول",
  refund: "عودت به کیف پول",
  withdraw: "برداشت",
};

/* ------------------------------------------------------------------ */
/* پیام‌های استاندارد خطا                                               */
/* ------------------------------------------------------------------ */

export const API_MESSAGES: Record<number, string> = {
  0: "ok",
  1000: "خطای داخلی سرور",
  1001: "احراز هویت نامعتبر است؛ لطفاً دوباره وارد شوید",
  1002: "دسترسی به این بخش مجاز نیست",
  1003: "مورد درخواستی یافت نشد",
  1004: "اطلاعات ارسالی معتبر نیست",
  1005: "زمان تأیید تراکنش به پایان رسیده یا تراکنش نامعتبر است",
  1006: "تعداد درخواست بیش از حد مجاز است؛ کمی بعد تلاش کنید",
  1007: "موجودی انبار کافی نیست",
  1008: "وضعیت فعلی سفارش امکان این تغییر را نمی‌دهد",
  1009: "کد تخفیف معتبر نیست یا منقضی شده است",
  1010: "موجودی کیف پول کافی نیست",
  1011: "کد تأیید نامعتبر یا منقضی است",
  1012: "کاربر موظف به تغییر رمز عبور است",
  1013: "درخواست تکراری است",
};
