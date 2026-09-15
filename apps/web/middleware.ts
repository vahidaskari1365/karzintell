import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware برای ریدایرکت HTTP به HTTPS در Production
 *
 * این middleware روی هر درخواستی اجرا می‌شود و اگر درخواست از طریق HTTP باشد
 * (و محیط production باشد)، کاربر را به HTTPS ریدایرکت می‌کند.
 *
 * این کار برای جلوگیری از حملات man-in-the-middle و همچنین برای فعال‌سازی
 * صحیح HSTS لازم است.
 *
 * نکته: در cPanel/LiteSpeed، Next.js روی پورت داخلی (مثلاً 3000) اجرا می‌شود
 * و LiteSpeed به‌عنوان reverse proxy عمل می‌کند. بنابراین باید از هدر host
 * و x-forwarded-proto برای تشخیص دامنه واقعی و پروتکل استفاده کنیم.
 */
export function middleware(request: NextRequest) {
  // فقط در production فعال است
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const { headers, nextUrl } = request;

  // پروتکل از هدر x-forwarded-proto تشخیص داده می‌شود (cPanel/LiteSpeed این هدر را ارسال می‌کند)
  const forwardedProto = headers.get('x-forwarded-proto') || '';
  const isHttps = forwardedProto.includes('https') || nextUrl.protocol === 'https:';

  if (!isHttps) {
    // دامنه واقعی از هدر host گرفته می‌شود (نه از nextUrl که localhost:3000 است)
    const host = headers.get('host') || headers.get('x-forwarded-host') || nextUrl.host;
    const httpsUrl = `https://${host}${nextUrl.pathname}${nextUrl.search}`;
    return NextResponse.redirect(httpsUrl, 301);
  }

  // اضافه کردن هدر HSTS اگر HTTPS است
  const response = NextResponse.next();
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  return response;
}

export const config = {
  // روی همه مسیرها فعال است به‌جز فایل‌های استاتیک
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|karzin-logo|opengraph-image|fonts|assets|sw.js).*)',
  ],
};
