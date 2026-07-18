# ۰۳ — طراحی API کارزینتل (REST)

Base URL: `{API_ORIGIN}/api/v1` — نسخه‌گذاری در مسیر (`v1`). مستند تعاملی Swagger روی `/api/docs`.

---

## ۱. قراردادها (Conventions)

### Envelope پاسخ
```jsonc
// موفق
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 134 } }

// خطا
{ "success": false,
  "error": { "code": "OUT_OF_STOCK", "message": "موجودی کافی نیست",
             "details": [{ "field": "items[0].quantity", "message": "حداکثر ۲ عدد" }] },
  "traceId": "01J..." }
```

### کدهای خطای دامنه
| HTTP | code | معنی |
|---|---|---|
| 400 | `VALIDATION_ERROR` | اعتبارسنجی DTO |
| 400 | `COUPON_INVALID` / `COUPON_EXPIRED` | کوپن نامعتبر |
| 401 | `UNAUTHENTICATED` / `OTP_INVALID` / `TOKEN_EXPIRED` | ورود لازم/توکن |
| 403 | `FORBIDDEN` | مجوز RBAC کافی نیست |
| 404 | `NOT_FOUND` | — |
| 409 | `CONFLICT` / `SLUG_TAKEN` / `EMAIL_TAKEN` / `PHONE_TAKEN` | تکراری |
| 409 | `OUT_OF_STOCK` / `INSUFFICIENT_RESERVED` | انبار |
| 410 | `CART_EXPIRED` | — |
| 402 | `PAYMENT_FAILED` / `PAYMENT_VERIFY_FAILED` | درگاه |
| 429 | `RATE_LIMITED` | — |
| 500 | `INTERNAL_ERROR` | — |

### صفحه‌بندی / مرتب‌سازی / فیلتر
- لیست‌ها: `?page=1&limit=20` (حداکثر limit=۵۰) — پاسخ در `meta` شمارش کل دارد.
- جستجو/اسکرول طولانی: cursor-based با `?cursor=` و `nextCursor` در meta.
- مرتب‌سازی: `?sort=-created_at,price` (منفی = نزولی).
- فیلتر: `?category=smartphones&brand=apple&price_min=1000000&price_max=9000000&attr[storage]=128,256&in_stock=1`.
- همه فیلدها در JSON **camelCase**؛ تاریخ‌ها ISO 8601 (UTC)؛ مبالغ عدد صحیح ریال.

### هدرهای کلاینت
```
Authorization: Bearer <accessToken>          (اختیاری برای APIهای عمومی)
Idempotency-Key: <uuid>                      (اجباری برای POST /checkout)
Accept-Language: fa
X-Request-Id: <uuid>                          (اختیاری)
```

---

## ۲. احراز هویت  —  `/auth`

| Method | مسیر | دسترسی | توضیح |
|---|---|---|---|
| POST | `/auth/register` | عمومی | ثبت‌نام با موبایل/ایمیل + رمز (یا «ورود با OTP») |
| POST | `/auth/otp/send` | عمومی (rate-limit) | ارسال کد؛ body: `{channel, target, purpose}` |
| POST | `/auth/otp/verify` | عمومی | تأیید کد → توکن؛ برای login/register |
| POST | `/auth/login` | عمومی | `{identifier, password}` → `{accessToken, user}` + set-cookie refresh |
| POST | `/auth/refresh` | کوکی refresh | چرخش توکن‌ها (rotation) |
| POST | `/auth/logout` | کاربر | revoke refresh جاری |
| POST | `/auth/forgot-password` | عمومی | ارسال OTP با purpose=reset_password |
| POST | `/auth/reset-password` | عمومی | `{target, code, newPassword}` |
| POST | `/auth/change-password` | کاربر | تغییر رمز (اجباری وقتی `mustChangePassword=1`) → ابطال همه refreshها |

پاسخ ورود:
```jsonc
{ "success": true, "data": {
  "accessToken": "...",
  "user": { "id": 1, "fullName": "مدیر ارشد کارزینتل", "phone": "09000000000",
            "roles": ["super_admin"], "permissions": ["*"] } } }
```

---

## ۳. حساب کاربری  —  `/me`

| Method | مسیر | توضیح |
|---|---|---|
| GET / PATCH | `/me` | مشاهده/ویرایش پروفایل |
| POST | `/me/avatar` | درخواست presign + ثبت آواتار |
| GET / POST | `/me/addresses` | لیست / افزودن آدرس |
| PATCH / DELETE | `/me/addresses/{id}` | ویرایش/حذف |
| POST | `/me/addresses/{id}/default` | آدرس پیش‌فرض |
| GET | `/me/orders` ، ‏`/me/orders/{code}` | سفارش‌های من + جزئیات |
| GET / POST / DELETE | `/me/wishlist` (+`/{productId}`) | علاقه‌مندی‌ها |
| GET | `/me/notifications` ، ‏POST `/me/notifications/read` | اعلان‌ها |
| GET / POST | `/me/tickets` ، ‏POST `/me/tickets/{id}/messages` | تیکت‌های من |

