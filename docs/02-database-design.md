# ۰۲ — طراحی پایگاه‌داده کارزینتل (MySQL 8)

فایل DDL کامل و قابل اجرا: [`database/schema.sql`](../database/schema.sql) — ۴۱ جدول + داده اولیه.

---

## ۱. اصول طراحی

1. **InnoDB + utf8mb4** روی همه جداول (پشتیبانی کامل فارسی و emoji).
2. **پول به ریال در `BIGINT UNSIGNED`** — نه FLOAT/DECIMAL کوچک؛ احتمال overflow در مبالغ کلان وجود ندارد.
3. **Soft Delete** با ستون `deleted_at` روی موجودیت‌های اصلی (users، products، orders، categories، …).
4. **Snapshot در سفارش:** آدرس (`address_json`)، نام محصول، SKU و قیمت در `order_items` کپی می‌شود تا تغییر بعدی محصول تاریخچه را خراب نکند.
5. **موجودی در سطح تنوع (Variant)** و تفکیک‌شده به ازای انبار؛ قابل‌فروش = `quantity - reserved`. تمام تغییرات در `stock_movements` ثبت می‌شود (قابل حسابرسی).
6. **ایندکس‌گذاری بر اساس کوئری‌های واقعی** فهرست‌شده در بخش ۵.
7. **زمان‌ها UTC** (`DATETIME`)؛ نمایش به Asia/Tehran در لایه نمایش.
8. **idempotency:** کلیدهای یکتا روی `payments(gateway, authority)`، `coupon_usages(coupon_id, order_id)`، `cart_items(cart_id, variant_id)`.

---

## ۲. نمودار ERD

```mermaid
erDiagram
    users ||--o{ user_addresses : "has"
    users ||--o{ refresh_tokens : "owns"
    users }o--o{ roles : "role_user"
    roles }o--o{ permissions : "permission_role"
    users }o--o{ permissions : "permission_user (override)"
    users ||--o{ orders : "places"
    users ||--o{ reviews : "writes"
    users ||--o{ tickets : "opens"
    users ||--o{ notifications : "receives"
    users ||--o{ wishlists : "saves"

    categories ||--o{ categories : "parent (tree)"
    categories ||--o{ products : "contains"
    categories }o--o{ attributes : "category_attribute"
    attributes ||--o{ attribute_values : "has"
    brands ||--o{ products : "makes"

    products ||--o{ product_variants : "has"
    products ||--o{ product_images : "shows"
    products ||--o{ reviews : "rated by"
    products ||--o{ product_questions : "asked"
    products ||--o{ wishlists : "saved in"
    product_variants }o--o{ attribute_values : "product_variant_values"

    warehouses ||--o{ inventory : "holds"
    product_variants ||--o{ inventory : "stocked"
    product_variants ||--o{ stock_movements : "movement"
    warehouses ||--o{ stock_movements : "in"

    carts ||--o{ cart_items : "contains"
    product_variants ||--o{ cart_items : "added"
    coupons ||--o{ carts : "applied"

    orders ||--o{ order_items : "contains"
    orders ||--o{ order_status_histories : "history"
    orders ||--o{ payments : "paid_by"
    orders ||--o| shipments : "shipped"
    order_items }o--|| product_variants : "sold as (snapshot)"
    coupons }o--o{ orders : "coupon_usages"

    tickets ||--o{ ticket_messages : "has"

    users {
        bigint id PK
        string phone UK
        string email UK
        string password_hash
        enum status
    }
    products {
        bigint id PK
        int category_id FK
        string slug UK
        enum status "draft|pending|published|archived"
        bigint min_price "cache ریال"
    }
    product_variants {
        bigint id PK
        bigint product_id FK
        string sku UK
        bigint price "ریال"
        int stock_total "cache"
    }
    orders {
        bigint id PK
        string code UK "KRZ-2026-000001"
        enum status "pending_payment|paid|processing|shipped|delivered|cancelled|refunded"
        json address_json "snapshot"
    }
    order_items {
        bigint id PK
        bigint order_id FK
        bigint variant_id FK
        string product_name "snapshot"
        bigint unit_price
    }
    payments {
        bigint id PK
        bigint order_id FK
        enum gateway "zarinpal|idpay|zibal|manual|cod"
        string authority "idempotent"
    }
    reviews {
        bigint id PK
        bigint product_id FK
        bigint user_id FK
        tinyint rating "1..5"
        enum status "pending|approved|rejected"
    }
```

---

## ۳. تقسیم‌بندی جداول و نکات هر گروه

### ۳‑۱) کاربران و RBAC — `users, roles, permissions, role_user, permission_role, permission_user, user_addresses, verification_codes, refresh_tokens`
- RBAC کلاسیک + جدول `permission_user` برای override موردی (`allow`/`deny`) — ادمین می‌تواند به کاربری خاص دسترسی بدهد یا موقت بگیرد بدون دست‌کاری نقش.
- `role_user.assigned_by` مشخص می‌کند کدام ادمین نقش را تخصیص داده (قابل حسابرسی).
- OTPها فقط **هش‌شده** در `verification_codes` ذخیره می‌شوند.

