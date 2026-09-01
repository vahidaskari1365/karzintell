<div dir="rtl">

# گزارش بررسی و اصلاح کامل پروژه Karzintell — Production / cPanel

**تاریخ:** 2026-09-01  
**برنچ:** arena/01a05c4a-karzintell  
**هدف:** Production-ready روی cPanel Shared Hosting + MySQL/MariaDB + Node.js 20

---

## ✅ Fixed — مشکلاتی که اصلاح شدند

### 1. FileRecord: مقدار پیش‌فرض `disk` اشتباه بود
- **مشکل:** Entity و هر دو فایل SQL مقدار پیش‌فرض ستون `disk` را `'s3'` داشتند، در حالی که `STORAGE_DRIVER` پیش‌فرض `'local'` است. این ناسازگاری باعث می‌شد فایل‌های آپلودشده روی cPanel با disk=s3 ثبت شوند اما از مسیر local سرو شوند.
- **اصلاح:** در سه فایل مقدار `'s3'` به `'local'` تغییر داده شد:
  - `apps/api/src/database/entities/system.entity.ts`
  - `apps/api/src/database/migrations/1750000000000-InitialStoreMySql.ts`
  - `database/20260825000000_initial_store_mysql.sql`

### 2. وابستگی اشتباه `next` در `apps/api/package.json`
- **مشکل:** پکیج `next` (فریم‌ورک Next.js) به عنوان dependency در API NestJS بود — این پکیج کاملاً غیرضروری و سنگین است و نباید در API باشد.
- **اصلاح:** حذف شد از `apps/api/package.json`

### 3. فقدان `.gitattributes` برای LF line endings
- **مشکل:** پروژه روی Windows توسعه داده می‌شود ولی روی Linux/cPanel اجرا می‌شود. بدون `.gitattributes` خطای `LF will be replaced by CRLF` رخ می‌دهد.
- **اصلاح:** فایل `.gitattributes` با تنظیم `eol=lf` برای همه فایل‌های متنی ساخته شد.

### 4. فقدان ورودی‌های rar/zip در `.gitignore`
- **مشکل:** فایل‌های آرشیو (مثل `12.rar`، `next-build.zip.zip`) به `.gitignore` اضافه نبودند.
- **اصلاح:** `*.zip`, `*.rar`, `*.tar.gz`, `*.7z`, `*.tar` اضافه شدند.

### 5. محدود نبودن Worker/Thread در Next.js Build
- **مشکل:** روی Shared Hosting با منابع محدود، خطای `pthread_create: Resource temporarily unavailable` رخ می‌دهد.
- **اصلاح:**
  - `apps/web/next.config.ts`: اضافه شد webpack config برای محدود کردن parallelism و terser workers
  - `apps/web/package.json`: `NODE_OPTIONS='--max-old-space-size=1536'` به script `build` اضافه شد.
  - `apps/api/package.json`: `node --max-old-space-size=1024` به script `build` اضافه شد.

### 6. مقدار پیش‌فرض `DB_POOL_SIZE` برای Shared Hosting
- **مشکل:** پیش‌فرض ۱۰ connection برای Shared Hosting زیاد است و می‌تواند باعث خطای `Too many connections` در MySQL cPanel شود.
- **اصلاح:** پیش‌فرض به ۵ تغییر یافت (در `configuration.ts` و `env.example`)

### 7. اضافه شدن `start:prod` script
- **اصلاح:** `npm run start:prod` با `NODE_ENV=production` در `apps/api/package.json` اضافه شد.

---

## ✅ Verified — مواردی که بررسی شدند و مشکلی نداشتند

