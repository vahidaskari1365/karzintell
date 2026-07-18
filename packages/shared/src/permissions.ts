/**
 * کارزینتل — منبع واحد حقیقت برای کلیدهای مجوز (هم‌خوان با database/schema.sql)
 * هم فرانت (نمایش/مخفی‌سازی اکشن‌ها) هم بک‌اند (Guardها) از همین لیست استفاده می‌کنند.
 */
export const PERMISSIONS = [
  'dashboard.view',
  // کاربران و نقش‌ها
  'users.view', 'users.create', 'users.update', 'users.delete', 'users.assign_role',
  'roles.view', 'roles.create', 'roles.update', 'roles.delete',
  // کاتالوگ
  'products.view', 'products.create', 'products.update', 'products.delete', 'products.publish',
  'categories.manage', 'brands.manage', 'attributes.manage',
  // انبار
  'inventory.view', 'inventory.manage',
  // سفارش و پرداخت
  'orders.view', 'orders.update_status', 'orders.cancel', 'orders.refund', 'payments.view',
  // مشتریان و نظارت
  'customers.view', 'customers.manage', 'reviews.moderate', 'questions.moderate',
  // بازاریابی
  'coupons.manage', 'banners.manage', 'pages.manage',
  // پشتیبانی
  'tickets.view', 'tickets.reply',
  // سیستمی
  'settings.manage', 'audit.view', 'files.manage', 'reports.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** سوپر ادمین — به‌جای لیست، این نشانه بررسی می‌شود. */
export const ALL_PERMISSIONS = '*' as const;
