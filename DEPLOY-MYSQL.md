# راهنمای Deploy کارزینتل روی cPanel با MySQL / MariaDB

> این راهنما برای استقرار Production روی cPanel با دیتابیس **MySQL 8 / MariaDB 10.5+** است.
> Schema تمام جداول توسط **TypeORM Migration** و با دستور `npm run db:migrate` ایجاد و به‌روزرسانی می‌شود.
> **نیازی به Import دستی فایل SQL در phpMyAdmin نیست.**

---

## پیش‌نیازها

- Node.js 20 یا بالاتر
- npm
- cPanel با دسترسی **MySQL Databases** و **Setup Node.js App**
- MySQL 8 یا MariaDB 10.5+ (روی خود cPanel یا سرور MySQL مدیریت‌شده)

---

## مراحل راه‌اندازی در cPanel

### ۱) MySQL Database بسازید

1. وارد cPanel شوید.
2. به بخش **MySQL Databases** بروید.
3. یک Database بسازید، مثلاً:
   ```
   karzinte_db
   ```

> نکته: در cPanel معمولاً پیشوند کاربر به نام دیتابیس اضافه می‌شود (مثلاً `user_karzinte_db`).
> مقدار دقیق را در `DB_NAME` قرار دهید.

### ۲) MySQL User بسازید

1. در همین بخش **MySQL Databases** یک **MySQL User** بسازید.
2. نام کاربر و رمز عبور قوی را ذخیره کنید (مثلاً `karzinte_user`).

### ۳) User را به Database اضافه کنید

1. در بخش **Add User To Database** کاربر ساخته‌شده را انتخاب کنید.
2. دیتابیس موردنظر را انتخاب کنید.
3. دسترسی **ALL PRIVILEGES** را اعطا کنید.

> پروژه هرگز Database یا User نمی‌سازد و permission ساخت Database ندارد؛
> این کار فقط توسط cPanel انجام می‌شود.

### ۴) Repository را Clone کنید

در cPanel یا در محیطی که Node.js App روی آن اجرا می‌شود:

```bash
git clone https://github.com/vahidaskari1365/karzintell.git
cd karzintell
```

### ۵) Environment Variables را تنظیم کنید

```bash
cp .env.example .env
nano .env
```

حداقل مقادیر لازم:

```dotenv
NODE_ENV=production

# Database - MySQL/MariaDB (cPanel)
DB_HOST=localhost
DB_PORT=3306
DB_USER=karzinte_user
DB_PASSWORD=your-database-password
DB_NAME=karzinte_db

# JWT - حتماً با مقدار تصادفی قوی تنظیم کنید
JWT_ACCESS_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>

# CORS
CORS_ORIGINS=https://yourdomain.com

# Admin اولیه
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PHONE=09xxxxxxxxx
SEED_ADMIN_PASSWORD=your-secure-password
```

در **Setup Node.js App** نیز همین متغیرها را در Environment Variables اضافه کنید.

### ۶) نصب Dependencies

```bash
npm install
```

### ۷) Build

```bash
npm run build
```

### ۸) اجرای Migration

```bash
npm run db:migrate
```

این دستور تمام Migration‌های اجرانشده‌ی TypeORM را اجرا می‌کند و همه جداول،
Primary Keyها، Foreign Keyها، Uniqueها، Indexها و Constraintهای فعلی کارزینتل را روی
MySQL/MariaDB می‌سازد. TypeORM از جدول `migrations` استفاده می‌کند تا دستور هر بار ابتدا
فقط migration‌های جدید را اجرا کند؛ بنابراین اجرای مجدد آن امن و idempotent است.

> اگر `npm run db:migrate` را دوباره اجرا کنید، پیام "database schema is already up to date"
> دریافت می‌کنید و چیزی دوباره ساخته نمی‌شود.

### ۹) اجرای Seed

```bash
npm run seed
```

