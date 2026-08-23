#!/usr/bin/env bash
# ============================================================================
# بکاپ روزانه MySQL کارزینتل — mysqldump → gzip → چرخش فایل‌ها (Retention)
# اختیاری: آپلود به S3/MinIO اگر AWS CLI نصب و S3_BACKUP_BUCKET تنظیم شده باشد.
#
# اجرای دستی:   bash scripts/backup.sh
# کرون روزانه:  0 3 * * * /path/to/karzintell/scripts/backup.sh >> /var/log/krz-backup.log 2>&1
# در داکر:      docker compose exec api sh -c '/app/scripts/backup.sh'   (یا سرویس cron جدا)
# ============================================================================
set -euo pipefail

# -------------------------------- تنظیمات (از env با پیش‌فرض توسعه)
DB_HOST="${MYSQL_HOST:-localhost}"
DB_PORT="${MYSQL_PORT:-3306}"
DB_USER="${MYSQL_USER:-root}"
DB_PASS="${MYSQL_PASSWORD:-root_secret}"
DB_NAME="${MYSQL_DATABASE:-karzintell}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"          # نگهداری ۱۴ روز اخیر
S3_BUCKET="${S3_BACKUP_BUCKET:-}"            # مثال: s3://karzintell-backups
TS="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/karzintell-${TS}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] شروع بکاپ از ${DB_HOST}:${DB_PORT}/${DB_NAME} ..."

# دامپ کامل (بدون پسورد روی خط فرمان تا در ps لیست نشود)
export MYSQL_PWD="$DB_PASS"
mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --single-transaction --routines --triggers --events \
  --default-character-set=utf8mb4 \
  --set-gtid-purged=OFF --column-statistics=0 \
  "$DB_NAME" | gzip -9 > "$FILE"
unset MYSQL_PWD

SIZE="$(du -h "$FILE" | cut -f1)"
echo "[$(date -Is)] بکاپ ساخته شد: ${FILE} (${SIZE})"

# چرخش: حذف بکاپ‌های قدیمی‌تر از KEEP_DAYS
find "$BACKUP_DIR" -maxdepth 1 -name 'karzintell-*.sql.gz' -mtime +"$KEEP_DAYS" -print -delete || true

# آپلود اختیاری به S3
if [ -n "$S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
  aws s3 cp "$FILE" "${S3_BUCKET}/$(basename "$FILE")" --only-show-errors \
    && echo "[$(date -Is)] آپلود به ${S3_BUCKET} انجام شد"
fi

echo "[$(date -Is)] پایان موفق ✅"
