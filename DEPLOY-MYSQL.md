# راهنمای Deploy کارزینتل روی cPanel با MySQL

## تغییرات از PostgreSQL به MySQL

پروژه کارزینتل از PostgreSQL/Supabase به MySQL/MariaDB منتقل شده است.

### تغییرات اصلی:
- **Database Driver**: از `pg` به `mysql2` تغییر کرد
- **TypeORM Type**: از `postgres` به `mysql` تغییر کرد
- **SQL Syntax**: تمام syntaxهای PostgreSQL به MySQL تبدیل شدند
- **Column Types**: `TIMESTAMPTZ` → `DATETIME`, `JSONB` → `JSON`

---

## پیش‌نیازها

### سرور:
- PHP 8.x (برای phpMyAdmin)
- Node.js 18+ (برای اجرای API)
- MySQL 8 یا MariaDB 10.5+

### دیتابیس:
- دسترسی به MySQL Database در cPanel
- ایجاد دیتابیس و کاربر دیتابیس

---

## مراحل Deploy

### 1. ایجاد دیتابیس در cPanel

1. وارد cPanel شوید
2. به بخش **Databases** بروید
3. روی **MySQL Database Wizard** کلیک کنید
4. یک دیتابیس جدید ایجاد کنید (مثلاً `karzinte_db`)
5. یک کاربر دیتابیس ایجاد کنید و دسترسی بدهید

### 2. آپلود کدها

#### روش اول: Git Version Control در cPanel

1. در cPanel به **Git Version Control** بروید
2. روی **Create** کلیک کنید
3. Repository URL را وارد کنید:
   ```
   https://github.com/YOUR_USERNAME/karzintell.git
   ```
4. مسیر را تنظیم کنید:
   ```
   /home/username/karzintell
   ```
5. Branch را `main` انتخاب کنید

#### روش دوم: FTP/SFTP

فایل‌ها را در مسیر مناسب آپلود کنید.

### 3. تنظیم Environment Variables

یک فایل `.env` در ریشه پروژه ایجاد کنید:

```bash
NODE_ENV=production

# API URLs
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
API_PORT=4000
API_PUBLIC_URL=https://yourdomain.com
WEB_URL=https://yourdomain.com

# Database - MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_CHARSET=utf8mb4

# JWT - حتماً تغییر دهید!
JWT_ACCESS_SECRET=generate-with-openssl-rand-base64-48
JWT_REFRESH_SECRET=generate-with-openssl-rand-base64-48
JWT_ACCESS_TTL_SEC=900
JWT_REFRESH_TTL_SEC=2592000
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGINS=https://yourdomain.com

# Admin - حتماً تغییر دهید!
SEED_ADMIN_PHONE=09xxxxxxxxx
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

### 4. اجرای Migration

ابتدا دیتابیس را در phpMyAdmin ایجاد کنید:

1. وارد phpMyAdmin شوید
2. دیتابیس خود را انتخاب کنید
3. روی تب **Import** کلیک کنید
4. فایل `database/20260825000000_initial_store_mysql.sql` را آپلود کنید
5. روی **Go** کلیک کنید

### 5. نصب Dependencies و Build

```bash
cd ~/karzintell/apps/api
npm install
npm run build
```

### 6. اجرای Seed (اختیاری)

```bash
cd ~/karzintell/apps/api
npm run seed
```

### 7. تنظیم Node.js Application در cPanel

1. در cPanel به **Setup Node.js App** بروید
2. روی **Create Application** کلیک کنید
3. تنظیمات:
   - **Node.js version**: 18 یا بالاتر
   - **Application mode**: Production
   - **Application root**: `/home/username/karzintell/apps/api`
   - **Application startup file**: `dist/main.js`
   - **Application URL**: `yourdomain.com` یا subdomain
   - **Log file**: `/home/username/karzintell/apps/api/logs/app.log`

4. روی **Create** کلیک کنید

### 8. Environment Variables در Node.js App

در صفحه Node.js App، روی **Edit** کلیک کنید و Environment Variables را اضافه کنید:

```
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_ACCESS_SECRET=your-32-char-secret
JWT_REFRESH_SECRET=your-32-char-secret
CORS_ORIGINS=https://yourdomain.com
```

---

## ساختار پروژه

```
karzintell/
├── apps/
│   ├── api/              # NestJS Backend
│   │   ├── dist/        # فایل‌های Build
│   │   ├── src/
│   │   │   ├── database/
│   │   │   │   ├── entities/    # Entityهای TypeORM
│   │   │   │   └── seed.ts       # Seed برای MySQL
│   │   │   └── config/
│   │   │       └── configuration.ts
│   │   └── package.json
│   └── web/              # Next.js Frontend
├── database/
│   └── 20260825000000_initial_store_mysql.sql  # Schema برای MySQL
├── packages/
│   └── shared/
└── .env.example
```

---

## دستورات مهم

### Development (محلی با MySQL محلی)

```bash
# اگر MySQL محلی دارید:
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=karzintell