seed فقط داده‌های اولیه (نقش‌ها، مجوزها، ادمین، انبار و داده‌های نمونه اختیاری) را وارد می‌کند
و **هرگز Table نمی‌سازد**.

### ۱۰) Node.js Application را Start کنید

در cPanel:

1. به **Setup Node.js App** بروید.
2. روی **Create Application** کلیک کنید.
3. تنظیمات پیشنهادی:
   - **Node.js version**: 20 یا بالاتر
   - **Application mode**: Production
   - **Application root**: `/home/username/karzintell/apps/api`
   - **Application startup file**: `dist/main.js`
   - **Application URL**: `yourdomain.com` یا subdomain
4. روی **Create** کلیک کنید.
5. Environment Variables را اضافه کنید (همان مقادیر `.env`).
6. Restart را بزنید.

برای اجرای دستی:

```bash
npm start
```

---

## ترتیب صحیح Production

```bash
npm install
npm run build
npm run db:migrate
npm run seed
npm start
```

---

## دستورات Migration

| دستور | توضیح |
|---|---|
| `npm run db:migrate` | اجرای همه Migration‌های اجرانشده (Production) |
| `npm run migration:run` | معادل `db:migrate` برای اجرای Migration‌ها |
| `npm run migration:revert` | برگرداندن آخرین Migration اجراشده |
| `npm run migration:generate` | تولید Migration از Entityها (نیاز به build) |
| `npm run migration:show` | مشاهده Migration‌های در انتظار |

در Production مقدار `synchronize` همیشه `false` است؛ هیچ تغییری در Schema خارج از Migration اعمال نمی‌شود.

---

## ساختار پروژه

```
karzintell/
├── apps/
│   └── api/
│       └── src/
│           ├── database/
│           │   ├── entities/                  # Entityهای TypeORM
│           │   ├── migrations/                # Migrationهای TypeORM
│           │   ├── data-source.ts             # DataSource برای CLI/Migration
│           │   ├── run-migrations.ts          # Runner برنامه‌ای `db:migrate`
│           │   └── seed.ts                    # Seed داده‌های اولیه
│           └── main.ts
├── database/
│   └── 20260825000000_initial_store_mysql.sql # Schema مرجع MySQL
├── package.json
└── .env.example
```

---

## دیتابیس و Schema

- Engine: `InnoDB`
- Charset: `utf8mb4`
- Collation: `utf8mb4_unicode_ci`
- وابستگی DB: `mysql2`
- Migrationها روی **MySQL 8** و **MariaDB 10.5+** تست/سازگار هستند.

---

## عیب‌یابی

### `Error: ER_BAD_DB_ERROR: Unknown database`
- دیتابیس در cPanel ساخته نشده است یا `DB_NAME` اشتباه است.
- cPanel ممکن است پیشوند کاربر را به نام اضافه کرده باشد.

### `Error: ER_ACCESS_DENIED_ERROR`
- `DB_USER` / `DB_PASSWORD` را بررسی کنید.
- در cPanel کاربر را به همان دیتابیس با **ALL PRIVILEGES** اضافه کنید.

### `Error: connect ECONNREFUSED`
- `DB_HOST` را بررسی کنید (روی cPanel معمولاً `localhost`).
- در Setup Node.js App از همان `DB_HOST` استفاده کنید.

### `Error: ER_NO_SUCH_TABLE`
- Migration اجرا نشده است:
  ```bash
  npm run db:migrate
  ```

### Migration‌ها اجرا نمی‌شوند اما جدول‌ها ساخته نشده‌اند
- `DB_NAME` باید به Database ساخته‌شده در cPanel اشاره کند.
- از `npm run migration:show` برای مشاهده Migration‌های در انتظار استفاده کنید.

---

## منابع

- [مستندات MySQL](https://dev.mysql.com/doc/)
- [مستندات TypeORM](https://typeorm.io/)
- [مستندات NestJS](https://docs.nestjs.com/)
- [آموزش cPanel Node.js](https://docs.cpanel.net/ea4/nodejs/)