| بخش | وضعیت |
|---|---|
| Database type = mysql, driver = mysql2 | ✅ صحیح |
| synchronize = false در Production | ✅ صحیح |
| تمام Entity‌ها: datetime (نه timestamptz), json (نه jsonb), BIGINT transformer | ✅ صحیح |
| Migration کامل و MySQL-compatible | ✅ صحیح |
| Seed: idempotent، بدون hardcoded password، bcrypt hash | ✅ صحیح |
| ENV خواندن از process.env (بدون hardcode) | ✅ صحیح |
| assertSecureConfiguration در Production | ✅ صحیح |
| JWT access/refresh با ENV | ✅ صحیح |
| CORS فقط دامنه واقعی در Production | ✅ صحیح |
| API URL در Frontend از ENV (`NEXT_PUBLIC_API_URL`) | ✅ صحیح |
| `/api/v1` و `/uploads` از طریق rewrites فوروارد می‌شوند | ✅ صحیح |
| server.js برای cPanel (0.0.0.0، PORT از ENV) | ✅ صحیح |
| JwtAuthGuard + PermissionsGuard | ✅ صحیح |
| RBAC اجرایی در Backend | ✅ صحیح |
| File Upload: MIME validation، size limit، path traversal protection | ✅ صحیح |
| Redis: graceful fallback به memory در صورت نبود Redis | ✅ صحیح |
| Queue: بدون Redis هم اجرا می‌شود | ✅ صحیح |
| HttpExceptionFilter: بدون stack trace در پاسخ کلاینت | ✅ صحیح |
| AuditInterceptor: لاگ عملیات admin | ✅ صحیح |
| Helmet + ValidationPipe | ✅ صحیح |
| ThrottlerGuard (rate limiting) | ✅ صحیح |
| SQL Injection: TypeORM ORM + parameterized queries | ✅ صحیح |
| Frontend: هیچ localhost hardcode در Production | ✅ صحیح |
| Docker: موجود است ولی اجباری نیست برای cPanel | ✅ صحیح |
| .gitignore: شامل .env، node_modules، dist، .next | ✅ صحیح (اکنون rar/zip هم اضافه شد) |
| DEPLOY-CPANEL.md دقیق و کامل | ✅ صحیح (نکات منابع اضافه شد) |

---

## 📝 Changed Files — فایل‌های تغییر داده‌شده

| فایل | تغییر |
|---|---|
| `apps/api/src/database/entities/system.entity.ts` | disk default: `'s3'` → `'local'` |
| `apps/api/src/database/migrations/1750000000000-InitialStoreMySql.ts` | disk DEFAULT `'s3'` → `'local'` |
| `database/20260825000000_initial_store_mysql.sql` | disk DEFAULT `'s3'` → `'local'` |
| `apps/api/package.json` | حذف وابستگی `next`؛ اضافه `start:prod`؛ `build` با `--max-old-space-size=1024` |
| `apps/api/src/config/configuration.ts` | DB_POOL_SIZE پیش‌فرض: 10 → 5 |
| `apps/web/package.json` | `build` با `NODE_OPTIONS=--max-old-space-size=1536` |
| `apps/web/next.config.ts` | webpack config برای محدود کردن parallelism/thread |
| `.gitignore` | اضافه `*.zip`, `*.rar`, `*.tar.gz`, `*.7z`, `*.tar` |
| `.gitattributes` | ایجاد با `eol=lf` |
| `.env.example` | `DB_POOL_SIZE=5` (کمتر برای Shared Hosting) |
| `DEPLOY-CPANEL.md` | نکات Build memory limit اضافه شد |
| `PRODUCTION-AUDIT-REPORT.md` | این فایل (گزارش کامل) |

---

## 🗄️ Database Changes — تغییرات MySQL/TypeORM/Migration

### مشکلات رفع‌شده:
1. **FileRecord disk column default:** `'s3'` → `'local'` (هماهنگ با STORAGE_DRIVER=local پیش‌فرض)

### وضعیت کلی:
- تمام Entity‌ها از `datetime` (نه `timestamptz`) استفاده می‌کنند ✅
- تمام JSON fields از `json` (نه `jsonb`) استفاده می‌کنند ✅
- `bigint` columns از transformer مناسب دارند ✅
- `tinyint(1)` برای boolean fields استفاده می‌شود ✅
- Migration کامل و MySQL/MariaDB compatible است ✅
- `synchronize: false` در Production ✅

---

## 🔐 Environment Variables — متغیرهای محیطی ضروری

### Backend (`apps/api/.env`):

