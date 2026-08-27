/**
 * کپی vendored از packages/shared — برای اجرای مستقل Backend روی هاست‌های
 * cPanel/Shared Hosting (بدون نیاز به workspace npm و بدون مراجعه به registry
 * برای @karzintell/shared).
 *
 * ⚠️ اگر در packages/shared/src تغییری دادید، همین ۴ فایل را اینجا هم به‌روز
 * کنید (permissions.ts, roles.ts, types.ts, index.ts).
 */
export * from "./permissions";
export * from "./roles";
export * from "./types";
