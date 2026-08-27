<div dir="rtl">

# Deploy کامل کارزینتل روی هاست ایران — cPanel / CloudLinux Node.js + MySQL

این راهنما برای همین ساختار ریپو نوشته شده و **مرجع اصلی استقرار Production** است.

## معماری نهایی روی یک هاست

```
Browser
   ↓
https://karzintell.com            ← Frontend (Next.js) — Node.js App اول cPanel
   ↓  /api/v1/*  و  /uploads/*    ← فوروارد داخلی (rewrites در next.config.ts)
Backend NestJS                    ← Node.js App دوم cPanel (ساب‌دامن api.karzintell.com)
   ↓  mysql2
MySQL / MariaDB                    ← روی همان هاست (cPanel → MySQL Databases)
```

- **هیچ وابستگی به Vercel، Supabase، PostgreSQL، Docker، Redis، Meilisearch یا S3 ندارد.**
- فایل‌های محصول روی دیسک خود هاست (`apps/api/uploads`) ذخیره و از `/uploads` سرو می‌شوند.
- Redis و Meilisearch کاملاً اختیاری‌اند؛ بدون آن‌ها سایت با fallback داخلی کار می‌کند.

---

## ۰) پیش‌نیازها

| مورد | مقدار |
|---|---|
| DNS | `karzintell.com` (A record) و `api.karzintell.com` (A record) روی IP هاست |
| SSL | AutoSSL/FreeSSL cPanel برای هر دو دامنه (پیش‌فرض فعال می‌شود) |
| Node.js | 20 یا بالاتر (از CloudLinux Node.js Selector نصب می‌شود) |
| MySQL/MariaDB | روی هاست (در همه هاست‌های cPanel هست) |
| دسترسی | cPanel + Terminal (SSH) برای اجرای یک‌باری migration/seed |

---

## ۱) ساخت دیتابیس MySQL در cPanel

1. cPanel → **Databases → MySQL® Databases**
2. یک Database بسازید — مثلاً: `USERNAME_karzintell`
3. یک MySQL User بسازید — مثلاً: `USERNAME_karzuser` با رمز قوی
4. User را **ALL PRIVILEGES** به همان Database بدهید
5. مقادیر دقیق را یادداشت کنید (در خط‌های بعد استفاده می‌شود):
   - `DB_NAME` = `USERNAME_karzintell`
   - `DB_USER` = `USERNAME_karzuser`
   - `DB_PASSWORD` = رمز ساخت‌شده
   - `DB_HOST` = `localhost` ، `DB_PORT` = `3306`

> ⚠️ دیتابیس را **خالی** رها کنید. Schema را `npm run db:migrate` می‌سازد؛ هیچ Import
> دستی در phpMyAdmin لازم **نیست**.

---

## ۲) کپی ریپو به هاست

از **Terminal** cPanel (یا SSH):

```bash
cd /home/USERNAME
git clone https://github.com/vahidaskari1365/karzintell.git
cd karzintell
git checkout main
```

> اگر Git Version Control cPanel را ترجیح می‌دهید: cPanel → **Git Version Control** →
> Add Repository → URL و User را وارد کنید و Clone. پوشه نهایی باید
> `/home/USERNAME/karzintell` باشد.

---

## ۳) فایل‌های Environment

دو فایل env لازم است (هر کدام فقط برای همان اپ خوانده می‌شود):

### ۳.۱) تنظیمات Backend — `apps/api/.env`

```bash
cd /home/USERNAME/karzintell/apps/api
cp ../.env.example .env
nano .env
```

مقادیر **حتمی** (بقیه را می‌توانید همان پیش‌فرض نمونه بگذارید):

