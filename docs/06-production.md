<div dir="rtl">

# راهنمای استقرار Production (مرحله ۲۷)

این راهنما برای اجرای نسخه نهایی فروشگاه روی یک سرور واقعی (VPS) است — مرحله‌به‌مرحله و به زبان ساده.

## پیش‌نیاز

| ابزار | نسخه | چرا لازم است |
|---|---|---|
| سرور لینوکسی (Ubuntu 22/24) | — | ۲GB RAM کافی است |
| دامین | مثل `karzintell.ir` | به آی‌پی سرور وصل (A Record) کنید |
| Docker + Docker Compose | آخرین | اجرای Redis/API/Web با یک دستور؛ دیتابیس در Supabase |
| Node.js | 22 | فقط برای build فرانت (یا CI) |

## معماری اجرا

```
[ کاربر ] ──HTTPS──▶ [ Nginx:443 ] ──▶ Web (Next.js) :3000
                      │              ──▶ API (NestJS) :4000
                      └──▶ Supabase PostgreSQL · Redis 7 · Meilisearch · MinIO
```

## گام ۱ — آماده‌سازی سرور (۵ دقیقه)

```bash
# نصب داکر (یک بار)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER    # خروج/ورود مجدد

# کلون پروژه
git clone https://github.com/vahidaskari1365/karzintell.git
cd karzintell
```

## گام ۲ — ساخت فایل env

```bash
cp .env.example .env
nano .env        # مقادیر جدول زیر را پر کنید
```

### متغیرهای مهم production

| متغیر | مقدار نمونه | توضیح |
|---|---|---|
| `NODE_ENV` | `production` | حتماً |
| `DATABASE_URL` / `DIRECT_DATABASE_URL` | اتصال pooled/direct Supabase | پایگاه‌داده |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | دو رشته تصادفی مستقل ۶۴ کاراکتری | امنیت توکن |
| `API_PUBLIC_URL` | `https://api.karzintell.ir` | آدرس عمومی API |
| `WEB_URL` | `https://karzintell.ir` | برای لینک ایمیل‌ها |
| `NEXT_PUBLIC_API_URL` | `https://api.karzintell.ir/api/v1` | فرانت |
| `NEXT_PUBLIC_SITE_URL` | `https://karzintell.ir` | سئو/سایت‌مپ |
| `NEXT_PUBLIC_STORAGE_URL` | `https://cdn.karzintell.ir/karzintell` | تصاویر |
| `CORS_ORIGINS` | `https://karzintell.ir` | دقیق |
| `ZARINPAL_MERCHANT_ID` (و سایر درگاه‌ها) | از پنل درگاه | کلیدهای واقعی |
| `SMS_API_KEY` + `KAVENEGAR_OTP_TEMPLATE` | از پنل پیامک | SMS/OTP |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP واقعی | ایمیل |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` | Push |
| `SENTRY_DSN` | (اختیاری) | رصد خطا؛ خالی = غیرفعال |
| `SWAGGER` | `false` | در production |

## گام ۳ — اجرا

```bash
# زیرساخت + دیتابیس
supabase db push
docker compose -f docker-compose.prod.yml up -d --build

# داده اولیه (ادمین، نقش‌ها، صفحات، روش‌های ارسال، FAQ و وبلاگ نمونه)
docker compose exec api npm run seed     # یا: npm run seed با نود محلی

# بیلد و اجرای اپ‌ها
npm ci
npm run build
NODE_ENV=production npm run start -w apps/api &   # یا PM2
npm run start -w apps/web &
```

> برای مدیریت پروسه‌ها: `npm i -g pm2` و سپس:
> `pm2 start "npm run start -w apps/api" --name krz-api`
> `pm2 start "npm run start -w apps/web" --name krz-web`
> `pm2 save && pm2 startup`

## گام ۴ — SSL و دامین (Nginx + Certbot)

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
# دو server block: karzintell.ir → :3000  و  api.karzintell.ir → :4000
sudo certbot --nginx -d karzintell.ir -d www.karzintell.ir -d api.karzintell.ir
```

## گام ۵ — بکاپ خودکار روزانه

```bash
crontab -e
# هر روز ساعت ۳ بامداد:
0 3 * * * /home/user/karzintell/scripts/backup.sh >> /var/log/krz-backup.log 2>&1
```

- خروجی: فایل `.sql.gz` در پوشه `backups/` — ۱۴ روز اخیر نگه‌داری می‌شود.
- اگر `S3_BACKUP_BUCKET` و AWS CLI داشته باشید، روی S3 هم آپلود می‌شود.

## گام ۶ — نظارت

| ابزار | کجا |
|---|---|
| سلامت سرویس‌ها | `GET /api/v1/health` ← وضعیت DB/Redis/جستجو/فضای فایل |
| لاگ‌ها | `pm2 logs krz-api` / `pm2 logs krz-web` |
| رصد خطای واقعی | Sentry (با `SENTRY_DSN`) |
| صف‌ها | Redis کلید `krz:queue:jobs` (پیامک/ایمیل پس‌زمینه‌ای) |

## چک‌لیست راه‌اندازی ✅

- [ ] دامین + SSL فعال، `HTTPS` در همه env‌ها
- [ ] `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` تصادفی و طولانی، رمز ادمین پیش‌فرض تغییر کرده
- [ ] درگاه‌ها با کلید واقعی + تست خرید ۱۰۰۰ تومانی
- [ ] پیامک به شماره واقعی رسید
- [ ] بکاپ دستی ساخته شد: `bash scripts/backup.sh`
- [ ] کرون بکاپ ثبت شد
- [ ] `GET /health` → `status: ok`
- [ ] robots.txt / sitemap.xml باز می‌شود

</div>
