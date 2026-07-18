<div dir="rtl">

# کارزینتل — Karzintell

فروشگاه آنلاین قطعات و گجت‌های الکترونیک (موبایل، ساعت هوشمند، هدفون، لوازم جانبی و …)
ساخته‌شده با معماری مدرن تمام‌TypeScript و زیرساخت آماده مقیاس.

## پشته فناوری

| بخش | فناوری |
|---|---|
| Frontend | Next.js ۱۵ · React ۱۹ · TypeScript · Tailwind CSS ۴ · (PWA) |
| Backend | NestJS ۱۱ · Node.js ۲۲ · TypeORM |
| Database | MySQL 8 |
| Cache / Queue | Redis 7 + BullMQ |
| Search | Meilisearch (آمادهٔ مهاجرت به Elasticsearch) |
| Storage | MinIO در توسعه — AWS S3 در production (کد بدون تغییر) |

## مستندات طراحی

| سند | محتوا |
|---|---|
| [docs/01-architecture.md](docs/01-architecture.md) | معماری کلی، ماژول‌ها، امنیت، احراز هویت RBAC، استقرار |
| [docs/02-database-design.md](docs/02-database-design.md) | ERD، شرح ۴۱ جدول، ایندکس‌ها، سیاست seed/backup |
| [docs/03-api-design.md](docs/03-api-design.md) | تمام endpointهای فروشگاه و پنل ادمین + قرارداد خطا/صفحه‌بندی |
| [docs/04-folder-structure.md](docs/04-folder-structure.md) | ساختار Monorepo و قراردادهای نام‌گذاری |
| [database/schema.sql](database/schema.sql) | DDL کامل + داده اولیه (قابل اجرای مستقیم) |

## راه‌اندازی زیرساخت توسعه

```bash
cp .env.example .env
docker compose up -d          # MySQL · Redis · Meilisearch · MinIO · Adminer · MailHog
docker exec -i karzintell-mysql mysql -uroot -proot_secret < database/schema.sql
```

| سرویس | آدرس |
|---|---|
| فروشگاه (وب) | http://localhost:3000 (مرحله ۲) |
| API + Swagger | http://localhost:4000/api/v1 · /api/docs (مرحله ۲) |
| Adminer (DB UI) | http://localhost:8080 |
| کنسول MinIO | http://localhost:9001 |
| داشبورد Meilisearch | http://localhost:7700 |
| صندوق ایمیل (MailHog) | http://localhost:8025 |

## ورود ادمین پیش‌فرض

| فیلد | مقدار |
|---|---|
| ایمیل | `admin@karzintell.ir` |
| موبایل | `09000000000` |
| رمز عبور | `Admin@123456` ⚠️ در اولین ورود اجباری به تغییر است |

ادمین می‌تواند از پنل، **کاربر جدید بسازد، نقش تعریف کند و مجوزهای دانه‌ای تخصیص دهد** (مدل RBAC کامل).

## وضعیت مراحل

- [x] **مرحله ۱ — معماری، دیتابیس، API، ساختار پوشه‌ها**
- [x] **مرحله ۲ — Monorepo (Next.js 15 + NestJS 11) + Auth (رمز/OTP) + RBAC کامل**
- [x] **مرحله ۳ — کاتالوگ چندسطحی، جستجو (Meilisearch + fallback)، فیلترها، آپلود S3**
- [x] **مرحله ۴ — سبد خرید (مهمان/کاربر)، کوپن، مالیات/ارسال، سفارش، پرداخت (زرین‌پال/کیف پول/دستی)، کیف پول**
- [x] **مرحله ۵ — پنل ادمین کامل (محصول/موجودی/سفارش/مشتری/کاربر/نقش/کوپن/CMS/تیکت/گزارش/تنظیمات/لاگ) + حساب کاربری**
- [ ] مرحله ۶ — سخت‌سازی (صف BullMQ، تست E2E)، رصد (Sentry)، CI/CD، استقرار production

### مستندات تکمیلی
| سند | موضوع |
|---|---|
| [docs/05-deploy-vercel.md](docs/05-deploy-vercel.md) | استقرار فرانت روی Vercel (مرحله‌به‌مرحله به زبان ساده) |

</div>
