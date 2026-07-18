/**
 * فهرست کامل مجوزهای سیستم — منبع واحد حقیقت (Single Source of Truth)
 * دقیقاً هم‌نام با جدول permissions در database/schema.sql
 */
export const PERMISSIONS = [
  // داشبورد
  { key: "dashboard.view", title: "مشاهده داشبورد", group: "dashboard" },
  // کاربران
  { key: "users.view", title: "مشاهده کاربران", group: "users" },
  { key: "users.create", title: "ایجاد کاربر", group: "users" },
  { key: "users.update", title: "ویرایش کاربر", group: "users" },
  { key: "users.delete", title: "حذف کاربر", group: "users" },
  { key: "users.assign_role", title: "تخصیص نقش به کاربر", group: "users" },
  // نقش‌ها
  { key: "roles.view", title: "مشاهده نقش‌ها", group: "roles" },
  { key: "roles.create", title: "ایجاد نقش", group: "roles" },
  { key: "roles.update", title: "ویرایش نقش و مجوزها", group: "roles" },
  { key: "roles.delete", title: "حذف نقش", group: "roles" },
  // محصولات
  { key: "products.view", title: "مشاهده محصولات", group: "products" },
  { key: "products.create", title: "ایجاد محصول", group: "products" },
  { key: "products.update", title: "ویرایش محصول", group: "products" },
  { key: "products.delete", title: "حذف محصول", group: "products" },
  { key: "products.publish", title: "انتشار محصول", group: "products" },
  // کاتالوگ
  { key: "categories.manage", title: "مدیریت دسته‌بندی‌ها", group: "catalog" },
  { key: "brands.manage", title: "مدیریت برندها", group: "catalog" },
  { key: "attributes.manage", title: "مدیریت صفت‌ها", group: "catalog" },
  // انبار
  { key: "inventory.view", title: "مشاهده موجودی", group: "inventory" },
  { key: "inventory.manage", title: "اصلاح موجودی انبار", group: "inventory" },
  // سفارش‌ها
  { key: "orders.view", title: "مشاهده سفارش‌ها", group: "orders" },
  { key: "orders.update_status", title: "تغییر وضعیت سفارش", group: "orders" },
  { key: "orders.cancel", title: "لغو سفارش", group: "orders" },
  { key: "orders.refund", title: "عودت وجه", group: "orders" },
  // پرداخت‌ها
  { key: "payments.view", title: "مشاهده تراکنش‌ها", group: "payments" },
  // مشتریان
  { key: "customers.view", title: "مشاهده مشتریان", group: "customers" },
  { key: "customers.manage", title: "مدیریت مشتریان", group: "customers" },
  // نظارت محتوا
  { key: "reviews.moderate", title: "تایید/رد دیدگاه‌ها", group: "moderation" },
  { key: "questions.moderate", title: "پاسخ به پرسش‌ها", group: "moderation" },
  // بازاریابی
  { key: "coupons.manage", title: "مدیریت کدهای تخفیف", group: "marketing" },
  { key: "banners.manage", title: "مدیریت بنرها", group: "marketing" },
  { key: "pages.manage", title: "مدیریت صفحات محتوایی", group: "marketing" },
  // تیکت‌ها
  { key: "tickets.view", title: "مشاهده تیکت‌ها", group: "tickets" },
  { key: "tickets.reply", title: "پاسخ به تیکت‌ها", group: "tickets" },
  // تنظیمات
  { key: "settings.manage", title: "مدیریت تنظیمات", group: "settings" },
  { key: "audit.view", title: "مشاهده لاگ عملیات", group: "settings" },
  { key: "files.manage", title: "مدیریت فایل‌ها", group: "settings" },
  // گزارش‌ها
  { key: "reports.view", title: "مشاهده گزارش‌ها", group: "reports" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

/** گروه‌بندی مجوزها برای نمایش ماتریسی در پنل ادمین */
export const PERMISSION_GROUPS: Record<string, string> = {
  dashboard: "داشبورد",
  users: "کاربران",
  roles: "نقش‌ها",
  products: "محصولات",
  catalog: "کاتالوگ",
  inventory: "انبار",
  orders: "سفارش‌ها",
  payments: "پرداخت‌ها",
  customers: "مشتریان",
  moderation: "نظارت محتوا",
  marketing: "بازاریابی",
  tickets: "تیکت‌ها",
  settings: "تنظیمات",
  reports: "گزارش‌ها",
};
