<div dir="rtl">

# استقرار کارزینتل روی هاست اشتراکی + Supabase

> این راهنما برای محیطی است که Docker ندارد. دیتابیس رسمی فروشگاه Supabase/PostgreSQL است؛
> این اسکریپت هرگز دیتابیس را حذف یا خودکار بازسازی نمی‌کند.

## پیش‌نیاز

- Node.js 20 یا بالاتر و npm
- یک پروژه Supabase و دسترسی به SQL Editor یا Supabase CLI
- `DATABASE_URL` برای API (ترجیحاً pooled روی پورت 6543)
- `DIRECT_DATABASE_URL` برای migration/seed/backup (اتصال مستقیم روی پورت 5432)

## ۱) دریافت پروژه و تنظیم env

```bash
git clone https://github.com/vahidaskari1365/karzintell.git
cd karzintell
cp .env.example .env
nano .env
```

حداقل مقدارهای لازم:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[pooler-host]:6543/postgres?pgbouncer=true
DIRECT_DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
JWT_ACCESS_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>
CORS_ORIGINS=https://shop.example.com
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SITE_URL=https://shop.example.com
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PHONE=09xxxxxxxxx
SEED_ADMIN_PASSWORD=<رمز قوی و موقت>
```

## ۲) اجرای migration Supabase

در سیستم توسعه‌ای که Supabase CLI نصب دارد:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

یا فایل `supabase/migrations/20260825000000_initial_store.sql` را در SQL Editor اجرا کنید.
این migration شامل جداول کاتالوگ، سفارش، پرداخت، انبار، RBAC، اعلان، پشتیبانی، RLS و
توابع رزرو اتمیک است.

## ۳) نصب، seed و build

```bash
npm ci
npm run seed                 # فقط در همان محیطی که SEED_ADMIN_PASSWORD تنظیم شده
npm run build
```

seed idempotent است و رمز ادمین را در کد/SQL ذخیره نمی‌کند. اگر `SEED_ADMIN_PASSWORD` خالی
باشد، می‌توانید seed را دستی در محیط امن اجرا کنید تا رمز یک‌بارمصرف تولیدشده در خروجی را
بگیرید؛ برای production بهتر است رمز را صریحاً از secret manager بدهید.

## ۴) اجرای همیشگی

```bash
npm i -g pm2
pm2 start "npm run start -w apps/api" --name krz-api
pm2 start "npm run start -w apps/web" --name krz-web
pm2 save && pm2 startup
```

- API روی پورت `4000` و وب روی پورت `3000` اجرا می‌شود.
- reverse proxy هاست را روی HTTPS تنظیم کنید و `CORS_ORIGINS` را دقیقاً برابر origin سایت بگذارید.
- سلامت API: `GET /api/v1/health`.

## قابلیت‌هایی که به سرویس بیرونی نیاز دارند

| قابلیت | تنظیم |
|---|---|
| پرداخت | کلید درگاه و callback HTTPS |
| پیامک OTP/هشدار | `SMS_DRIVER` و کلید پنل پیامک |
| ایمیل | `SMTP_HOST`، کاربر و رمز SMTP |
| فایل محصول | Supabase Storage/S3 با `S3_ENDPOINT` و کلیدهای اختصاصی |
| جستجوی سریع | `MEILI_HOST` و `MEILI_API_KEY`؛ در نبود آن fallback دیتابیس فعال است |
| اعلان مرورگر | `VAPID_PUBLIC_KEY` و `VAPID_PRIVATE_KEY` |

## بکاپ

اتصال مستقیم را فقط در secret manager/محیط job قرار دهید:

```bash
DIRECT_DATABASE_URL='postgresql://...' BACKUP_DIR=/var/backups/karzintell bash scripts/backup.sh
```

`pg_dump` به‌صورت فشرده ذخیره می‌شود و فایل‌های قدیمی طبق `BACKUP_KEEP_DAYS` حذف می‌شوند.
برای بازیابی، ابتدا روی یک پروژه آزمایشی Supabase restore و smoke test انجام دهید.

</div>
