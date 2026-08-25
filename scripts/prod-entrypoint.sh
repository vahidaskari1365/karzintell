#!/usr/bin/env bash
# ============================================================================
# کارزینتل — entrypoint بک‌اند در Production
# migration دیتابیس عمداً در زمان بالا آمدن API اجرا نمی‌شود؛ آن را با
# `supabase db push` از یک مسیر کنترل‌شده اجرا کنید. Seed نیز فقط با RUN_SEED=true
# و secretهای SEED_* که از secret manager آمده‌اند اجرا می‌شود.
# ============================================================================
set -euo pipefail

if [[ "${RUN_SEED:-false}" == "true" || "${RUN_SEED:-false}" == "1" ]]; then
  if [[ -z "${SEED_ADMIN_PASSWORD:-}" ]]; then
    echo "[init] RUN_SEED فعال است اما SEED_ADMIN_PASSWORD تنظیم نشده؛ برای جلوگیری از seed ناخواسته متوقف شد." >&2
    exit 1
  fi
  echo "[init] running PostgreSQL/Supabase seed ..."
  cd /app/apps/api
  npm run seed
  cd /app
  echo "[init] seed done."
else
  echo "[init] database migration/seed skipped (RUN_SEED=false)."
fi

echo "[init] starting API ..."
exec node /app/apps/api/dist/main.js