npm install
npm run build
npm run seed
npm start
```

### Production (cPanel)

```bash
# نصب dependencies
npm install

# Build
npm run build

# Seed (یکبار)
npm run seed

# اجرا
npm start
```

---

## متغیرهای محیطی

### متغیرهای الزامی

| متغیر | توضیحات |
|-------|---------|
| `DB_HOST` | آدرس دیتابیس (معمولاً `localhost`) |
| `DB_PORT` | پورت دیتابیس (پیش‌فرض: `3306`) |
| `DB_USER` | نام کاربری دیتابیس |
| `DB_PASSWORD` | رمز عبور دیتابیس |
| `DB_NAME` | نام دیتابیس |
| `JWT_ACCESS_SECRET` | کلید Secret برای Access Token (حداقل 32 کاراکتر) |
| `JWT_REFRESH_SECRET` | کلید Secret برای Refresh Token (حداقل 32 کاراکتر) |
| `SEED_ADMIN_PASSWORD` | رمز عبور اولیه ادمین |

### متغیرهای اختیاری

| متغیر | توضیحات | پیش‌فرض |
|-------|---------|---------|
| `CORS_ORIGINS` | دامنه‌های مجاز CORS | `http://localhost:3000` |
| `REDIS_HOST` | آدرس Redis | - |
| `S3_*` | تنظیمات S3 Storage | - |
| `MEILI_*` | تنظیمات MeiliSearch | - |

---

## عیب‌یابی

### خطای Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

- مطمئن شوید MySQL در حال اجراست
- مطمئن شوید `DB_HOST` درست است (`localhost` یا `127.0.0.1`)

### خطای Access Denied

```
Error: ER_ACCESS_DENIED_ERROR: Access denied for user 'xxx'@'localhost'
```

- نام کاربری و رمز عبور دیتابیس را بررسی کنید
- مطمئن شوید کاربر به دیتابیس دسترسی دارد

### خطای Unknown Database

```
Error: ER_BAD_DB_ERROR: Unknown database 'xxx'
```

- نام دیتابیس را بررسی کنید
- مطمئن شوید دیتابیس در phpMyAdmin ایجاد شده است

### خطای Table doesn't exist

```
Error: ER_NO_SUCH_TABLE: Table 'xxx' doesn't exist
```

- مطمئن شوید migration را اجرا کرده‌اید
- فایل SQL را در phpMyAdmin Import کنید

---

## پشتیبانی از Emoji و کاراکترهای فارسی

تمام جداول با `utf8mb4` ایجاد شده‌اند که از emoji و کاراکترهای فارسی پشتیبانی می‌کند.

Collation استفاده شده: `utf8mb4_unicode_ci`

---

## منابع بیشتر

- [مستندات MySQL](https://dev.mysql.com/doc/)
- [مستندات TypeORM](https://typeorm.io/)
- [مستندات NestJS](https://docs.nestjs.com/)
- [آموزش cPanel Node.js](https://docs.cpanel.net/ea4/nodejs/)
