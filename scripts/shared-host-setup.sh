#!/usr/bin/env bash
# ============================================================================
# کارزینتل — راه‌اندازی بدون Docker با Supabase/PostgreSQL
# migration را با Supabase CLI یا SQL Editor اجرا کنید؛ این اسکریپت دیتابیس را
# drop/create نمی‌کند و فقط seed کنترل‌شده، build و راهنمای اجرای سرویس‌ها را انجام می‌دهد.
# ============================================================================
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL برای اتصال به Supabase لازم است}"

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  : "${JWT_ACCESS_SECRET:?JWT_ACCESS_SECRET لازم است}"
  : "${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET لازم است}"
fi

echo "==> [1/4] نصب وابستگی‌ها ..."
npm ci --no-audit --no-fund

echo "==> [2/4] بررسی migration ..."
if command -v supabase >/dev/null 2>&1; then
  echo "    برای اجرای migration: supabase db push"
else
  echo "    Supabase CLI نصب نیست؛ supabase/migrations/20260825000000_initial_store.sql را در SQL Editor اجرا کنید."
fi

if [[ -n "${SEED_ADMIN_PASSWORD:-}" ]]; then
  echo "==> [3/4] اجرای seed idempotent ..."
  npm run seed
else
  echo "==> [3/4] seed رد شد؛ برای seed امن SEED_ADMIN_PASSWORD را فقط در محیط اجرا تنظیم کنید."
fi

echo "==> [4/4] بیلد مشترک، API و فرانت‌اند ..."
npm run build

echo ""
echo "✅ آماده شد. برای اجرای همیشگی:"
echo "  pm2 start 'npm run start -w apps/api' --name krz-api"
echo "  pm2 start 'npm run start -w apps/web' --name krz-web"
echo "  pm2 save && pm2 startup"