---

## ۴. کاتالوگ عمومی

| Method | مسیر | توضیح |
|---|---|---|
| GET | `/categories` | درخت کامل (کش‌شده) |
| GET | `/categories/{slug}` | دسته + مسیر (breadcrumb) + صفت‌های قابل‌فیلتر |
| GET | `/brands` ، ‏`/brands/{slug}` | برندها |
| GET | `/products` | لیست با فیلتر/مرتب‌سازی/صفحه (از Meilisearch) |
| GET | `/products/{slug}` | صفحه محصول: مشخصات، تنوع‌ها، تصاویر، قیمت‌ها |
| GET | `/products/{id}/related` | محصولات مرتبط |
| GET | `/products/{id}/reviews` (cursor) | دیدگاه‌های تأییدشده |
| POST | `/products/{id}/reviews` | ثبت دیدگاه (pending) — ورود لازم |
| GET | `/products/{id}/questions` ، ‏POST `/products/{id}/questions` | پرسش‌وپاسخ |
| POST | `/products/{id}/view` | شمارنده بازدید (throttle) |
| GET | `/search` | `?q=` جستجوی فوری + suggest (`/search/suggest`) |
| GET | `/banners?position=home_hero` | بنرهای فعال (کش) |
| GET | `/pages/{slug}` | صفحات ثابت |
| GET | `/settings/public` | تنظیمات عمومی (نام فروشگاه و …) |

نمونه پاسخ محصول در لیست:
```jsonc
{ "id": 42, "name": "گوشی اپل iPhone 16", "slug": "apple-iphone-16",
  "brand": "اپل", "categorySlug": "smartphones",
  "minPrice": 850000000, "hasDiscount": true,
  "image": "https://…/products/42/x.webp", "inStock": true,
  "ratingAvg": 4.6, "ratingCount": 128 }
```

---

## ۵. سبد خرید و تسویه

| Method | مسیر | توضیح |
|---|---|---|
| GET | `/cart` | سبد جاری (کاربر یا کوکی مهمان) با جمع‌ها |
| POST | `/cart/items` | افزودن `{variantId, quantity}` |
| PATCH | `/cart/items/{itemId}` | تغییر تعداد |
| DELETE | `/cart/items/{itemId}` | حذف |
| POST | `/cart/coupon` ، ‏DELETE `/cart/coupon` | اعمال/حذف کوپن |
| POST | `/cart/merge` | ادغام سبد مهمان در کاربر پس از ورود (خودکار از کلاینت) |
| POST | `/checkout` | `Idempotency-Key` اجباری → ایجاد سفارش `pending_payment` + رزرو موجودی |
| POST | `/payments/init` | `{orderCode, gateway}` → `{redirectUrl, authority}` |
| GET | `/payments/callback/{gateway}` | بازگشت درگاه → verify → ریدایرکت به `/orders/{code}/result` |
| GET | `/orders/{code}/track` | پیگیری سفارش با کد + موبایل (برای مهمان جزئی) |

---

## ۶. پنل مدیریت — پیشوند `/admin` و نیازمندی مجوز

تمام routeها: احراز هویت + RBAC. ستون «مجوز» کلید permission است.

### داشبورد و گزارش
| Method | مسیر | مجوز |
|---|---|---|
| GET | `/admin/dashboard` (KPI: فروش امروز، سفارش باز، موجودی کم) | `dashboard.view` |
| GET | `/admin/reports/sales?from&to&groupBy=day` | `reports.view` |
| GET | `/admin/reports/top-products` ، ‏`/admin/reports/low-stock` | `reports.view` |

### محصولات و کاتالوگ
| Method | مسیر | مجوز |
|---|---|---|
| GET/POST | `/admin/products` | `products.view/create` |
| GET/PATCH/DELETE | `/admin/products/{id}` | `products.view/update/delete` |
| POST | `/admin/products/{id}/publish` ، ‏`/unpublish` | `products.publish` |
| POST | `/admin/products/{id}/variants` ، ‏PATCH/DELETE `…/variants/{vid}` | `products.update` |
| POST | `/admin/products/{id}/images` (presign + ثبت) ، ‏DELETE `…/images/{imgId}` | `products.update` + `files.manage` |
| POST | `/admin/products/bulk-status` | `products.update` |
| GET/POST/PATCH/DELETE | `/admin/categories[/{id}]` (با جابه‌جایی `move`) | `categories.manage` |
| GET/POST/PATCH/DELETE | `/admin/brands[/{id}]` | `brands.manage` |
| GET/POST/PATCH/DELETE | `/admin/attributes[/{id}]` + `/{aid}/values[/{vid}]` | `attributes.manage` |

### انبار
| Method | مسیر | مجوز |
|---|---|---|
| GET | `/admin/inventory?low_stock=1` | `inventory.view` |
| POST | `/admin/inventory/adjust` `{variantId, warehouseId, type, quantity, note}` | `inventory.manage` |
| GET | `/admin/inventory/movements?variant_id=` | `inventory.view` |
| GET/POST/PATCH/DELETE | `/admin/warehouses[/{id}]` | `inventory.manage` |

