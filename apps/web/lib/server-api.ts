/**
 * آدرس مستقیم Backend برای رندر سمت سرور (SSR/ISR/ساید‌افکت‌های server) —
 * فقط سمت سرور استفاده می‌شود و هرگز به مرورگر نشت نمی‌کند (بدون NEXT_PUBLIC).
 *
 * روی cPanel/Shared Hosting، Backend روی همان هاست اجرا می‌شود؛ بنابراین این
 * آدرس یک آدرس داخلی است:
 *   - http://127.0.0.1:<port-backend>   (پیش‌فرض)
 *   - یا ساب‌دامن اختصاصی Backend: http://api.karzintell.com
 *
 * مرورگر همچنان از /api/v1 همان Origin استفاده می‌کند (rewrites در next.config).
 */
export function serverApiUrl(): string {
  return (
    process.env.SERVER_API_URL ||
    process.env.BACKEND_URL ||
    process.env.INTERNAL_API_URL ||
    'http://127.0.0.1:4000'
  ).replace(/\/+$/, '');
}

/** Base URL کامل API برای fetch سمت سرور */
export const SERVER_API_BASE = `${serverApiUrl()}/api/v1`;