```dotenv
NODE_ENV=production

# --- MySQL (مقادیر مرحله ۱) ---
DB_HOST=localhost
DB_PORT=3306
DB_USER=USERNAME_karzuser
DB_PASSWORD=رمز-دیتابیس
DB_NAME=USERNAME_karzintell

# --- JWT — حتماً با openssl rand -base64 48 تولید کنید ---
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# --- دامنه ---
API_PUBLIC_URL=https://karzintell.com
WEB_URL=https://karzintell.com
CORS_ORIGINS=https://karzintell.com,https://www.karzintell.com
SWAGGER=false

# --- ذخیره‌سازی: پیش‌فرض local (روی دیسک همین هاست) — چیزی تغییر ندهید ---
STORAGE_DRIVER=local
STORAGE_DIR=uploads
# STORAGE_PUBLIC_URL خالی بماند → https://karzintell.com/uploads ساخته می‌شود

# --- Seed ---
SEED_ADMIN_PHONE=09xxxxxxxxx
SEED_ADMIN_EMAIL=admin@karzintell.com
SEED_ADMIN_PASSWORD=یک-رمز-قوی

# --- اختیاری‌ها (خالی بمانند = غیرفعال) ---
# REDIS_HOST=          (خالی = غیرفعال، حافظه داخلی استفاده می‌شود)
# MEILI_HOST=          (خالی = جستجو با MySQL)
# SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS=
# ZARINPAL_MERCHANT_ID= / IDPAY_API_KEY= / ... (درگاه پرداخت)
```

### ۳.۲) تنظیمات Frontend — `apps/web/.env`

```bash
cd /home/USERNAME/karzintell/apps/web
nano .env
```

```dotenv
NODE_ENV=production

# مرورگر همیشه از همین Origin استفاده می‌کند (relative):
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SITE_URL=https://karzintell.com
NEXT_PUBLIC_APP_URL=https://karzintell.com

# آدرس Backend برای فوروارد /api/v1 و /uploads (روی همان هاست):
# گزینه ۱ (توصیه‌شده) — ساب‌دامن Backend:
BACKEND_URL=http://api.karzintell.com
# گزینه ۲ — پورت داخلی Backend (اگر پورت دیگری از cPanel گرفت):
# BACKEND_URL=http://127.0.0.1:پورت-backend
```

> `NEXT_PUBLIC_*` هنگام `next build` داخل باندل می‌شوند؛ بنابراین این فایل **قبل از
> build فرانت‌اند** باید کامل باشد.

---

## ۴) ایجاد Node.js Application — Backend (API)

cPanel → **Software → Setup Node.js App** (یا CloudLinux Node.js Selector) → **Create Application**:

| فیلد | مقدار |
|---|---|
| Node.js version | 20.x یا بالاتر (مثلاً 20.11) |
| Application mode | Production |
| **Application root** | `/home/USERNAME/karzintell/apps/api` |
| **Application URL** | `api.karzintell.com` |
| **Application startup file** | `dist/main.js` |
| Build command | `npm run build` |
| Pre-build command | (خالی) |
| Run `npm install` during deployment | ✅ روشن |

بعد از Create، cPanel خودش `npm install` و `npm run build` را در `apps/api` اجرا می‌کند.
(اگر Build command خالی بگذارید، خودتان با Terminal مراحل ۵/۶ را بزنید — نتیجه یکی است.)

> **چرا ساب‌دامن جدا؟** هر Node.js App در cPanel یک URL می‌خواهد و دامنه اصلی
> `karzintell.com` متعلق به Frontend است. مرورگر هرگز مستقیم با `api.karzintell.com`
> صحبت نمی‌کند؛ Frontend تمام `/api/v1` و `/uploads` را به Backend همین هاست
> فوروارد می‌کند.

---

## ۵) اجرای Migration و Seed (Terminal)

از **Terminal** cPanel:

```bash
# به مسیر Backend بروید
cd /home/USERNAME/karzintell/apps/api

# اگر در Terminal، node نسخه cPanel نیست، نسخه cPanel را فعال کنید (معمولاً همین است):
node -v          # باید 20+ باشد

# ۱) نصب کامل وابستگی‌ها (مستقل — هیچ وابستگی به root project نیست)
npm install

# ۲) بیلد TypeScript
npm run build

# ۳) ساخت کامل Schema روی MySQL خالی
#    (تمام جداول، Primary/Foreign Keyها، Uniqueها و Indexها — idempotent است)
npm run db:migrate

# ۴) داده‌های اولیه (نقش‌ها، مجوزها، ادمین، انبار، دسته‌ها) — جدول نمی‌سازد
npm run seed

# ۵) چک نهایی — باید "ready" بزند
npm start        # Ctrl+C کنید؛ cPanel خودش سرویس را اجرا می‌کند
```

خروجی موفق:

