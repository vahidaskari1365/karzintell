#!/usr/bin/env bash
# ============================================================================
# کارزینتل — راه‌اندازی بدون Docker با MySQL/MariaDB (cPanel)
# دیتابیس و کاربر آن را در cPanel بسازید؛ این اسکریپت دیتابیس را drop/create
# نمی‌کند و فقط migration، seed کنترل‌شده، build و راهنمای اجرای سرویس‌ها را انجام می‌دهد.
# ============================================================================
set -euo pipefail

: "${DB_HOST:?DB_HOST تنظیم نشده است}"
: "${DB_USER:?DB_USER تنظیم نشده است}"
: "${DB_NAME:?DB_NAME تنظیم نشده است}"

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  : "${DB_PASSWORD:?DB_PASSWORD لازم است}"
  : "${JWT_ACCESS_SECRET:?JWT_ACCESS_SECRET لازم است}"
  : "${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET لازم است}"
fi

echo "==> [1/5] نصب وابستگی‌ها ..."
npm ci --no-audit --no-fund

echo "==> [2/5] اجرای migration (TypeORM) ..."
npm run db:migrate

if [[ -n "${SEED_ADMIN_PASSWORD:-}" ]]; then
  echo "==> [3/5] اجرای seed idempotent ..."
  npm run seed
else
  echo "==> [3/5] seed رد شد؛ برای seed امن SEED_ADMIN_PASSWORD را فقط در محیط اجرا تنظیم کنید."
fi

echo "==> [4/5] بیلد مشترک، API و فرانت‌اند ..."
npm run build

echo "==> [5/5] اجرای همیشگی ..."
echo ""
echo "✅ آماده شد. برای اجرای همیشگی:"
echo "  pm2 start 'npm run start -w apps/api' --name krz-api"
echo "  pm2 start 'npm run start -w apps/web' --name krz-web"
echo "  pm2 save && pm2 startup"