### ۳‑۲) کاتالوگ — `brands, categories, attributes, attribute_values, category_attribute, products, product_variants, product_variant_values, product_images`
- دسته‌بندی **درختی** با `parent_id` (برای صفحه نمایش درخت کش می‌شود؛ مهاجرت آینده به closure table در صورت نیاز).
- مدل **EAV هدایت‌شده**: صفت‌ها فقط از طریق `category_attribute` به دسته متصل‌اند؛ ستون `is_variant` تعیین می‌کند کدام صفت در ساخت تنوع شرکت می‌کند (مثل رنگ/حافظه برای موبایل) و بقیه صرفاً مشخصات نمایشی‌اند.
- `products.min_price/max_price` کشِ قیمت برای لیست‌ها است که با رویداد تغییر variant به‌روز می‌شود (جلوگیری از JOIN گروه‌بندی در هر لیست).
- یکتایی نماک (slug) در `categories/brands/products` برای URLهای تمیز سئو.

### ۳‑۳) انبار — `warehouses, inventory, stock_movements`
- `inventory` کلید مرکب `(variant_id, warehouse_id)`؛ با `SELECT … FOR UPDATE` در تراکنش سفارش قفل می‌شود.
- `stock_movements` دارای `qty_before/qty_after` → بازسازی تاریخی موجودی هر لحظه ممکن است.

### ۳‑۴) سبد/کوپن — `carts, cart_items, coupons, coupon_usages`
- سبد برای کاربر لاگین (`user_id`) یا مهمان (`session_id` از کوکی)؛ هنگام ورود دو سبد merge می‌شوند (`status=merged`).
- محدودیت‌های کوپن: سقف تخفیف، حداقل سبد، سقف استفاده کل/هر کاربر، بازه زمانی؛ مصرف در تراکنش سفارش ثبت می‌شود.

### ۳‑۵) سفارش/پرداخت — `orders, order_items, order_status_histories, payments, shipments`
- وضعیت سفارش فقط از مسیر state machine تغییر می‌کند و هر گذر در `order_status_histories` با `changed_by` ثبت می‌شود.
- `FK` روی user با `ON DELETE RESTRICT`: حذف کاربر هرگز تاریخچه سفارش را نمی‌کند (حذف کاربر فقط soft است).
- پرداخت چنددرگاهی؛ `payload` خام درگاه برای عیب‌یابی نگهداری می‌شود.

### ۳‑۶) بازخورد/CMS/پشتیبانی — `reviews, product_questions, wishlists, banners, pages, tickets, ticket_messages`
- دیدگاه پیش‌فرض `pending` است تا پس از تأیید منتشر شود؛ `UNIQUE(product_id, user_id)` جلوی اسپم می‌گیرد.
- `ticket_messages.is_internal` یادداشت داخلی ادمین است و به مشتری نشان داده نمی‌شود.

### ۳‑۷) زیرساخت — `files, notifications, settings, audit_logs`
- `settings` کلید-مقدار تایپ‌دار با `is_public` (مواردی مثل نام فروشگاه از API عمومی خوانده می‌شوند).
- `audit_logs` با یک Interceptor سراسری از اکشن‌های ادمین (subject + old/new + ip) پر می‌شود.

---

## ۴. ایندکس‌های کلیدی

| کوئری پرتکرار | ایندکس |
|---|---|
| لیست محصولات یک دستهٔ منتشرشده | `products(category_id, status)` + `products(status, published_at)` |
| صفحه محصول از روی slug | `UNIQUE products(slug)` / `UNIQUE product_variants(sku)` |
| سفارش‌های کاربر | `orders(user_id, created_at)` |
| صف سفارش‌های در انتظار پردازش | `orders(status, created_at)` |
| نمایش دیدگاه‌های تأییدشده محصول | `reviews(product_id, status, created_at)` |
| اعلان‌های ناخوانده | `notifications(user_id, read_at, created_at)` |
| اتصال JWT به درگاه (idempotency) | `UNIQUE payments(gateway, authority)` |
| جستجوی متنی محصول | عمداً FULLTEXT نداریم → **Meilisearch** مسئول است |

---

## ۵. داده اولیه (Seed)

با اجرای `schema.sql` آماده می‌شوند:

| مورد | مقدار |
|---|---|
| نقش‌ها | super_admin, manager, support, warehouse, customer |
| مجوزها | ۳۸ مجوز دانه‌ای (گروه‌بندی‌شده) |
| نگاشت نقش↔مجوز | super_admin=همه؛ manager/support/warehouse طبق جدول دسترسی مستند |
| **ادمین پیش‌فرض** | phone: `09000000000` — email: `admin@karzintell.ir` — رمز: `Admin@123456` (بلافاصله باید عوض شود: `must_change_password=1`) |
| انبار | «انبار مرکزی» |
| نمونه کاتالوگ | ۷ دسته (موبایل، ساعت هوشمند، …)، ۵ برند، ۴ صفت + مقادیر |

---

## ۶. اجرای اسکیما (توسعه)

```bash
docker compose up -d mysql
docker exec -i karzintell-mysql mysql -uroot -proot_secret < database/schema.sql
# مشاهده در رابط وب: http://localhost:8080  (Adminer)
#   System: MySQL | Server: mysql | User: karzintell | Pass: secret | DB: karzintell
```

## ۷. سیاست نگهداشت

- **Migrationها:** در مرحله ۲ با TypeORM Migration مدیریت می‌شوند؛ `schema.sql` مرجع طراحی و راه‌انداز اولیه است.
- **Backup:** `mysqldump --single-transaction --routines` شبانه + نگهداری ۳۰ روز + کپی هفتگی روی S3.
- **Retention:** سفارش‌ها و پرداخت‌ها هرگز hard-delete نمی‌شوند؛ `audit_logs` پس از ۱۸ ماه به آرشیو سرد منتقل می‌شود.