### سفارش‌ها و پرداخت
| Method | مسیر | مجوز |
|---|---|---|
| GET | `/admin/orders?status=&q=&date_from=` | `orders.view` |
| GET | `/admin/orders/{id}` (اقلام + تاریخچه + پرداخت‌ها + ارسال) | `orders.view` |
| POST | `/admin/orders/{id}/status` `{to, note}` (گذر مجاز) | `orders.update_status` |
| POST | `/admin/orders/{id}/cancel` | `orders.cancel` |
| POST | `/admin/orders/{id}/refund` | `orders.refund` |
| POST | `/admin/orders/{id}/shipment` (کد رهگیری) | `orders.update_status` |
| GET | `/admin/orders/{id}/invoice` (PDF) | `orders.view` |
| GET | `/admin/payments` | `payments.view` |

### کاربران و دسترسی‌ها — **قلب درخواست پروژه**
| Method | مسیر | مجوز | توضیح |
|---|---|---|---|
| GET | `/admin/users?role=&status=&q=` | `users.view` | لیست کاربران (پرسنل + مشتری) |
| POST | `/admin/users` | `users.create` | ساخت کاربر جدید توسط ادمین؛ رمز موقت → `mustChangePassword=1` |
| GET/PATCH | `/admin/users/{id}` | `users.view/update` | جزئیات/ویرایش/تعلیق |
| DELETE | `/admin/users/{id}` | `users.delete` | soft-delete (سفارش‌ها حفظ می‌شوند) |
| PUT | `/admin/users/{id}/roles` | `users.assign_role` | تخصیص نقش‌ها: `{roleIds:[2,4]}` — ثبت `assigned_by` |
| PUT | `/admin/users/{id}/permissions` | `users.assign_role` | override موردی `{items:[{permission:"orders.refund",type:"deny"}]}` |
| GET | `/admin/permissions` | `roles.view` | همه مجوزها (گروه‌بندی‌شده برای UI) |
| GET/POST/PATCH/DELETE | `/admin/roles[/{id}]` | `roles.*` | CRUD نقش + تنظیم مجوزهای نقش `{permissionIds:[…]}` |

> سیاست: کاربر با نقش `super_admin` و نقشِ `super_admin` خود غیرقابل حذف/ویرایش‌نام‌اند؛ کاربر نمی‌تواند به خودش دسترسی بالاتر از سطح خودش بدهد (permission escalation جلوگیری می‌شود).

### مشتریان / مدیریت محتوا / بازاریابی
| Method | مسیر | مجوز |
|---|---|---|
| GET | `/admin/customers` ، ‏`/{id}` (پروفایل ۳۶۰°: سفارش‌ها/تیکت‌ها) | `customers.view` |
| POST | `/admin/customers/{id}/adjust-note` و غیره | `customers.manage` |
| GET | `/admin/reviews?status=pending` + POST `/{id}/approve|reject|reply` | `reviews.moderate` |
| GET | `/admin/questions?status=pending` + POST `/{id}/answer|reject` | `questions.moderate` |
| GET/POST/PATCH/DELETE | `/admin/coupons[/{id}]` | `coupons.manage` |
| GET/POST/PATCH/DELETE | `/admin/banners[/{id}]` | `banners.manage` |
| GET/POST/PATCH/DELETE | `/admin/pages[/{id}]` | `pages.manage` |
| GET | `/admin/tickets` + POST `/{id}/messages` + `/{id}/status` | `tickets.view/reply` |
| GET/PUT | `/admin/settings` (گروهی) | `settings.manage` |
| GET | `/admin/audit-logs?user_id=&action=` | `audit.view` |
| POST | `/admin/files/presign` | `files.manage` |

### ادمینِ جستجو/زیرساخت
| Method | مسیر | مجوز |
|---|---|---|
| POST | `/admin/search/reindex` | `settings.manage` |
| GET | `/health` ، ‏`/health/ready` | عمومی (بدون PII) |

---

## ۷. Webhook ها

| مسیر | توضیح |
|---|---|
| GET `/payments/callback/{gateway}` | بازگشت از درگاه (idempotent روی authority)؛ retry-safe |
| (اختیاری) POST `/webhooks/sms/delivery` | گزارش تحویل پیامک |

---

## ۸. نمونه فراخوانی

```bash
# ورود ادمین پیش‌فرض
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin@karzintell.ir","password":"Admin@123456"}'

# ساخت کاربر جدید توسط ادمین (با نقش انباردار)
curl -X POST http://localhost:4000/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"fullName":"انباردار نمونه","phone":"09120000000","roleIds":[4]}'

# تخصیص مجوز موردی (deny بازپرداخت به آن کاربر)
curl -X PUT http://localhost:4000/api/v1/admin/users/9/permissions \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"permission":"orders.refund","type":"deny"}]}'
```
