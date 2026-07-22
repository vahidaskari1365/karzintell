# apps/web — فرانت‌اند کارزینتل (Next.js)

**در مرحله ۲ ساخته می‌شود.** مشخصات:

- Next.js ۱۵ (App Router) + React ۱۹ + TypeScript + Tailwind CSS ۴ + shadcn/ui
- دو گروه مسیر: `(shop)` ویترین با SSR/SSR-cache + PWA، و `admin/` پنل مدیریت محافظت‌شده با middleware و بررسی مجوز در هر صفحه
- احراز هویت: access token در حافظه + refresh در httpOnly cookie (بازیابی خودکار در `lib/api-client`)
- ساختار هدف: دقیقاً طبق [docs/04-folder-structure.md](../../docs/04-folder-structure.md)
- تایپ‌های مشترک از `@karzintell/shared` (packages/shared)
