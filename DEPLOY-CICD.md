<div dir="rtl">

# راهنمای CI/CD — Webhook-based (بدون GitHub Actions)

این راهنما توضیح می‌دهد چگونه با هر `push` به شاخه `main`، پروژه به‌صورت خودکار build و به هاست اشتراکی منتقل شود.

## چرا GitHub Actions استفاده نمی‌شود؟

هاست ایران (hostiran) IP های زیر را بلاک می‌کند:

1. **GitHub Actions runner IP addresses** — GitHub Actions نمی‌تواند به سرور SSH بزند
2. **Azure Blob Storage** — GitHub Actions نمی‌تواند لاگ‌ها را آپلود کند (خطای `productionresultssa7.blob.core.windows.net:443`)

به‌جای GitHub Actions، از یک **webhook-based CI/CD** استفاده می‌کنیم که روی سیستم خودتان اجرا می‌شود.

## معماری

```
GitHub (push to main)
    ↓
GitHub Webhook → smee.io (proxy رایگان)
    ↓
ci-listener.js (روی ویندوز شما — همیشه در حال اجرا)
    ↓
local-deploy.js:
    ├── git pull
    ├── npm ci + npm run build (API)
    ├── npm ci + npm run build (Web)
    ├── tar + scp upload to server
    └── SSH: bash deploy-on-server.sh
         ├── Extract tarballs
         ├── npm install --omit=dev
         ├── npm run db:migrate
         └── touch tmp/restart.txt
```

## پیش‌نیازها

| مورد | وضعیت |
|---|---|
| GitHub repository | ✅ `vahidaskari1365/karzintell` |
| سرور cPanel | ✅ `karzinte@linux25.centraldnserver.com` (پورت 22) |
| Node.js 20+ روی ویندوز | ✅ (شما دارید) |
| Git for Windows | ✅ (شما دارید) |
| SSH Key | ✅ `karzintell_github_actions` |
| دسترسی به smee.io | ✅ (رایگان) |

## مراحل راه‌اندازی

### مرحله ۱: ساخت smee.io Channel

1. به **https://smee.io** بروید
2. روی **"Start a new channel"** کلیک کنید
3. یک URL منحصربه‌فرد دریافت می‌کنید، مثلاً:
   ```
   https://smee.io/abc123xyz
   ```
4. این URL را یادداشت کنید (در مرحله ۳ استفاده می‌شود)

### مرحله ۲: ساخت Webhook Secret

یک secret قوی بسازید (حداقل ۳۲ کاراکتر). در PowerShell:

```powershell
# ساخت یک رشته تصادفی ۶۴ کاراکتری
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 64 | % {[char]$_})
```

یا در Git Bash:

```bash
openssl rand -hex 32
```

خروجی را یادداشت کنید.

### مرحله ۳: تنظیم GitHub Webhook

1. به GitHub repository بروید:
   👉 **https://github.com/vahidaskari1365/karzintell/settings/hooks**

2. روی **"Add webhook"** کلیک کنید

3. تنظیمات:
   - **Payload URL:** `https://smee.io/YOUR-CHANNEL` (URL ای که در مرحله ۱ گرفتید)
   - **Content type:** `application/json`
   - **Secret:** secret ای که در مرحله ۲ ساختید
   - **Which events would you like to trigger this webhook?** → **"Just the push event"**
   - **Active:** ✅

4. روی **"Add webhook"** کلیک کنید

### مرحله ۴: ساخت فایل `.env.local`

در ریشه پروژه (کنار `package.json`)، یک فایل `.env.local` بسازید:

```bash
cp .env.local.example .env.local
```

و مقادیر را پر کنید:

```dotenv
# smee.io channel
SMEE_URL=https://smee.io/your-channel-from-step-1

# Webhook secret (همان که در GitHub تنظیم کردید)
WEBHOOK_SECRET=your-secret-from-step-2

# GitHub repo
REPO_OWNER=vahidaskari1365
REPO_NAME=karzintell
BRANCH=main

# SSH connection
SSH_HOST=linux25.centraldnserver.com
SSH_PORT=22
SSH_USER=karzinte

# SSH private key path (مسیر کلید خصوصی)
SSH_PRIVATE_KEY_PATH=C:\Users\YOUR_USERNAME\.ssh\karzintell_github_actions
```

> ⚠️ این فایل هرگز در git commit نمی‌شود (در `.gitignore` است).

### مرحله ۵: تست اتصال SSH

مطمئن شوید SSH Key به‌درستی کار می‌کند:

```powershell
ssh -i C:\Users\YOUR_USERNAME\.ssh\karzintell_github_actions `
    -p 22 karzinte@linux25.centraldnserver.com "echo OK"
```

باید `OK` چاپ شود (بدون درخواست پسورد).

### مرحله ۶: اجرای CI Listener

#### روش ۱: فایل batch (ساده‌ترین)

فایل زیر را دابل‌کلیک کنید:

```
scripts/start-listener.bat
```

#### روش ۲: از PowerShell

```powershell
cd F:\karzintell\karzintell-main
node scripts/ci-listener.js
```

خروجی مورد انتظار:

```
╔════════════════════════════════════════════════════════════╗
║  Karzintell CI Listener                                  ║
╠════════════════════════════════════════════════════════════╣
║  SMEE URL:      https://smee.io/your-channel              ║
║  Repo:          vahidaskari1365/karzintell                ║
║  Branch:        main                                      ║
║  Webhook Secret: ✅ Set                                   ║
╚════════════════════════════════════════════════════════════╝

