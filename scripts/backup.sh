#!/usr/bin/env bash
# ============================================================================
# بکاپ روزانه MySQL/MariaDB کارزینتل (مناسب cPanel)
# برای mysqldump از DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME استفاده می‌شود.
# رمز عبور هرگز روی خط فرمان قرار نمی‌گیرد (MYSQL_PWD فقط برای subprocess است).
# اجرای دستی: bash scripts/backup.sh
# کرون:       0 3 * * * /path/to/karzintell/scripts/backup.sh >> /var/log/krz-backup.log 2>&1
# ============================================================================
set -euo pipefail

: "${DB_HOST:?DB_HOST تنظیم نشده است}"
: "${DB_PORT:?DB_PORT تنظیم نشده است}"
: "${DB_USER:?DB_USER تنظیم نشده است}"
: "${DB_NAME:?DB_NAME تنظیم نشده است}"
: "${DB_PASSWORD:?DB_PASSWORD تنظیم نشده است}"

if ! command -v mysqldump >/dev/null 2>&1; then
  echo "mysqldump نصب نیست؛ MySQL/MariaDB client را نصب کنید." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
TS="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/karzintell-${TS}.sql.gz"

mkdir -p "$BACKUP_DIR"
echo "[$(date -Is)] شروع بکاپ MySQL/MariaDB ..."

MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  "$DB_NAME" | gzip -9 > "$FILE"

SIZE="$(du -h "$FILE" | cut -f1)"
echo "[$(date -Is)] بکاپ ساخته شد: ${FILE} (${SIZE})"
find "$BACKUP_DIR" -maxdepth 1 -name 'karzintell-*.sql.gz' -mtime +"$KEEP_DAYS" -print -delete || true

if [[ -n "$S3_BUCKET" ]] && command -v aws >/dev/null 2>&1; then
  aws s3 cp "$FILE" "${S3_BUCKET}/$(basename "$FILE")" --only-show-errors
  echo "[$(date -Is)] آپلود به ${S3_BUCKET} انجام شد"
fi

echo "[$(date -Is)] پایان موفق ✅"