| متغیر | ضروری | توضیح |
|---|---|---|
| `NODE_ENV` | ✅ | `production` |
| `DB_HOST` | ✅ | معمولاً `localhost` در cPanel |
| `DB_PORT` | ✅ | `3306` |
| `DB_USER` | ✅ | کاربر MySQL cPanel |
| `DB_PASSWORD` | ✅ | رمز MySQL |
| `DB_NAME` | ✅ | نام دیتابیس cPanel |
| `JWT_ACCESS_SECRET` | ✅ | ≥۳۲ کاراکتر (`openssl rand -base64 48`) |
| `JWT_REFRESH_SECRET` | ✅ | ≥۳۲ کاراکتر |
| `API_PUBLIC_URL` | توصیه | `https://karzintell.com` |
| `CORS_ORIGINS` | توصیه | `https://karzintell.com,https://www.karzintell.com` |
| `SWAGGER` | توصیه | `false` در Production |
| `DB_POOL_SIZE` | ❌ | پیش‌فرض: `5` (مناسب Shared Hosting) |
| `STORAGE_DRIVER` | ❌ | `local` (پیش‌فرض، مناسب cPanel) |
| `REDIS_HOST` | ❌ | خالی = غیرفعال، حافظه داخلی |
| `MEILI_HOST` | ❌ | خالی = جستجو با MySQL |
| `SMTP_*` | ❌ | ایمیل |
| `SMS_*` | ❌ | پیامک |
| `ZARINPAL_*/IDPAY_*` | ❌ | درگاه پرداخت |
| `VAPID_*` | ❌ | Web Push |
| `SEED_ADMIN_*` | برای seed | اطلاعات ادمین اولیه |

### Frontend (`apps/web/.env`):

| متغیر | ضروری | توضیح |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | `/api/v1` (relative — همیشه) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://karzintell.com` |
| `BACKEND_URL` | ✅ | `http://127.0.0.1:4000` یا ساب‌دامن Backend |

---

## 🚀 Deployment — دستورالعمل Deploy روی cPanel

### گام ۱: MySQL Database
cPanel → MySQL Databases → ساخت DB، User، دادن ALL PRIVILEGES

### گام ۲: کلون ریپو
```bash
cd /home/USERNAME
git clone https://github.com/vahidaskari1365/karzintell.git
cd karzintell
```

### گام ۳: Backend Environment
```bash
cd apps/api
cp ../../.env.example .env
nano .env   # پر کردن DB_*, JWT_*, API_PUBLIC_URL, CORS_ORIGINS
```

### گام ۴: Build و Migration
```bash
cd /home/USERNAME/karzintell/apps/api
npm install
npm run build
npm run db:migrate
npm run seed
```

### گام ۵: Frontend Environment
```bash
cd /home/USERNAME/karzintell/apps/web
nano .env
# NEXT_PUBLIC_API_URL=/api/v1
# NEXT_PUBLIC_SITE_URL=https://karzintell.com
# BACKEND_URL=http://127.0.0.1:4000
```

### گام ۶: Frontend Build
```bash
npm install
npm run build
```

### گام ۷: cPanel Node.js Apps
- **Backend:** Application root=`apps/api`, Startup file=`dist/main.js`
- **Frontend:** Application root=`apps/web`, Startup file=`server.js`

### گام ۸: تست
```bash
curl https://karzintell.com/api/v1/health
```

---

## ⚠️ Remaining Issues — مسائل باقی‌مانده

### مواردی که نیاز به تنظیم cPanel دارند:
1. **DNS:** `karzintell.com` و `api.karzintell.com` باید به IP هاست اشاره کنند
2. **SSL:** AutoSSL/FreeSSL برای هر دو دامنه
3. **MySQL:** ساخت database و user در cPanel
4. **Node.js Version:** انتخاب Node.js 20 از CloudLinux Selector

### مواردی که قابل تست در sandbox نبودند:
- اتصال به MySQL واقعی (نیاز به سرور MySQL دارد)
- اجرای Migration (نیاز به MySQL دارد)
- اجرای Seed (نیاز به MySQL دارد)
- Web Push notifications (نیاز به VAPID keys)
- درگاه‌های پرداخت (نیاز به API key واقعی)
- SMS (نیاز به کلید Kavenegar/...)
- ایمیل (نیاز به SMTP server)
- Redis (اختیاری)
- Meilisearch (اختیاری)

---

## ✅ Verification — نتیجه تست‌ها

| تست | نتیجه |
|---|---|
| `npm run build` (API) | ✅ موفق — بدون TypeScript error |
| `npm run build` (Web) | ✅ موفق — تمام ۴۲ صفحه build شدند |
| `npm run typecheck` (API) | ✅ بدون خطا |
| `npm run typecheck` (Web) | ✅ بدون خطا |
| `npm test` (API) | ✅ 20/20 تست pass |
| اتصال به MySQL واقعی | ❌ قابل تست نبود (نیاز به MySQL server) |
| Migration روی MySQL | ❌ قابل تست نبود (نیاز به MySQL server) |
| Seed | ❌ قابل تست نبود (نیاز به MySQL server) |

</div>
