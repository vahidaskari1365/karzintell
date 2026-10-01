# apps/api — بک‌اند کارزینتل (NestJS)

**در مرحله ۲ ساخته می‌شود.** مشخصات:

- NestJS ۱۱ + TypeORM (Migration محور) + BullMQ (روی Redis) + Meilisearch + AWS SDK (MinIO/S3)
- ساختار ماژولی طبق جدول ماژول‌ها در [docs/01-architecture.md](../../docs/01-architecture.md)
- احراز هویت JWT (access ۱۵ دقیقه + refresh ۳۰ روز با rotation) و Guard مجوز `@RequirePermissions(...)`
- Swagger در `/api/docs`، نسخه‌گذاری `/api/v1`، Envelope استاندارد پاسخ
- Seed ادمین/نقش‌ها از روی [database/schema.sql](../../database/schema.sql) منطبق می‌ماند
