<div dir="rtl">

# استقرار کارزینتل روی هاست اشتراکی + MySQL

> این راهنما برای محیطی است که Docker ندارد و از MySQL/MariaDB روی cPanel (یا هاست
> اشتراکی دیگر) استفاده می‌کند. دیتابیس فروشگاه MySQL/MariaDB است، Schema توسط
> TypeORM Migration ساخته می‌شود و این اسکریپت هرگز Database یا User را نمی‌سازد.

## پیش‌نیاز

- Node.js 20 یا بالاتر و npm
- دسترسی cPanel: **MySQL Databases** و **Setup Node.js App**
- Database و User ساخته‌شده در cPanel
- متغیرهای `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

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
DB_HOST=localhost
DB_PORT=3306
DB_USER=user_dbuser
DB_PASSWORD=<رمز قوی>
DB_NAME=user_dbname
JWT_ACCESS_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>
CORS_ORIGINS=https://shop.example.com
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SITE_URL=https://shop.example.com
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PHONE=09xxxxxxxxx
SEED_ADMIN_PASSWORD=<رمز قوی و موقت>
```

## ۲) اجرای migration (TypeORM)

```bash
npm install
npm run build
npm run db:migrate
```

Migration همه جداول، Primary Keyها، Foreign Keyها، Uniqueها، Indexها و Constraintها را
روی MySQL/MariaDB می‌سازد. جدول `migrations` باعث می‌شود اجرای مجدد امن و idempotent باشد.

## ۳) Seed

```bash
SEED_ADMIN_PASSWORD='رمز قوی' npm run seed
```

seed فقط داده‌های اولیه را وارد می‌کند و جدول نمی‌سازد.

## ۴) اجرای همیشگی

```bash
cd apps/api
npm run start
# یا با PM2
pm2 start "npm run start -w apps/api" --name krz-api
pm2 start "npm run start -w apps/web" --name krz-web
pm2 save && pm2 startup
```

برای راهنمای کامل cPanel به [DEPLOY-MYSQL.md](DEPLOY-MYSQL.md) مراجعه کنید.

## قابلیت‌هایی که به سرویس بیرونی نیاز دارند

| قابلیت | تنظیم |
|---|---|
| پرداخت | کلید درگاه و callback HTTPS |
| پیامک OTP/هشدار | `SMS_DRIVER` و کلید پنل پیامک |
| ایمیل | `SMTP_HOST`، کاربر و رمز SMTP |
| فایل محصول | S3 با `S3_ENDPOINT` و کلیدهای اختصاصی |
| جستجوی سریع | `MEILI_HOST` و `MEILI_API_KEY`؛ در نبود آن fallback دیتابیس فعال است |
| اعلان مرورگر | `VAPID_PUBLIC_KEY` و `VAPID_PRIVATE_KEY` |

## بکاپ

```bash
DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... \
  BACKUP_DIR=/var/backups/karzintell bash scripts/backup.sh
```

بکاپ با `mysqldump` تولید می‌شود و فایل‌های قدیمی طبق `BACKUP_KEEP_DAYS` حذف می‌شوند.

</div>