```
[migration] connected to USERNAME_karzintell (mysql)
[migration] applied: InitialStoreMySql1750000000000
🌱 Seeding MySQL/MariaDB...
🌱 Seed completed
🚀 Karzintell API ready: http://0.0.0.0:<port>/api/v1
```

> اجرای مجدد `npm run db:migrate` امن است (جدول `migrations` اجرای‌شده‌ها را
> یاد می‌گیرد و فقط Migrationهای جدید اجرا می‌شوند).

---

## ۶) ایجاد Node.js Application — Frontend (وب)

بازگشت به **Setup Node.js App** → **Create Application**:

| فیلد | مقدار |
|---|---|
| Node.js version | 20.x یا بالاتر (همان Backend) |
| Application mode | Production |
| **Application root** | `/home/USERNAME/karzintell/apps/web` |
| **Application URL** | `karzintell.com` |
| **Application startup file** | `server.js` |
| Build command | `npm run build` |
| Run `npm install` during deployment | ✅ روشن |

> فرانت‌اند `server.js` (سرور رسمی Next.js) است که روی پورتی که cPanel با متغیر
> `PORT` تعیین می‌کند listen می‌کند و `/api/v1` و `/uploads` را به `BACKEND_URL`
> فوروارد می‌کند.

### آپشن: ساب‌دامن www

اگر `www.karzintell.com` را هم می‌خواهید، یا Redirect آن به دامنه اصلی را در
cPanel (Domains → Redirects) بگذارید یا یک Node.js App دیگر **نباست** بسازید —
به‌جای آن Redirect بسازید (یک App کافی است).

---

## ۷) Start / Restart و تست نهایی

1. در لیست Node.js Apps هر دو اپ باید **Running** باشند؛ در غیر این صورت
   **Restart** بزنید.
2. تست‌ها:

```bash
# سلامت Backend (مستقیم)
curl https://api.karzintell.com/api/v1/health

# سلامت از مسیر واقعی کاربر (Frontend → Backend)
curl https://karzintell.com/api/v1/health
curl -I https://karzintell.com
```

3. مرورگر: `https://karzintell.com` → ویترین فروشگاه باید بار شود؛
   `https://karzintell.com/admin` → ورود با ایمیل/موبایل و رمزی که در seed ساختید
   (`must_change_password` فعال است؛ پس از اولین ورود رمز عوض کنید).

---

## ۸) آپدیت‌های بعدی (Deployment مجدد)

```bash
cd /home/USERNAME/karzintell
git pull origin main

# Backend
cd apps/api
npm install && npm run build && npm run db:migrate   # migrate جدید فقط Migrationهای تازه را اجرا می‌کند

# Frontend
cd ../web
npm install && npm run build
```

سپس در cPanel هر دو Node.js App را **Restart** کنید.

---

## ۹) جدول متغیرهای محیطی (Backend)

| متغیر | ضروری | پیش‌فرض | توضیح |
|---|---|---|---|
| `NODE_ENV` | ✅ | development | در cPanel: `production` |
| `DB_HOST` | ✅* | localhost | هاست MySQL |
| `DB_PORT` | ✅* | 3306 | |
| `DB_USER` | ✅ | — | کاربر MySQL cPanel |
| `DB_PASSWORD` | ✅ | — | رمز MySQL |
| `DB_NAME` | ✅ | — | نام دیتابیس cPanel |
| `JWT_ACCESS_SECRET` | ✅ | — | ≥۳۲ کاراکتر تصادفی (`openssl rand -base64 48`) |
| `JWT_REFRESH_SECRET` | ✅ | — | ≥۳۲ کاراکتر تصادفی |
| `API_PUBLIC_URL` | توصیه‌شده | http://localhost:4000 | URL عمومی سایت؛ برای لینک پرداخت/presign |
| `CORS_ORIGINS` | توصیه‌شده | (Production: خودِ دامنه سایت) | فقط دامنه واقعی |
| `SEED_ADMIN_*` | برای seed | — | اطلاعات ادمین اولیه |
| `STORAGE_DRIVER` | ❌ | `local` | `local` یا `s3` |
| `STORAGE_DIR` | ❌ | `uploads` | پوشه فایل‌ها روی دیسک |
| `STORAGE_PUBLIC_URL` | ❌ | `API_PUBLIC_URL + /uploads` | |
| `BACKEND_URL` (فرانت) | ✅ (فرانت) | http://127.0.0.1:4000 | آدرس Backend برای فوروارد |
| `REDIS_*` | ❌ | خالی=غیرفعال | بدون Redis سایت کار می‌کند |
| `MEILI_*` | ❌ | خالی=غیرفعال | بدون Meili جستجو با MySQL |
| `SMTP_*` | ❌ | خالی | ایمیل OTP/اعلان |
| `SMS_*` | ❌ | `log` | پیامک (log = فقط در لاگ) |
| `ZARINPAL_*/IDPAY_*/NEXTPAY_*/MELLAT_*/SAMAN_*` | ❌ | — | درگاه پرداخت |
| `VAPID_*` | ❌ | — | Web Push |
| `SENTRY_DSN` | ❌ | خالی=غیرفعال | رصد خطا خارجی |

