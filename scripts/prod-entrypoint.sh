#!/usr/bin/env bash
# ============================================================================
#  کارزینتل — entrypoint بک‌اند در Production
#  کارها (همه خودکار، فقط بار اول):
#   1) منتظر آماده‌شدن MySQL می‌ماند
#   2) اگر جدول‌ها هنوز ساخته نشده‌اند، schema.sql را اجرا می‌کند (ساخت خودکار تیبل‌ها)
#   3) seed را اجرا می‌کند (ادمین‌ها، نقش‌ها، تنظیمات — idempotent)
#   4) سرویس API را بالا می‌آورد
# ============================================================================
set -euo pipefail

echo "[init] waiting for MySQL at ${DB_HOST:-mysql}:${DB_PORT:-3306} ..."
for i in $(seq 1 60); do
  if mysqladmin ping -h"${DB_HOST:-mysql}" -P"${DB_PORT:-3306}" -uroot -p"${DB_ROOT_PASSWORD:-root_secret}" --silent; then
    echo "[init] MySQL is up."
    break
  fi
  if [ "$i" = "60" ]; then
    echo "[init] ERROR: MySQL did not become ready in time." >&2
    exit 1
  fi
  sleep 2
done

# بررسی وجود جدول‌ها — اگر دیتابیس خالی است، اسکیما را می‌سازد
TABLES=$(mysql -h"${DB_HOST:-mysql}" -P"${DB_PORT:-3306}" -uroot -p"${DB_ROOT_PASSWORD:-root_secret}" \
  -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME:-karzintell}' AND table_name='users'" 2>/dev/null || echo "0")

if [ "${TABLES:-0}" = "0" ]; then
  echo "[init] building database schema (tables not found) ..."
  mysql -h"${DB_HOST:-mysql}" -P"${DB_PORT:-3306}" -uroot -p"${DB_ROOT_PASSWORD:-root_secret}" \
    < /app/database/schema.sql
  # اطمینان از دسترسی کاربر اپلیکیشن به دیتابیس
  mysql -h"${DB_HOST:-mysql}" -P"${DB_PORT:-3306}" -uroot -p"${DB_ROOT_PASSWORD:-root_secret}" \
    -e "GRANT ALL PRIVILEGES ON \`${DB_NAME:-karzintell}\`.* TO '${DB_USER:-karzintell}'@'%'; FLUSH PRIVILEGES;"
  echo "[init] schema ready."
else
  echo "[init] schema already exists — skipping schema build."
fi

echo "[init] running seed (idempotent) ..."
cd /app/apps/api && npm run seed
echo "[init] seed done."

echo "[init] starting API ..."
exec node /app/apps/api/dist/main.js
