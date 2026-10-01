<div dir="rtl">

# راه‌اندازی کارزینتل روی VPS / Docker با MySQL

این راهنما API و فرانت را با Docker اجرا می‌کند؛ دیتابیس رسمی فروشگاه MySQL/MariaDB
است (روی سرور MySQL یا سرویس مدیریت‌شده) و migration خودکاری در compose وجود ندارد.

## پیش‌نیاز

- VPS لینوکسی با حداقل ۲ گیگ RAM و Docker/Compose
- دامنه و HTTPS (برای پرداخت، cookie و callback ضروری است)
- دیتابیس MySQL 8 / MariaDB 10.5+ (Database و User از قبل ساخته شده)

## ۱) دریافت کد و تنظیم secretها

```bash
git clone https://github.com/vahidaskari1365/karzintell.git
cd karzintell
cp .env.example .env
nano .env
```

مقدارهای ضروری production:

| متغیر | توضیح |
|---|---|
| `DB_HOST` | آدرس MySQL (روی سرور: `localhost`) |
| `DB_PORT` | پورت MySQL (پیش‌فرض `3306`) |
| `DB_USER` | کاربر MySQL |
| `DB_PASSWORD` | رمز MySQL |
| `DB_NAME` | نام Database |
| `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` | دو مقدار تصادفی مستقل؛ حداقل ۳۲ کاراکتر |
| `API_PUBLIC_URL` و `WEB_URL` | URLهای HTTPS واقعی |
| `CORS_ORIGINS` | فقط origin فرانت، بدون wildcard |
| `NEXT_PUBLIC_SITE_URL` و `NEXT_PUBLIC_APP_URL` | URL سایت |
| `NEXT_PUBLIC_STORAGE_URL` | URL عمومی S3/سرویس فایل |
| `REDIS_PASSWORD`، `MEILI_API_KEY`، کلید S3/MinIO | secretهای سرویس‌های compose |
| `SEED_ADMIN_*` | فقط برای اولین seed و فقط از secret manager |

## ۲) اجرای migration و seed

```bash
npm install
npm run build
npm run db:migrate
SEED_ADMIN_PASSWORD='یک رمز موقت قوی' npm run seed
```

TypeORM با استفاده از جدول `migrations` فقط Migration‌های اجرانشده را اجرا می‌کند؛
بنابراین اجرای مجدد `npm run db:migrate` امن و idempotent است.

## ۳) اجرای سرویس‌ها

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
curl https://api.example.com/api/v1/health
```

Compose سرویس‌های Redis، Meilisearch، MinIO، API و Web را اجرا می‌کند. برای استفاده از
S3 خارجی، `S3_ENDPOINT` و credentials اختصاصی Storage/S3 را تنظیم کنید و MinIO را از
compose خارج کنید.

`RUN_SEED` به‌صورت پیش‌فرض خاموش است. migration و seed را با job/CI کنترل‌شده اجرا کنید،
نه در هر restart سرویس.

## ۴) HTTPS و reverse proxy

- دامنه اصلی به Web روی پورت 3000 و دامنه API به پورت 4000 proxy شود.
- `CORS_ORIGINS` دقیقاً origin اصلی را داشته باشد.
- `PAYMENT_CALLBACK_BASE` و `PAYMENT_FRONT_RESULT_URL` حتماً HTTPS باشند.
- برای cookie، HSTS و callback هیچ mixed-content یا URL داخلی استفاده نکنید.

## ۵) بکاپ و بازیابی

```bash
DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... \
  BACKUP_DIR=/var/backups/karzintell bash scripts/backup.sh
```

بکاپ با `mysqldump` تولید می‌شود؛ حداقل یک بار بازیابی را روی دیتابیس آزمایشی امتحان
کنید و retention و آپلود S3 را بررسی کنید.

## رفع خطاهای رایج

| خطا | راه‌حل |
|---|---|
| `DB_HOST is required` | `.env` compose را با اطلاعات MySQL پر کنید |
| API به DB وصل نمی‌شود | `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` و allowlist شبکه را بررسی کنید |
| سایت به API وصل نمی‌شود | `INTERNAL_API_URL=http://api:4000/api/v1` برای build و `CORS_ORIGINS` را بررسی کنید |
| seed اجرا نمی‌شود | migration را اول اعمال و `SEED_ADMIN_PASSWORD` را تنظیم کنید |

</div>
