<div dir="rtl">

# API عمومی فروشگاه برای اپلیکیشن موبایل (مرحله ۲۸)

همه قابلیت‌های فروشگاه از طریق **REST API** در دسترس است — اپ موبایل (Flutter/React Native) دقیقاً همین endpointها را مصرف می‌کند. این سند قرارداد کامل برای تیم موبایل است.

## پایه و قراردادها

| مورد | مقدار |
|---|---|
| Base URL | `https://api.karzintell.ir/api/v1` |
| احراز هویت | `Authorization: Bearer <accessToken>` |
| Refresh | کوکی HttpOnly `krz_rt` یا درخواست `/auth/refresh` با بدنه توکن |
| فرمت پاسخ موفق | `{ "data": ..., "meta": { "page", "limit", "total" }? }` |
| فرمت خطا | `{ "code": "SOME_CODE", "message": "پیام فارسی", "statusCode": 4xx }` |
| صفحه‌بندی | `?page=1&limit=20` |
| ارز | همه مبالغ به **ریال** |
| Idempotency | سفارش/پرداخت: هدر `Idempotency-Key` |

## احراز هویت

| متد | مسیر | بدنه | توضیح |
|---|---|---|---|
| POST | `/auth/register` | `{fullName?, phone?, email?, password, captchaId, captchaAnswer}` | ساخت حساب + لاگین |
| POST | `/auth/login` | `{identifier, password}` | خروجی: `{accessToken, user}` یا `{requireTwoFactor:true, ticket}` |
| POST | `/auth/2fa/verify` | `{ticket, code}` | تکمیل ورود دومرحله‌ای |
| GET | `/auth/captcha` | — | `{captchaId, question}` |
| POST | `/auth/otp/send` | `{channel, target, purpose, captchaId, captchaAnswer}` | OTP ورود/ثبت‌نام/فراموشی |
| POST | `/auth/otp/verify` | `{channel, target, code, purpose, fullName?}` | ورود با کد |
| POST | `/auth/refresh` | — (کوکی) | توکن جدید |
| POST | `/auth/logout` | — | — |
| POST | `/auth/forgot-password` → `/auth/reset-password` | — | بازیابی رمز |

## کاتالوگ (عمومی)

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/categories` | درخت دسته‌بندی |
| GET | `/products` | فیلترها: `?q=&category=&brand=&minPrice=&maxPrice=&inStock=1&sort=-createdAt&page=&limit=` |
| GET | `/products/:slug` | جزئیات کامل محصول + واریانت‌ها + ویژگی‌ها |
| GET | `/products/:id/related` | محصولات مرتبط |
| GET | `/search/autocomplete?q=` | پیشنهاد جستجو |
| GET | `/banners?position=` | بنرهای صفحه‌اصلی |

## سبد، سفارش و پرداخت

| متد | مسیر | توضیح |
|---|---|---|
| GET/POST/PATCH/DELETE | `/cart` ، `/cart/items` | مهمان: هدر `X-Cart-Session` ؛ کاربر: توکن |
| POST | `/cart/coupon` | اعمال کوپن `{code}` |
| GET | `/shipping/methods?province=&city=&subtotal=` | روش‌های ارسال و هزینه |
| GET | `/payments/gateways` | درگاه‌های فعال |
| POST | `/orders/checkout` | `{addressId, shippingMethodId?, couponCode?, note?}` |
| POST | `/payments/init` | `{orderCode, gateway}` → `{redirectUrl}` |
| GET | `/orders` ، `/orders/:code` | سفارش‌های من و جزئیات |
| GET | `/orders/:code/invoice-data` | فاکتور قابل چاپ |

## حساب کاربری

| متد | مسیر |
|---|---|
| GET/PATCH | `/me` |
| GET/POST/PATCH/DELETE | `/me/addresses` |
| GET | `/me/wishlist` · POST `/me/wishlist/toggle` |
| GET | `/me/compare` ·`/me/compare/toggle` · `/compare/data?ids=` |
| GET | `/wallet` | موجودی + تراکنش‌ها |
| GET/POST | `/notifications` ، `/me/notifications` (خواندن/خوانده‌شدن) |
| تیکت‌ها و نظرات | `/tickets` ، `/me/reviews` ، `/products/:id/reviews` |

بلاگ/اخبار/FAQ: `GET /blog` ، `/news` ، `/blog/:slug` ، `/faqs` ، `/pages/:slug` — همه عمومی.

## جریان خرید در اپ

```mermaid
login → cart → shipping/methods → payments/gateways → checkout → payments/init
     → باز کردن redirectUrl در WebView → برگشت به /checkout/callback
     → GET /orders/:code (تأیید نهایی سمت سرور)
```
> نکته امنیتی: نتیجه پرداخت را هرگز از کلاینت باور نکنید؛ وضعیت سفارش را همیشه از `GET /orders/:code` بگیرید.

## نسخه‌بندی

- API نسخه‌دار است: `/api/v1`. تغییرات شکسته با نسخه جدید (`/api/v2`) معرفی می‌شود.
- لیست کامل endpointها با Swagger: در توسعه روی `/api/docs` در دسترس است.

</div>
