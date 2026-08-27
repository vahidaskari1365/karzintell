import type { NextConfig } from 'next';

/**
 * تنظیمات Next.js — Production روی cPanel/Shared Hosting:
 *
 * مرورگر فقط با دامنه خود سایت (https://karzintell.com) صحبت می‌کند.
 * درخواست‌های /api/v1 و /uploads توسط همین سرور (rewrites) به Backend
 * Node.js فوروارد می‌شوند؛ Backend با BACKEND_URL مشخص می‌شود
 * (پیش‌فرض: http://127.0.0.1:4000 — همان هاست).
 *
 * هیچ وابستگی به Vercel، Supabase یا سرویس خارجی برای اجرا وجود ندارد.
 */

// Backend روی همان هاست: در cPanel معمولاً http://127.0.0.1:<port-backend>
// یا ساب‌دامن اختصاصی Backend (مثلاً http://api.karzintell.com)
const apiOrigin = (process.env.BACKEND_URL || process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');

const nextConfig: NextConfig = {
  images: {
    // تصاویر از هاست خود سایت (یا لینک خارجی) — بدون بهینه‌سازی Next کار می‌کنیم
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        // API Backend از همان Origin — بدون وابستگی به localhost در Browser
        source: '/api/v1/:path*',
        destination: `${apiOrigin}/api/v1/:path*`,
      },
      {
        // فایل‌های آپلودشده (درایور local) از Backend سرو می‌شوند
        source: '/uploads/:path*',
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
      {
        // صفحات کاربری و مدیریتی نباید ایندکس شوند (حتی با لینک مستقیم)
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/account/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/cart',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/checkout/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // نتایج جستجو محتوای تکراری/نازک است — فقط crawl شود نه index
        source: '/search',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },
    ];
  },
};

export default nextConfig;
