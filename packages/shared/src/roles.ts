import type { PermissionKey } from "./permissions.js";

/**
 * نقش‌های سیستمی پیش‌فرض و تخصیص مجوزها
 * دقیقاً مطابق seed های database/schema.sql (بخش ۹)
 */
export interface SystemRoleSeed {
  id: number;
  name: string;
  title: string;
  description: string;
  permissions: PermissionKey[] | "*";
}

export const SYSTEM_ROLES: SystemRoleSeed[] = [
  {
    id: 1,
    name: "super_admin",
    title: "مدیر ارشد (Admin)",
    description: "دسترسی کامل به همه بخش‌ها؛ قابل حذف نیست",
    permissions: "*",
  },
  {
    id: 2,
    name: "product_manager",
    title: "مدیر محصول",
    description: "ثبت و ویرایش محصولات، دسته‌ها، برندها و موجودی",
    permissions: [
      "dashboard.view",
      "products.view",
      "products.create",
      "products.update",
      "products.delete",
      "products.publish",
      "categories.manage",
      "brands.manage",
      "attributes.manage",
      "inventory.view",
      "inventory.manage",
      "files.manage",
    ],
  },
  {
    id: 3,
    name: "order_manager",
    title: "مدیر سفارش",
    description: "مدیریت سفارش‌ها، پرداخت‌ها و بازپرداخت",
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.update_status",
      "orders.cancel",
      "orders.refund",
      "payments.view",
      "customers.view",
      "inventory.view",
      "reports.view",
    ],
  },
  {
    id: 4,
    name: "support",
    title: "پشتیبانی",
    description: "پاسخ به تیکت‌ها و مشاهده سفارش‌ها و مشتریان",
    permissions: ["dashboard.view", "orders.view", "customers.view", "tickets.view", "tickets.reply"],
  },
  {
    id: 5,
    name: "content_manager",
    title: "مدیر محتوا",
    description: "مدیریت بنرها، صفحات سایت، دیدگاه‌ها و پرسش‌ها",
    permissions: [
      "dashboard.view",
      "banners.manage",
      "pages.manage",
      "reviews.moderate",
      "questions.moderate",
      "files.manage",
    ],
  },
  {
    id: 6,
    name: "warehouse",
    title: "انباردار",
    description: "مدیریت موجودی و انبار",
    permissions: ["dashboard.view", "products.view", "orders.view", "inventory.view", "inventory.manage"],
  },
  { id: 7, name: "customer", title: "مشتری", description: "کاربر عادی فروشگاه (بدون دسترسی پنل ادمین)", permissions: [] },
];
