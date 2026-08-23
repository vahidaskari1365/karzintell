#!/usr/bin/env bash
# ============================================================================
#  کارزینتل — راه‌اندازی روی هاست اشتراکی (بدون داکر)
#  کارها (همه خودکار):
#   1) نصب وابستگی‌ها (npm ci)
#   2) ساخت خودکار دیتابیس و جدول‌ها (اگر هنوز ساخته نشده باشند)
#   3) اجرای seed (ادمین‌ها، نقش‌ها، تنظیمات)
#   4) بیلد بک‌اند و فرانت‌اند
#   5) بالا آوردن API و وب
#
#  اجرا روی هاست:
#    bash scripts/shared-host-setup.sh
# ============================================================================
set -euo pipefail

echo "==> [1/5] نصب وابستگی‌ها ..."
npm ci --no-audit --no-fund

echo "==> [2/5] ساخت دیتابیس و جدول‌ها ..."
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-karzintell}"
DB_USER="${DB_USER:-karzintell}"
DB_PASSWORD="${DB_PASSWORD:-secret}"

# اگر mysql client در دسترس باشد، خودکار جدول‌ها ساخته می‌شود؛
# در غیر این صورت راهنمای phpMyAdmin چاپ می‌شود.
if command -v mysql >/dev/null 2>&1; then
  TABLES=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" \
    -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='users'" 2>/dev/null || echo "0")
  if [ "${TABLES:-0}" = "0" ]; then
    echo "    ساخت جدول‌ها از database/schema.sql ..."
    # حذف DROP/CREATE/USE — دیتابیس روی هاست از قبل ساخته شده است (phpMyAdmin)
    grep -vE "^DROP DATABASE|^CREATE DATABASE|^USE " database/schema.sql > /tmp/krz-schema-prod.sql
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < /tmp/krz-schema-prod.sql
    rm -f /tmp/krz-schema-prod.sql
    echo "    جدول‌ها ساخته شدند."
  else
    echo "    جدول‌ها از قبل وجود دارند — رد شد."
  fi
else
  echo "    ⚠️ mysql client پیدا نشد."
  echo "    لطفاً از phpMyAdmin استفاده کنید:"
  echo "      ۱) دیتابیس '$DB_NAME' را بسازید"
  echo "      ۲) فایل database/schema.sql را Import کنید"
  echo "      ۳) سپس دوباره همین اسکریپت را اجرا کنید"
fi

echo "==> [3/5] اجرای seed (ادمین‌ها، نقش‌ها، تنظیمات) ..."
npm run seed

echo "==> [4/5] بیلد بک‌اند و فرانت‌اند ..."
npm run build

echo "==> [5/5] بالا آوردن سرویس‌ها ..."
echo "    برای اجرای همیشگی، از PM2 استفاده کنید:"
echo "      npm i -g pm2"
echo "      pm2 start 'npm run start -w apps/api' --name krz-api"
echo "      pm2 start 'npm run start -w apps/web' --name krz-web"
echo "      pm2 save && pm2 startup"

echo ""
echo "✅ راه‌اندازی کامل شد."
echo "   برای اجرای دستی (تست):"
echo "     npm run start -w apps/api &"
echo "     npm run start -w apps/web &"