\* در Production برنامه در صورت نبود `DB_PASSWORD` یا اسرار JWT ضعیف **سازش نمی‌کند** (Fail-Closed).

---

## ۱۰) Troubleshooting

| مشکل | علت / راه‌حل |
|---|---|
| `ECONNREFUSED 127.0.0.1:3306` در لاگ API | `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME` نادرست است؛ مقادیر دقیق cPanel را چک کنید (معمولاً `DB_HOST=localhost`) |
| `Access denied for user` | کاربر MySQL به دیتابیس access کامل ندارد (مرحله ۱) |
| سایت می‌افتد / `502` | در cPanel → Node.js Apps لاگ را ببینید؛ معمولاً `.env` ناقص است (JWT ضعیف → Fail-Closed) |
| `/api/v1` از مرورگر ۵۰/۵۰ می‌دهد | `BACKEND_URL` در `apps/web/.env` نادرست است یا Backend App Stop است |
| تصویر محصول نمایش داده نمی‌شود | Backend باید `/uploads` را سرو کند؛ `STORAGE_DRIVER=local` و فایل در `apps/api/uploads` باشد |
| `npm run build` در cPanel خطای حافظه | Build command را این‌گونه بگذارید: `NODE_OPTIONS=--max-old-space-size=1536 npm run build` |
| فونت فارسی لود نمی‌شود | فونت‌ها در `apps/web/public/fonts` هستند؛ بعد از `git pull` حتماً فرانت را rebuild کنید |
| کد پیامک ارسال نمی‌شود | `SMS_DRIVER=log` است (فقط در لاگ می‌آید)؛ برای کوه‌نگار/کاسپن کلید را تنظیم کنید |

---

## ۱۱) ساختار نهایی ریپو (نمای مرتبط با Deploy)

```
karzintell/
├── apps/
│   ├── api/                  ← Node.js App اول cPanel
│   │   ├── package.json      ← همه وابستگی‌ها + typescript (build مستقل)
│   │   ├── .env              ← envهای Backend (commit نمی‌شود)
│   │   ├── dist/main.js      ← Startup File
│   │   ├── uploads/          ← فایل‌های محصول (local storage)
│   │   └── src/
│   │       ├── shared/       ← کپی vendored از packages/shared (مستقل)
│   │       └── database/     ← TypeORM migrations + seed
│   └── web/                  ← Node.js App دوم cPanel
│       ├── package.json
│       ├── .env              ← envهای Frontend (NEXT_PUBLIC_* + BACKEND_URL)
│       ├── server.js         ← Startup File (Next.js + فوروارد /api/v1 و /uploads)
│       ├── next.config.ts    ← rewrites + security headers
│       ├── public/fonts/     ← فونت Vazirmatn خودمیزبانی
│       └── app/              ← Next.js App Router
├── packages/shared/          ← منبع تایپ‌های مشترک (فقط توسعه)
├── .env.example              ← نمونه کامل envها
└── DEPLOY-CPANEL.md          ← همین راهنما
```

---

## ۱۲) نکات امنیتی Production

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` حتماً تصادفی و ≥۳۲ کاراکتر
- `SWAGGER=false` در Production (Swagger فقط development)
- `.env` هرگز commit نشود (در `.gitignore` است)
- بکاپ دوره‌ای: `mysqldump` از cPanel (Backup) + پوشه `apps/api/uploads`
- CORS فقط دامنه واقعی سایت (کدها به‌طور خودکار در Production فقط
  `karzintell.com` و `www.karzintell.com` را می‌پذیرند)

</div>
