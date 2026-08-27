#!/usr/bin/env bash
# ============================================================================
# کارزینتل — راه‌اندازی بدون Docker با MySQL/MariaDB (cPanel / سرور اختصاصی)
#
# دیتابیس و کاربر آن را در cPanel بسازید؛ این اسکریپت دیتابیس را drop/create
# نمی‌کند و فقط install، build، migration و seed را انجام می‌دهد.
#
# نحوه اجرا (از Terminal/SSH هاست):
#   cd /home/USERNAME/karzintell
#   bash scripts/shared-host-setup.sh
#
# برای اجرای همیشگی روی cPanel به DEPLOY-CPANEL.md مراجعه کنید
# (دو Node.js Application: Backend در apps/api و Frontend در apps/web).
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"

: "${DB_HOST:?DB_HOST تنظیم نشده است}"
: "${DB_USER:?DB_USER تنظیم نشده است}"
: "${DB_NAME:?DB_NAME تنظیم نشده است}"

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  : "${DB_PASSWORD:?DB_PASSWORD لازم است}"
  : "${JWT_ACCESS_SECRET:?JWT_ACCESS_SECRET لازم است}"
  : "${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET لازم است}"
fi

echo "==> [1/6] نصب وابستگی‌های Backend (apps/api — مستقل) ..."
(cd "$API_DIR" && npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)

echo "==> [2/6] بیلد Backend ..."
(cd "$API_DIR" && npm run build)

echo "==> [3/6] اجرای migration (TypeORM → MySQL) ..."
(cd "$API_DIR" && npm run db:migrate)

if [[ -n "${SEED_ADMIN_PASSWORD:-}" ]]; then
  echo "==> [4/6] اجرای seed idempotent ..."
  (cd "$API_DIR" && npm run seed)
else
  echo "==> [4/6] seed رد شد؛ برای seed امن SEED_ADMIN_PASSWORD را فقط در محیط اجرا تنظیم کنید."
fi

echo "==> [5/6] نصب وابستگی‌های Frontend (apps/web — مستقل) ..."
(cd "$WEB_DIR" && npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)

echo "==> [6/6] بیلد Frontend ..."
(cd "$WEB_DIR" && npm run build)

echo ""
echo "✅ آماده شد."
echo ""
if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo "برای اجرای همیشگی روی cPanel (دو Node.js Application):"
  echo "  1) Backend  : Application Root = $API_DIR | Startup = dist/main.js"
  echo "  2) Frontend : Application Root = $WEB_DIR | Startup = server.js"
  echo "  راهنمای کامل: DEPLOY-CPANEL.md"
else
  echo "برای اجرای توسعه:"
  echo "  npm run dev    # از ریشه ریپو (API روی :4000 + وب روی :3000)"
fi
