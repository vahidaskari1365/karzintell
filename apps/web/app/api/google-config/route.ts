/**
 * API route: /api/google-config
 *
 * این endpoint، Google Client ID را از server-side env می‌خواند و به client برمی‌گرداند.
 * این راه‌حل بهتر از NEXT_PUBLIC_* است چون:
 * - نیازی به build-time env نیست (در runtime از cPanel خوانده می‌شود)
 * - کاربر مجبور نیست برای تنظیم Client ID، deploy جدید انجام دهد
 * - اگر env تغییر کند، فقط کافیست cPanel restart شود
 *
 * Usage: GET /api/google-config → { clientId: "..." }
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  return NextResponse.json({
    clientId,
    enabled: !!clientId,
  });
}
