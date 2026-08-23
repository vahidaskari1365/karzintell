<div dir="rtl">

# راه‌اندازی کارزینتل روی هاست (گام‌به‌گام — بدون نیاز به دانش فنی)

> این راهنما برای کسی نوشته شده که می‌خواهد کل سایت (دیتابیس + بک‌اند + فرانت‌اند) را روی یک هاست/سرور اجرا کند. همه‌چیز خودکار بالا می‌آید؛ فقط چند مقدار را پر کنید.

## پیش‌نیاز هاست
- سرور لینوکسی (Ubuntu 22/24) با **حداقل ۲ گیگ رم**
- **Docker** نصب‌شده (روی اکثر هاست‌ها `curl -fsSL https://get.docker.com | sh` نصبش می‌کند)
- یک دامنه (مثل `karzintell.ir`) که به آی‌پی سرور وصل شده — اختیاری برای شروع

---

## گام ۱ — انتقال کد به هاست

کدهای ریپو را به سرور منتقل کنید (مثلاً با git clone یا آپلود ZIP از GitHub):

```bash
git clone https://github.com/vahidaskari1365/karzintell.git
cd karzintell
```

## گام ۲ — ساخت فایل تنظیمات

```bash
cp .env.example .env
nano .env
```

فقط این مقادیر را عوض کنید (بقیه را دست نزنید):

| متغیر | مقدار |
|---|---|
| `DB_PASSWORD` و `DB_ROOT_PASSWORD` | یک رمز قوی (مثلاً `Kz!2026#StrongPass`) |
| `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` | دو رشته تصادفی بلند (مثلاً `openssl rand -base64 48`) |
| `NEXT_PUBLIC_API_URL` | آدرس عمومی API (مثلاً `https://api.karzintell.ir/api/v1`) |
| `NEXT_PUBLIC_SITE_URL` و `NEXT_PUBLIC_APP_URL` | آدرس سایت (مثلاً `https://karzintell.ir`) |
| `NEXT_PUBLIC_STORAGE_URL` | آدرس فایل‌ها (در ابتدا می‌تواند همان پیش‌فرض باشد) |
| `CORS_ORIGINS` | آدرس سایت شما (مثلاً `https://karzintell.ir`) |

> `SMS_API_KEY`، `ZARINPAL_MERCHANT_ID` و `SMTP_*` را اگر هنوز ندارید خالی بگذارید — سایت بالا می‌آید و بعداً با پر کردن همین فایل و ری‌استارت، فعال می‌شوند.

## گام ۳ — بالا آوردن خودکار (فقط یک دستور)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

این دستور **خودش همه‌چیز را انجام می‌دهد**:
1. دیتابیس MySQL را می‌سازد
2. جدول‌ها را خودکار می‌سازد (schema.sql)
3. داده‌های اولیه را می‌ریزد (ادمین‌ها، نقش‌ها، تنظیمات — seed)
4. بک‌اند (API) را بالا می‌آورد
5. فرانت‌اند (سایت) را ساخته و بالا می‌آورد
6. Redis، جستجو و فضای فایل را هم بالا می‌آورد

**اولین بار چند دقیقه طول می‌کشد** (بیلد تصاویر). دفعات بعدی خیلی سریع‌تر است.

## گام ۴ — بررسی

```bash
docker compose -f docker-compose.prod.yml ps          # همه باید running باشند
curl http://localhost:4000/api/v1/health               # وضعیت دیتابیس و سرویس‌ها
```

سایت: `http://IP-سرور:3000` — پنل ادمین: `http://IP-سرور:3000/admin`

ورود ادمین: `admin@karzintell.ir` / `Admin@123456` (در اولین ورود اجباری به تغییر است)
ورود مدیر ارشد دوم: `vahid.askari1986@gmail.com` / `Vahid@0142`

## گام ۵ — دامنه و HTTPS (بعد از اطمینان از کارکرد)

وقتی دامنه به آی‌پی سرور وصل شد، Nginx را نصب و SSL بگیرید (راهنمای کامل در `docs/06-production.md`). سپس در `.env`:
- `NEXT_PUBLIC_API_URL` را به آدرس واقعی API تغییر دهید
- دوباره `docker compose -f docker-compose.prod.yml up -d --build` بزنید

## دستورهای کاربردی

```bash
# دیدن لاگ‌ها
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web

# ری‌استارت همه
docker compose -f docker-compose.prod.yml restart

# بکاپ دستی دیتابیس
bash scripts/backup.sh
```

## رفع خطای رایج

| خطا | راه‌حل |
|---|---|
| `ERROR: MySQL did not become ready` | صبر کنید و دوباره `up -d` بزنید؛ یا پورت 3306 را چک کنید |
| سایت باز می‌شود ولی «خطا در اتصال به سرور» | `NEXT_PUBLIC_API_URL` در `.env` درست است؟ بعد از تغییر، بیلد مجدد بزنید |
| خطای ثبت‌نام/کپچا | بک‌اند بالا آمده؟ `curl http://localhost:4000/api/v1/health` را تست کنید |

</div>
