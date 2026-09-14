<div dir="rtl">

# راهنمای CI/CD — GitHub Actions → هاست ایران

این راهنما توضیح می‌دهد چگونه با هر `push` به شاخه `main`، پروژه به‌صورت خودکار build و به هاست اشتراکی منتقل شود.

## معماری

```
GitHub (push to main)
    ↓
GitHub Actions workflow (.github/workflows/deploy.yml)
    ├── Build API  (npm ci + npm run build → dist/)
    ├── Build Web  (npm ci + npm run build → .next/)
    ├── Package    (tar.gz)
    ├── SCP upload  → سرور
    └── SSH deploy  (scripts/deploy-on-server.sh)
         ├── Extract tarballs
         ├── npm install --omit=dev
         ├── npm run db:migrate (اگر .env موجود باشد)
         ├── touch tmp/restart.txt
         └── curl برای trigger restart
```

## پیش‌نیازها

| مورد | وضعیت |
|---|---|
| GitHub repository | ✅ `vahidaskari1365/karzintell` |
| سرور cPanel | ✅ `karzinte@linux25.centraldnserver.com` (پورت 22) |
| Node.js Apps در cPanel | ✅ API روی `api.karzintell.com`، Web روی `karzintell.com` |
| SSH از بیرون سرور | ✅ باز است (پورت 22) |
| دیتابیس MySQL | ✅ `karzinte_karzintell` |

## مراحل راه‌اندازی (یک‌بار)

### مرحله ۱: ساخت SSH Key

روی **سیستم خودتان** (Windows PowerShell یا Mac/Linux Terminal):

```bash
# Windows PowerShell:
ssh-keygen -t ed25519 -C "github-actions-karzintell" -f $env:USERPROFILE\.ssh\karzintell_github_actions

# Mac/Linux Terminal:
ssh-keygen -t ed25519 -C "github-actions-karzintell" -f ~/.ssh/karzintell_github_actions
```

هنگام درخواست passphrase، **Enter بزنید (خالی بگذارید)**.

دو فایل ساخته می‌شود:
- `karzintell_github_actions` — کلید خصوصی (برای GitHub)
- `karzintell_github_actions.pub` — کلید عمومی (برای سرور)

### مرحله ۲: افزودن کلید عمومی به سرور

**روش ۱ — از cPanel UI:**

1. cPanel → **Security → SSH Access**
2 روی **Manage SSH Keys** → **Import Key**
3. نام: `karzintell_github_actions`
4. محتوای فایل `.pub` را paste کنید
5. روی **Import** کلیک کنید

**روش ۲ — از Terminal cPanel:**

```bash
# محتوای کلید عمومی را نمایش دهید (روی سیستم خودتان):
cat ~/.ssh/karzintell_github_actions.pub    # Mac/Linux
Get-Content $env:USERPROFILE\.ssh\karzintell_github_actions.pub    # Windows

# سپس در ترمینال cPanel:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# کلید عمومی را اینجا paste کنید
chmod 600 ~/.ssh/authorized_keys
```

### مرحله ۳: تست اتصال SSH

از سیستم خودتان:

```bash
ssh -i ~/.ssh/karzintell_github_actions -p 22 karzinte@linux25.centraldnserver.com "echo OK"
# باید: OK چاپ شود (بدون درخواست پسورد)
```

اگر `OK` چاپ شد، کلید به‌درستی نصب شده. ✅

### مرحله ۴: افزودن Secrets به GitHub

در GitHub repository:

1. **Settings → Secrets and variables → Actions**
2. روی **New repository secret** کلیک کنید
3. این ۴ Secret را اضافه کنید:

| Name | Value |
|---|---|
| `SSH_HOST` | `linux25.centraldnserver.com` |
| `SSH_PORT` | `22` |
| `SSH_USER` | `karzinte` |
| `SSH_PRIVATE_KEY` | محتوای کامل فایل خصوصی (شامل `-----BEGIN...` و `-----END...`) |

برای `SSH_PRIVATE_KEY`، محتوای کامل فایل را کپی کنید:

```bash
# Mac/Linux:
cat ~/.ssh/karzintell_github_actions

# Windows PowerShell:
Get-Content $env:USERPROFILE\.ssh\karzintell_github_actions
```

خروجی چیزی شبیه این است:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAE...
...
...چندین خط...
...
-----END OPENSSH PRIVATE KEY-----
```

**تمام این محتوا (از BEGIN تا END) را در GitHub Secret کپی کنید.**

### مرحله ۵: ساخت فایل .env برای Migration

در ترمینال cPanel:

```bash
cat > /home/karzinte/karzinte/karzintell-api/.env << 'EOF'
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=karzinte_karzintell
DB_PASSWORD=Karzintell@0142!@#
DB_NAME=karzinte_karzintell

# JWT (همان مقادیر cPanel UI)
JWT_ACCESS_SECRET=4cO7qBeFHDIHiUwoMLznA1oYUwMxZsM2vsnjTmUQL8P5dM4LZ762FxQq747ogUAC
JWT_REFRESH_SECRET=33oeqgIpICoNF1DSi73wUKo8aA8C4PCDSKFYxowcwKBqbKgRJ68R43Jp65ppa2fm/Xw19T+U46pCU

