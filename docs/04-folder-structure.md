# ۰۴ — ساختار پوشه‌ها (Monorepo)

مدیریت با **pnpm workspace** ( + Turborepo در مرحله ۲). در این مرحله اسکلت و قراردادها ساخته شده‌اند؛ کدها در مراحل بعد پر می‌شوند.

```
karzintell/
│
├── apps/
│   ├── web/                        # فرانت‌اند — Next.js 15 (فروشگاه + پنل ادمین)
│   │   ├── app/
│   │   │   ├── (shop)/             # گروه مسیر ویترین (لایه عمومی، RTL)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx                    # صفحه اصلی
│   │   │   │   ├── products/[slug]/page.tsx    # صفحه محصول
│   │   │   │   ├── categories/[slug]/page.tsx  # دسته‌بندی
│   │   │   │   ├── search/page.tsx
│   │   │   │   ├── brands/[slug]/page.tsx
│   │   │   │   ├── cart/page.tsx
│   │   │   │   ├── checkout/page.tsx
│   │   │   │   ├── checkout/callback/page.tsx  # بازگشت از درگاه
│   │   │   │   └── account/                    # پروفایل کاربر
│   │   │   │       ├── layout.tsx
│   │   │   │       ├── page.tsx                # داشبورد من
│   │   │   │       ├── addresses/page.tsx
│   │   │   │       ├── orders/page.tsx + orders/[code]/page.tsx
│   │   │   │       ├── wishlist/page.tsx
│   │   │   │       └── tickets/page.tsx
│   │   │   ├── (auth)/             # login | register | otp | forgot
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── admin/              # پنل مدیریت (محافظت‌شده)
│   │   │   │   ├── layout.tsx      # سایدبار + guard
│   │   │   │   ├── page.tsx        # داشبورد
│   │   │   │   ├── products/       # لیست، new, [id]/edit
│   │   │   │   ├── categories/ brands/ attributes/
│   │   │   │   ├── inventory/ orders/ payments/
│   │   │   │   ├── customers/
│   │   │   │   ├── users/          # کاربران + تخصیص نقش/مجوز
│   │   │   │   ├── roles/          # CRUD نقش + چک‌باکس مجوزها
│   │   │   │   ├── marketing/      # coupons | banners | pages
│   │   │   │   ├── tickets/ reports/ settings/
│   │   │   │   └── audit-logs/
│   │   │   ├── manifest.ts         # PWA manifest
│   │   │   ├── sitemap.ts robots.ts
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui (button, input, dialog, …)
│   │   │   ├── layout/             # header, footer, mega-menu, admin-sidebar
│   │   │   ├── product/            # product-card, price, variant-picker, gallery
│   │   │   ├── cart/ checkout/ account/
│   │   │   └── shared/             # pagination, empty-state, confirm-dialog
│   │   ├── features/               # منطق هر دامنه: hooks + api-client + types
│   │   │   ├── auth/ catalog/ cart/ checkout/ orders/
│   │   │   ├── admin-users/ admin-products/ admin-orders/
│   │   │   └── search/
│   │   ├── lib/
│   │   │   ├── api-client.ts       # ky + refresh-token خودکار
│   │   │   ├── auth-store.ts       # zustand: accessToken + user
│   │   │   ├── permissions.ts      # usePermission — از packages/shared
│   │   │   ├── utils.ts seo.ts format.ts  # تومان/ریال، اعداد فارسی
│   │   ├── hooks/
│   │   ├── public/                 # icons, pwa icons, placeholders
│   │   ├── middleware.ts           # guard مسیرهای /account و /admin
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── components.json
│   │   └── package.json
│   │
│   └── api/                        # بک‌اند — NestJS 11
│       ├── src/
│       │   ├── main.ts             # bootstrap: validation, helmet, swagger, version
│       │   ├── app.module.ts
│       │   ├── config/             # env validation (joi) + typed config
│       │   ├── database/
│       │   │   ├── typeorm.module.ts
│       │   │   └── migrations/
│       │   ├── common/
│       │   │   ├── decorators/     # @RequirePermissions, @CurrentUser, @Public
│       │   │   ├── guards/         # jwt-auth, permissions, rate-limit
│       │   │   ├── interceptors/   # envelope, audit-log, cache
│       │   │   ├── filters/        # http-exception → envelope
│       │   │   ├── pipes/          # parse، trim
│       │   │   └── utils/          # pagination, slugify-fa, money
│       │   ├── queue/              # BullMQ: queues + workers (sms, mail, meili-sync)
│       │   └── modules/
│       │       ├── auth/           # otp, jwt, refresh rotation
│       │       ├── users/          # profile + addresses
│       │       ├── rbac/           # roles, permissions, effective-perms (redis cache)
│       │       ├── catalog/        # categories, brands, products, variants, images
│       │       ├── attributes/
│       │       ├── inventory/      # warehouses, stock, movements (+ تراکنش)
│       │       ├── search/         # meilisearch adapter + admin reindex
│       │       ├── cart/           # redis hot + mysql persist, merge
│       │       ├── coupons/
│       │       ├── orders/         # state machine + histories + invoice pdf
│       │       ├── payments/       # gateway interface + zarinpal adapter + callback
│       │       ├── shipping/
│       │       ├── reviews/        # reviews + questions
│       │       ├── cms/            # banners + pages
│       │       ├── tickets/
│       │       ├── notifications/  # database + sms/email dispatch
│       │       ├── files/          # s3 presign + processing jobs (sharp)
│       │       ├── settings/
│       │       ├── audit/          # interceptor ثبت خودکار
│       │       ├── dashboard/      # KPI ها و گزارش‌ها
│       │       └── health/
│       ├── test/
│       │   ├── app.e2e-spec.ts auth.e2e-spec.ts orders-flow.e2e-spec.ts
│       │   └── fixtures/ factories/
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   └── shared/                     # تایپ‌ها و ثابت‌های مشترک فرانت/بک
│       ├── src/
│       │   ├── index.ts
│       │   ├── permissions.ts      # لیست کلیدهای مجوز (منبع واحد حقیقت)  ✅ ایجاد شد
│       │   ├── roles.ts            # نام نقش‌های سیستمی                       ✅ ایجاد شد
│       │   └── types/              # DTO مشترک: Product, OrderStatus, Envelope
│       ├── tsconfig.json
│       └── package.json
│
├── database/
│   └── schema.sql                  # طراحی کامل دیتابیس + seed  ✅ ایجاد شد
│
├── infrastructure/
│   └── docker/                     # Dockerfileهای production + nginx.conf (مرحله ۶)
│
├── docs/                           # همین مستندات
│   ├── 01-architecture.md          ✅
│   ├── 02-database-design.md       ✅
│   ├── 03-api-design.md            ✅
│   └── 04-folder-structure.md      ✅ (همین فایل)
│
├── docker-compose.yml              # زیرساخت توسه  ✅
├── .env.example                    ✅
├── .gitignore                      ✅
├── pnpm-workspace.yaml             # (مرحله ۲)
├── turbo.json                      # (مرحله ۲)
├── package.json                    # ریشه scripts (مرحله ۲)
└── README.md                       ✅
```

---

## قراردادهای نام‌گذاری

| مورد | قرارداد | مثال |
|---|---|---|
| URL API | kebab-case جمع | `/admin/product-variants` نه camelCase |
| فیلد JSON | camelCase | `compareAtPrice` |
| ستون DB | snake_case | `compare_at_price` |
| فایل کامپوننت React | kebab-case.tsx، کامپوننت PascalCase | `product-card.tsx` → `ProductCard` |
| ماژول/سرویس Nest | kebab-case | `orders.service.ts` |
| Migration | زمان‌دار، توصیفی | `20260718120000-create-catalog-tables.ts` |
| ENV | SCREAMING_SNAKE | `JWT_ACCESS_TTL` |

## قراردادهای Git

- شاخه اصلی `main` (protected)؛ توسعه روی `feature/...` و مرج با PR.
- این سند/طراحی‌ها الآن روی شاخه کاری جلسه فعلی (`arena/…`) کامیت می‌شوند و در ادامه مراحل از همین جریان پیروی می‌کنیم.
- Commit ها به سبک Conventional: `feat(api): …`, `feat(web): …`, `docs: …`.
