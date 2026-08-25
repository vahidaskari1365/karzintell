#!/usr/bin/env bash
# ============================================================================
# بکاپ روزانه Supabase/PostgreSQL کارزینتل
# برای pg_dump از DIRECT_DATABASE_URL (اتصال مستقیم Supabase) استفاده کنید؛
# DATABASE_URL فقط در صورت نبودن مقدار direct به کار می‌رود.
# رمز عبور هرگز روی خط فرمان قرار نمی‌گیرد و باید داخل URL/PG* secret manager باشد.
# اجرای دستی: bash scripts/backup.sh
# کرون:       0 3 * * * /path/to/karzintell/scripts/backup.sh >> /var/log/krz-backup.log 2>&1
# ============================================================================
set -euo pipefail

DATABASE_URL="${DIRECT_DATABASE_URL:-${DATABASE_URL:-}}"
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL یا DIRECT_DATABASE_URL تنظیم نشده است." >&2
  exit 1
fi
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump نصب نیست؛ PostgreSQL client را نصب کنید." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
TS="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/karzintell-${TS}.sql.gz"

mkdir -p "$BACKUP_DIR"
echo "[$(date -Is)] شروع بکاپ PostgreSQL ..."

# pg_dump رمز را از آرگومان نمی‌گیرد؛ URL فقط از env به subprocess منتقل می‌شود.
pg_dump --dbname="$DATABASE_URL" --no-owner --no-privileges --format=plain | gzip -9 > "$FILE"

SIZE="$(du -h "$FILE" | cut -f1)"
echo "[$(date -Is)] بکاپ ساخته شد: ${FILE} (${SIZE})"
find "$BACKUP_DIR" -maxdepth 1 -name 'karzintell-*.sql.gz' -mtime +"$KEEP_DAYS" -print -delete || true

if [[ -n "$S3_BUCKET" ]] && command -v aws >/dev/null 2>&1; then
  aws s3 cp "$FILE" "${S3_BUCKET}/$(basename "$FILE")" --only-show-errors
  echo "[$(date -Is)] آپلود به ${S3_BUCKET} انجام شد"
fi

echo "[$(date -Is)] پایان موفق ✅"