# Other
API_PUBLIC_URL=https://karzintell.com
WEB_URL=https://karzintell.com
SWAGGER=false
STORAGE_DRIVER=local
STORAGE_DIR=uploads
EOF

chmod 600 /home/karzinte/karzinte/karzintell-api/.env
```

> **نکته:** این فایل هرگز در Git commit نمی‌شود (در `.gitignore` است).
> cPanel UI env vars برای اپ در حال اجرا کافی است، اما `.env` برای اجرای
> migration از طریق SSH ضروری است.

### مرحله ۶: Commit و Push

```bash
cd karzintell
git add .
git commit -m "ci: add GitHub Actions deploy workflow"
git push origin main
```

پس از push:

1. به GitHub repository بروید
2. روی تب **Actions** کلیک کنید
3. باید workflow با نام **"Deploy to Karzintell Server"** در حال اجرا باشد
4. منتظر بمانید تا تمام stepها سبز شوند (حدود ۵-۱۰ دقیقه)

## نحوه کار

### چه فایل‌هایی آپلود می‌شوند؟

**API (tar.gz):**
- `dist/` — خروجی build تایپ‌اسکریپت
- `package.json` + `package-lock.json`
- `.npmrc`

**Web (tar.gz):**
- `.next/` — خروجی build Next.js
- `public/` — فایل‌های استاتیک (تصاویر، فونت‌ها)
- `server.js` — سرور کاستوم Next.js
- `package.json` + `package-lock.json`
- `next.config.ts` + `postcss.config.mjs`
- `.npmrc`

### چه فایل‌هایی دست نخورده می‌مانند؟

- `uploads/` — فایل‌های آپلود شده توسط کاربران
- `node_modules/` — با `npm install` به‌روز می‌شود (نه overwrite)
- `.env` — فایل محیطی سرور
- `tmp/` — پوشه موقت (شامل restart.txt)

### Migration چگونه کار می‌کند؟

- بعد از extract فایل‌های API، اسکریپت `node dist/database/run-migrations.js` اجرا می‌شود
- این دستور **idempotent** است — فقط migration های جدید را اجرا می‌کند
- اگر migration شکست بخورد، فایل `dist/` قبلی برگردانده می‌شود (rollback)
- برای این کار به فایل `.env` نیاز است (مرحله ۵)

### Restart چگونه کار می‌کند؟

1. `touch tmp/restart.txt` — علامت‌گذاری برای restart
2. `curl https://api.karzintell.com/api/v1/health` — ارسال درخواست برای trigger
3. lsnode (LiteSpeed Node.js) فایل restart.txt را تشخیص داده و اپ را restart می‌کند

اگر restart خودکار کار نکرد:
- به cPanel → **Node.js Apps** بروید
- روی **Restart** برای هر دو اپ کلیک کنید

## عیب‌یابی

### Workflow شکست خورد: "SSH connection OK" چاپ نشد

→ کلید خصوصی در GitHub Secret احتمالاً ناقص است. مطمئن شوید کل محتوا
(از `-----BEGIN` تا `-----END` با تمام خطوط) کپی شده.

### Migration شکست خورد

→ فایل `.env` در مسیر API وجود ندارد یا مقادیر DB نادرست است.
مرحله ۵ را دوباره انجام دهید.

→ تست: در ترمینال cPanel:
```bash
cd /home/karzinte/karzinte/karzintell-api
/opt/alt/alt-nodejs20/root/usr/bin/node dist/database/run-migrations.js
```

### سایت بالا نیامد بعد از deploy

→ احتمالاً restart خودکار انجام نشده:
1. cPanel → Node.js Apps → Restart هر دو اپ
2. بررسی stderr.log:
```bash
tail -50 /home/karzinte/karzinte/karzintell-api/stderr.log
tail -50 /home/karzinte/karzintell-web/stderr.log
```

### npm install خطای حافظه داد

→ این روی سرور نباید رخ دهد چون build در GitHub انجام می‌شود.
اگر باز هم خطا داد:
```bash
NODE_OPTIONS=--max-old-space-size=1024 /opt/alt/alt-nodejs20/root/usr/bin/npm install --omit=dev
```

## ساختار فایل‌های CI/CD

```
karzintell/
├── .github/
│   └── workflows/
│       ├── deploy.yml          ← روی push به main: build + deploy
│       └── ci.yml              ← روی PR: typecheck
├── scripts/
│   └── deploy-on-server.sh     ← اسکریپت اجرا روی سرور
├── .cpanel.yml                 ← no-op (غیرفعال شده)
└── DEPLOY-CICD.md              ← همین فایل
```

## GitHub Secrets خلاصه

| Secret | توضیح |
|---|---|
| `SSH_HOST` | `linux25.centraldnserver.com` |
| `SSH_PORT` | `22` |
| `SSH_USER` | `karzinte` |
| `SSH_PRIVATE_KEY` | کلید خصوصی ed25519 (کامل) |

> **هیچ secret دیگری لازم نیست.** دیتابیس، JWT و سایر env vars
> روی سرور در cPanel UI و فایل `.env` هستند.

</div>
