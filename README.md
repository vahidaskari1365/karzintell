<div dir="rtl">

# کارزینتل — Karzintell

فروشگاه آنلاین قطعات و گجت‌های الکترونیک (موبایل، ساعت هوشمند، هدفون، لوازم جانبی و …)
ساخته‌شده با معماری مدرن تمام‌TypeScript و زیرساخت آماده مقیاس.

## پشته فناوری

| بخش | فناوری |
|---|---|
| Frontend | Next.js ۱۵ · React ۱۹ · TypeScript · Tailwind CSS ۴ · (PWA) |
| Backend | NestJS ۱۱ · Node.js ۲۲ · TypeORM |
| Database | MySQL 8 / MariaDB 10.5+ (TypeORM Migration, cPanel-ready) |
| Cache / Queue | Redis 7 + BullMQ |
| Search | Meilisearch (آمادهٔ مهاجرت به Elasticsearch) |
| Storage | S3-compatible (MinIO/S3) |

## مستندات طراحی

| سند | محتوا |
|---|---|
| [docs/01-architecture.md](docs/01-architecture.md) | معماری کلی، ماژول‌ها، امنیت، احراز هویت RBAC، استقرار |
| [docs/02-database-design.md](docs/02-database-design.md) | ERD، شرح جداول، ایندکس‌ها، سیاست seed/backup |
| [docs/03-api-design.md](docs/03-api-design.md) | تمام endpointهای فروشگاه و پنل ادمین + قرارداد خطا/صفحه‌بندی |
| [docs/04-folder-structure.md](docs/04-folder-structure.md) | ساختار Monorepo و قراردادهای نام‌گذاری |
| [DEPLOY-MYSQL.md](DEPLOY-MYSQL.md) | راهنمای استقرار Production روی cPanel با MySQL |

## راه‌اندازی زیرساخت توسعه

```bash
cp .env.example .env
docker compose up -d          # Redis · Meilisearch · MinIO · MailHog
npm run db:migrate            # اجرای تمام Migration های TypeORM
npm run seed                  # با DB_* و SEED_ADMIN_PASSWORD
```

| سرویس | آدرس |
|---|---|
| فروشگاه (وب) | http://localhost:3000 (مرحله ۲) |
| API + Swagger | http://localhost:4000/api/v1 · /api/docs (مرحله ۲) |
| MySQL/MariaDB | روی cPanel یا سرور MySQL مدیریت‌شده |
| کنسول MinIO | http://localhost:9001 |
| داشبورد Meilisearch | http://localhost:7700 |
| صندوق ایمیل (MailHog) | http://localhost:8025 |

## ساخت ادمین اولیه

ادمین پیش‌فرض در ریپو یا مستندات وجود ندارد. پس از اجرای migration، مقدارهای
`SEED_ADMIN_EMAIL`، `SEED_ADMIN_PHONE` و `SEED_ADMIN_PASSWORD` را فقط از secret manager
تنظیم کنید و `npm run seed` را اجرا کنید؛ رمز در Git یا SQL ذخیره نمی‌شود.

ادمین می‌تواند از پنل، **کاربر جدید بسازد، نقش تعریف کند و مجوزهای دانه‌ای تخصیص دهد** (مدل RBAC کامل).

## وضعیت مراحل (ثبت سفارش از برنامه ۳۰ مرحله‌ای)

- [x] **۱.** معماری، طراحی دیتابیس (۵۷ جدول)، طراحی API، ساختار پوشه‌ها
- [x] **۲–۵.** Monorepo (Next.js 15 + NestJS 11)، احراز هویت (رمز/OTP)، RBAC، کاتالوگ، سبد، سفارش، پنل ادمین و حساب کاربری
- [x] **۶–۱۰.** دسته‌بندی چندسطحی، جستجو + autocomplete + غلط‌یاب، فیلترها، صفحه محصول (زوم/اشتراک/مرتبط/نظرات)
- [x] **۱۱–۱۹.** درگاه‌ها (زرین‌پال/آیدی‌پی/نکست‌پی/ملت/سامان)، حمل‌ونقل (پست/تیپاکس/پیک + ارسال رایگان)، کوپن روی محصول/دسته/کمپین، علاقه‌مندی، مقایسه، فاکتور و چاپ، پیامک/ایمیل/Push اعلان، سئو (Meta/OG/Schema/Sitemap/Robots/Canonical)
- [x] **۲۰.** امنیت: JWT + Refresh، Rate limiting، Helmet، ضد XSS/SQLi، کپچای ضدبات، **ورود دومرحله‌ای (TOTP)**، فیلدهای امن در seed
- [x] **۲۱.** گزارش‌ها: فروش روزانه/ماهانه، **سود ناخالص** (فروش − بهای تمام‌شده)، پرفروش‌ها، **مشتریان برتر**، کم‌موجودی
- [x] **۲۲.** داشبورد مدیریت: KPI + نمودار ۱۴ روز + سفارش/کاربر/موجودی/هشدار کم‌موجودی
- [x] **۲۳.** داشبورد مشتری: سفارش، فاکتور، علاقه‌مندی، آدرس، کیف پول، پروفایل، ۲FA
- [x] **۲۴.** انبار: موجودی هر واریانت، حداقل موجودی، گزارش کم‌موجودی، ورود/خروج با دلیل
- [x] **۲۵.** CMS: صفحات (درباره/تماس/قوانین/حریم خصوصی) + **وبلاگ + اخبار + FAQ** (عمومی و ادمین)
- [x] **۲۶.** تنظیمات فروشگاه: **نام/لوگو/رنگ/شبکه‌های اجتماعی متصل به هدر و فوتر**، درگاه‌ها، پیامک، ایمیل
- [x] **۲۷.** بهینه‌سازی: Lazy loading تصاویر، کش Redis چندلایه، **صف پس‌زمینه (Queue)**، لاگ ساختاری، **`/health` readiness**، **بکاپ خودکار**، Sentry اختیاری، **CI (GitHub Actions)**
- [x] **۲۸.** **API عمومی REST** کامل برای اپ موبایل آینده → [docs/07-mobile-api.md](docs/07-mobile-api.md)
- [x] **۳۰.** کیفیت نهایی: ریسپانسیو کامل، معماری ماژولار، پنل حرفه‌ای، RBAC، سئو، کش، امنیت، **۲۰ تست واحد سبز**، کد تمیز با کامنت فارسی

### مستندات تکمیلی
| سند | موضوع |
|---|---|
| [docs/05-deploy-vercel.md](docs/05-deploy-vercel.md) | استقرار فرانت روی Vercel (مرحله‌به‌مرحله به زبان ساده) |
| [docs/06-production.md](docs/06-production.md) | استقرار کامل روی سرور (VPS) + بکاپ + مانیتورینگ |
| [docs/07-mobile-api.md](docs/07-mobile-api.md) | قرارداد API برای ساخت اپ موبایل |

### تست و CI

```bash
npm test          # تست‌های واحد (منطق کوپن، وضعیت سفارش، sanitize، slugify)
npm run typecheck # بررسی TypeScript هر دو اپ
```
گردش‌کار CI (`.github/workflows/ci.yml`): نصب → بیلد shared → type-check → تست → بیلد فرانت.

</div>