[2026-09-14 12:00:00] 🔌 اتصال به smee.io...
[2026-09-14 12:00:01] ✅ متصل شدیم! منتظر webhook...
[2026-09-14 12:00:01] ⏳ برای خروج Ctrl+C بزن
```

این پنجره را **باز نگه دارید** تا webhook ها را دریافت کند.

### مرحله ۷: تست اولین Deploy

برای تست، یک commit خالی به `main` بزنید:

```powershell
cd F:\karzintell\karzintell-main
git pull origin main
git commit --allow-empty -m "test: trigger webhook-based deploy"
git push origin main
```

در پنجره CI Listener باید ببینید:

```
[2026-09-14 12:01:00] 📨 Webhook دریافت شد: event=push
[2026-09-14 12:01:00] ✅ signature معتبر
[2026-09-14 12:01:00] 🎯 push به main — commit: abc1234
[2026-09-14 12:01:00] 🚀 شروع deploy برای commit abc1234

━━━ ۱) Git Pull ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...

━━━ ۲) Build API (NestJS) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Installing dependencies...
🔨 Building...
✅ API build complete

━━━ ۳) Build Web (Next.js) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Installing dependencies...
🔨 Building...
✅ Web build complete

━━━ ۴) Package Tarballs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Creating api-deploy.tar.gz...
📦 Creating web-deploy.tar.gz...

━━━ ۵) Upload to Server ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 SSH: mkdir -p /home/karzinte/deploy-staging
📤 Upload: api-deploy.tar.gz → /home/karzinte/deploy-staging/
📤 Upload: web-deploy.tar.gz → /home/karzinte/deploy-staging/
📤 Upload: deploy-on-server.sh → /home/karzinte/deploy-staging/
✅ فایل‌ها آپلود شدند

━━━ ۶) Deploy on Server ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...

╔════════════════════════════════════════════════════════════╗
║  ✅ Deploy موفقیت‌آمیز بود!                                ║
╚════════════════════════════════════════════════════════════╝
```

## ساختار فایل‌های CI/CD

```
karzintell/
├── .env.local.example          ← نمونه فایل تنظیمات (commit می‌شود)
├── .env.local                  ← فایل تنظیمات واقعی (commit نمی‌شود)
├── .github/workflows/          ← (خالی — GitHub Actions غیرفعال)
├── scripts/
│   ├── ci-listener.js          ← Listener برای webhook (smee.io)
│   ├── local-deploy.js         ← Build + deploy script
│   ├── start-listener.bat      ← Windows launcher (دابل‌کلیک)
│   └── deploy-on-server.sh     ← اسکریپت اجرا روی سرور
└── DEPLOY-CICD.md              ← همین فایل
```

## عملکرد روزانه

### شروع روز کاری

1. PowerShell باز کن
2. اجرا کن:
   ```powershell
   cd F:\karzintell\karzintell-main
   node scripts/ci-listener.js
   ```
3. پنجره را باز نگه دار

### وقتی کدی به GitHub push می‌کنی

1. در پنجره CI Listener، خروجی deploy را تماشا کن
2. در پایان، سایت https://karzintell.com را باز کن

### پایان روز کاری

1. در پنجره CI Listener، `Ctrl+C` بزن
2. پنجره را ببند

## عیب‌یابی

### Webhook دریافت نمی‌شود

1. به GitHub repository → **Settings → Webhooks** برو
2. روی webhook کلیک کن → تب **"Recent Deliveries"**
3. آخرین delivery را چک کن — آیا ✓ سبز دارد؟
4. اگه نه، Payload URL و Secret را چک کن

### smee.io قطع شده

CI Listener به‌صورت خودکار دوباره وصل می‌شود. اگه بیش از ۳۰ ثانیه قطع بود:

1. به https://smee.io/YOUR-CHANNEL برو — آیا پیام‌ها نشان داده می‌شوند؟
2. اگر smee.io کار نمی‌کرد، چند دقیقه صبر کن و دوباره listener را restart کن

### Deploy شکست خورد

1. خطا را در خروجی CI Listener بخوان
2. اگه `SSH failed` بود:
   ```powershell
   ssh -i C:\Users\YOU\.ssh\karzintell_github_actions -p 22 karzinte@linux25.centraldnserver.com
   ```
3. اگه `Build failed` بود:
   ```powershell
   cd F:\karzintell\karzintell-main
   cd apps/api && npm run build
   cd ../web && npm run build
   ```

### سایت بالا نیامد بعد از deploy

احتمالاً restart خودکار انجام نشده. به cPanel → **Node.js Apps** برو و روی **Restart** برای هر دو اپ کلیک کن.

## مزایا نسبت به GitHub Actions

| ویژگی | GitHub Actions | Webhook-based |
|---|---|---|
| نیاز به IP خارجی | ❌ بلاک شده | ✅ از ایران |
| نیاز به Azure Blob | ❌ بلاک شده | ✅ نیازی نیست |
| نیاز به سیستم روشن | ❌ | ✅ |
| سرعت build | 🐢 محدود | 🚀 سیستم شخصی |
| هزینه | رایگان (با محدودیت) | رایگان (نامحدود) |
| لاگ‌های GitHub | ✅ | ❌ (فقط محلی) |

</div>
