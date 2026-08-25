<div dir="rtl">

# راه‌اندازی کارزینتل روی VPS با Supabase

این راهنما API و فرانت را با Docker اجرا می‌کند؛ دیتابیس رسمی فروشگاه در Supabase مدیریت
می‌شود و migration خودکاری در compose وجود ندارد.

## پیش‌نیاز

- VPS لینوکسی با حداقل ۲ گیگ RAM و Docker/Compose
- دامنه و HTTPS (برای پرداخت، cookie و callback ضروری است)
- پروژه Supabase و اتصال pooled/direct

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
| `DATABASE_URL` | connection pooler Supabase روی 6543 برای API |
| `DIRECT_DATABASE_URL` | اتصال مستقیم Supabase روی 5432 برای migration/seed/backup |
| `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` | دو مقدار تصادفی مستقل؛ حداقل ۳۲ کاراکتر |
| `API_PUBLIC_URL` و `WEB_URL` | URLهای HTTPS واقعی |
| `CORS_ORIGINS` | فقط origin فرانت، بدون wildcard |
| `NEXT_PUBLIC_SITE_URL` و `NEXT_PUBLIC_APP_URL` | URL سایت |
| `NEXT_PUBLIC_STORAGE_URL` | URL عمومی Supabase Storage یا S3 |
| `REDIS_PASSWORD`، `MEILI_API_KEY`، کلید S3/MinIO | secretهای سرویس‌های compose |
| `SEED_ADMIN_*` | فقط برای اولین seed و فقط از secret manager |

## ۲) اجرای migration و seed

از یک محیط دارای Supabase CLI:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

سپس در همان محیطی که `DIRECT_DATABASE_URL` و رمز seed تنظیم شده:

```bash
npm ci
SEED_ADMIN_PASSWORD='یک رمز موقت قوی' npm run seed
```

رمز ادمین در repo، migration یا Docker image ثابت نیست. پس از اولین ورود، آن را تغییر دهید.

## ۳) اجرای سرویس‌ها

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
curl https://api.example.com/api/v1/health
```

Compose سرویس‌های Redis، Meilisearch، MinIO، API و Web را اجرا می‌کند. برای استفاده از
Supabase Storage، `S3_ENDPOINT` و credentials اختصاصی Storage/S3 را تنظیم کنید و MinIO را
از compose خارج کنید؛ هرگز از service-role key در مرورگر استفاده نکنید.

`RUN_SEED` به‌صورت پیش‌فرض خاموش است. migration و seed را با job/CI کنترل‌شده اجرا کنید،
نه در هر restart سرویس.

## ۴) HTTPS و reverse proxy

- دامنه اصلی به Web روی پورت 3000 و دامنه API به پورت 4000 proxy شود.
- `CORS_ORIGINS` دقیقاً origin اصلی را داشته باشد.
- `PAYMENT_CALLBACK_BASE` و `PAYMENT_FRONT_RESULT_URL` حتماً HTTPS باشند.
- برای cookie، HSTS و callback هیچ mixed-content یا URL داخلی استفاده نکنید.

## ۵) بکاپ و بازیابی

```bash
DIRECT_DATABASE_URL='postgresql://...' BACKUP_DIR=/var/backups/karzintell bash scripts/backup.sh
```

بکاپ با `pg_dump` تولید می‌شود؛ حداقل یک بار بازیابی را روی پروژه آزمایشی Supabase امتحان
کنید و retention و آپلود S3 را بررسی کنید.

## رفع خطاهای رایج

| خطا | راه‌حل |
|---|---|
| `DATABASE_URL is required` | `.env` compose را با pooled URL پر کنید |
| API به DB وصل نمی‌شود | direct/pooled URL، رمز، SSL و allowlist شبکه Supabase را بررسی کنید |
| سایت به API وصل نمی‌شود | `INTERNAL_API_URL=http://api:4000/api/v1` برای build و `CORS_ORIGINS` را بررسی کنید |
| seed اجرا نمی‌شود | migration را اول اعمال و `DIRECT_DATABASE_URL` + `SEED_ADMIN_PASSWORD` را تنظیم کنید |

</div>
