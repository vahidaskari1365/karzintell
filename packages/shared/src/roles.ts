/** نام نقش‌های سیستمی (هم‌خوان با seed دیتابیس). */
export const SYSTEM_ROLES = {
  SuperAdmin: 'super_admin',
  Manager: 'manager',
  Support: 'support',
  Warehouse: 'warehouse',
  Customer: 'customer',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
