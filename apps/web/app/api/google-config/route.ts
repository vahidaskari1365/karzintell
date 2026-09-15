/**
 * API route: /api/google-config
 *
 * این endpoint، Google Client ID را از server-side env می‌خواند و به client برمی‌گرداند.
 *
 * منابع Client ID (به ترتیب اولویت):
 * 1. GOOGLE_CLIENT_ID (env در cPanel)
 * 2. NEXT_PUBLIC_GOOGLE_CLIENT_ID (env در cPanel)
 * 3._hardcoded (fallback — این ID عمومی است و در browser قابل دیدن است)
 *
 * Note: Google OAuth Client ID برای web apps در browser قابل دیدن است و
 * امنیت خطر نمی‌کند (تنها از طریق authorized origins قابل استفاده است).
 */

import { NextResponse } from 'next/server';

// fallback: اگر env تنظیم نشده، از hardcoded value استفاده می‌شود
const FALLBACK_CLIENT_ID = '311322589709-jot72kn9gqoo98nhvt9jqh6v97saluva.apps.googleusercontent.com';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
    || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    || FALLBACK_CLIENT_ID;
  return NextResponse.json({
    clientId,
    enabled: !!clientId,
  });
}
