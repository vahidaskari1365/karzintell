-- ============================================================================
--  کارزینتل (Karzintell) — فروشگاه آنلاین قطعات و گجت‌های الکترونیک
--  Database Schema — MySQL 8 / InnoDB / utf8mb4
--
--  نحوه اجرا (محیط توسعه):
--    docker compose up -d mysql
--    docker exec -i karzintell-mysql mysql -uroot -proot_secret < database/schema.sql
--
--  ⚠️  این اسکریپت دیتابیس را از نو می‌سازد (DROP DATABASE). فقط برای محیط توسعه.
--  در production از Migration های TypeORM استفاده می‌شود، نه این فایل.
-- ============================================================================

DROP DATABASE IF EXISTS karzintell;
CREATE DATABASE karzintell
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE karzintell;

SET NAMES utf8mb4;

-- ============================================================================
-- 1) کاربران، نقش‌ها و دسترسی‌ها (Users / RBAC)
-- ============================================================================

CREATE TABLE users (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name            VARCHAR(120)  NOT NULL,
  email                VARCHAR(190)  NULL,
  phone                VARCHAR(15)   NOT NULL COMMENT 'شماره موبایل — ورود با OTP هم با همین انجام می‌شود',
  password_hash        VARCHAR(255)  NOT NULL COMMENT 'bcrypt (cost=10)',
  national_code        VARCHAR(10)   NULL COMMENT 'کد ملی (برای فاکتور رسمی)',
  avatar_path          VARCHAR(500)  NULL,
  status               ENUM('active','pending','suspended') NOT NULL DEFAULT 'pending',
  must_change_password TINYINT(1)    NOT NULL DEFAULT 0 COMMENT 'کاربران ساخته‌شده توسط ادمین موظف به تغییر رمز هستند',
  email_verified_at    DATETIME      NULL,
  phone_verified_at    DATETIME      NULL,
  last_login_at        DATETIME      NULL,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at           DATETIME      NULL COMMENT 'Soft Delete',
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_status (status)
) ENGINE=InnoDB COMMENT='کاربران سیستم (مشتری + پرسنل)';

CREATE TABLE roles (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(50)  NOT NULL COMMENT 'نام ماشینی: super_admin, manager, ...',
  label       VARCHAR(100) NOT NULL COMMENT 'عنوان فارسی برای نمایش',
  description VARCHAR(255) NULL,
  is_system   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'نقش سیستمی → غیرقابل حذف و ویرایش نام',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB COMMENT='نقش‌ها';

CREATE TABLE permissions (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL COMMENT 'کلید دسترسی: products.create',
  label      VARCHAR(150) NOT NULL,
  group_name VARCHAR(50)  NOT NULL COMMENT 'گروه: products, orders, users, ...',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_name (name)
) ENGINE=InnoDB COMMENT='مجوزهای دانه‌ای سیستم';

CREATE TABLE role_user (
  role_id     INT UNSIGNED    NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NULL COMMENT 'کدام ادمین نقش را داده است',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, user_id),
  CONSTRAINT fk_ru_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_ru_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_ru_assigned_by FOREIGN KEY (assigned_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='اتصال نقش به کاربر (چندبه‌چند)';

CREATE TABLE permission_role (
  permission_id INT UNSIGNED NOT NULL,
  role_id       INT UNSIGNED NOT NULL,
  PRIMARY KEY (permission_id, role_id),
  CONSTRAINT fk_pr_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='مجوزهای هر نقش';

CREATE TABLE permission_user (
  permission_id INT UNSIGNED    NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  type          ENUM('allow','deny') NOT NULL DEFAULT 'allow' COMMENT 'allow=افزودن دسترسی، deny=حذف موقت دسترسی',
  granted_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (permission_id, user_id),
  CONSTRAINT fk_pu_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
  CONSTRAINT fk_pu_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_pu_granted_by FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='override دسترسی برای کاربر خاص';

CREATE TABLE user_addresses (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  title          VARCHAR(50)  NOT NULL DEFAULT 'آدرس من',
  receiver_name  VARCHAR(120) NOT NULL,
  receiver_phone VARCHAR(15)  NOT NULL,
  province       VARCHAR(50)  NOT NULL,
  city           VARCHAR(50)  NOT NULL,
  postal_code    VARCHAR(10)  NULL,
  address        TEXT         NOT NULL,
  plaque         VARCHAR(20)  NULL,
  unit           VARCHAR(20)  NULL,
  latitude       DECIMAL(10,7) NULL,
  longitude      DECIMAL(10,7) NULL,
  is_default     TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_addr_user (user_id),
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='دفتر آدرس کاربران';

CREATE TABLE verification_codes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel     ENUM('phone','email') NOT NULL,
  target      VARCHAR(190) NOT NULL COMMENT 'شماره موبایل یا ایمیل',
  code_hash   VARCHAR(255) NOT NULL COMMENT 'کد OTP به‌صورت هش ذخیره می‌شود',
  purpose     ENUM('register','login','reset_password','verify_contact') NOT NULL DEFAULT 'login',
  attempts    TINYINT NOT NULL DEFAULT 0,
  expires_at  DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vc_target (channel, target, purpose)
) ENGINE=InnoDB COMMENT='کدهای یک‌بارمصرف (OTP)';

CREATE TABLE refresh_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL COMMENT 'SHA-256 توکن',
  user_agent  VARCHAR(255) NULL,
  ip          VARCHAR(45) NULL,
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rt_token (token_hash),
  KEY idx_rt_user (user_id),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='توکن‌های تازه‌سازی JWT (با امکان revoke)';

-- ============================================================================
-- 2) کاتالوگ محصولات (Catalog)
-- ============================================================================

CREATE TABLE brands (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(140) NOT NULL,
  logo_path   VARCHAR(500) NULL,
  description TEXT NULL,
  website     VARCHAR(255) NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brands_slug (slug),
  KEY idx_brands_active (is_active, sort_order)
) ENGINE=InnoDB COMMENT='برندها (Apple, Samsung, ...)';

CREATE TABLE categories (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id        INT UNSIGNED NULL,
  name             VARCHAR(120) NOT NULL,
  slug             VARCHAR(160) NOT NULL,
  description      TEXT NULL,
  image_path       VARCHAR(500) NULL,
  icon             VARCHAR(80)  NULL,
  sort_order       INT NOT NULL DEFAULT 0,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  meta_title       VARCHAR(190) NULL,
  meta_description VARCHAR(300) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_cat_parent (parent_id, is_active, sort_order),
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='دسته‌بندی درختی (نامحدود عمق)';

CREATE TABLE attributes (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL COMMENT 'عنوان: رنگ، حافظه داخلی، ...',
  code          VARCHAR(100) NOT NULL COMMENT 'شناسه ماشینی: color, storage',
  type          ENUM('text','number','select','multiselect','boolean') NOT NULL DEFAULT 'select',
  unit          VARCHAR(20) NULL COMMENT 'GB, mAh, ...',
  group_name    VARCHAR(100) NULL COMMENT 'گروه‌بندی مشخصات فنی (عمومی، نمایشگر، ...)',
  is_filterable TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'در فیلترهای فروشگاه بیاید',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attrs_code (code)
) ENGINE=InnoDB COMMENT='صفت‌های فنی/ویژگی محصول';

CREATE TABLE attribute_values (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attribute_id INT UNSIGNED NOT NULL,
  value        VARCHAR(190) NOT NULL COMMENT 'مشکی، ۱۲۸ گیگابایت، ...',
  meta         JSON NULL COMMENT 'داده تکمیلی مثل کد رنگ hex',
  sort_order   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attrval (attribute_id, value),
  CONSTRAINT fk_attrval_attr FOREIGN KEY (attribute_id) REFERENCES attributes (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='مقادیر مجاز هر صفت';

CREATE TABLE category_attribute (
  category_id  INT UNSIGNED NOT NULL,
  attribute_id INT UNSIGNED NOT NULL,
  is_variant   TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'این صفت در ساخت تنوع محصول استفاده می‌شود (رنگ/حافظه)',
  is_required  TINYINT(1) NOT NULL DEFAULT 0,
  sort_order   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, attribute_id),
  CONSTRAINT fk_ca_cat FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_attr FOREIGN KEY (attribute_id) REFERENCES attributes (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='کدام صفت برای کدام دسته فعال است';

CREATE TABLE products (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code              VARCHAR(50)  NULL COMMENT 'کد محصول (مبنای فاکتور؛ با SKU تنوع متفاوت است)',
  category_id       INT UNSIGNED NOT NULL,
  brand_id          INT UNSIGNED NULL,
  name              VARCHAR(190) NOT NULL,
  slug              VARCHAR(220) NOT NULL,
  short_description VARCHAR(500) NULL,
  description       LONGTEXT NULL COMMENT 'توضیحات کامل (HTML امن‌شده)',
  features          JSON NULL COMMENT 'ویژگی‌های کلیدی (آرایه رشته‌ای بولت‌ها)',
  status            ENUM('draft','pending','published','archived') NOT NULL DEFAULT 'draft',
  published_at      DATETIME NULL,
  weight_g          INT UNSIGNED NULL,
  length_cm         DECIMAL(6,2) NULL,
  width_cm          DECIMAL(6,2) NULL,
  height_cm         DECIMAL(6,2) NULL,
  warranty_months   INT UNSIGNED NULL COMMENT 'مدت گارانتی',
  rating_avg        DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count      INT UNSIGNED NOT NULL DEFAULT 0,
  view_count        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  sold_count        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  min_price         BIGINT UNSIGNED NULL COMMENT 'کش قیمت برای لیست‌ها (ریال)',
  max_price         BIGINT UNSIGNED NULL,
  meta_title        VARCHAR(190) NULL,
  meta_description  VARCHAR(300) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  UNIQUE KEY uq_products_code (code),
  KEY idx_products_cat_status (category_id, status),
  KEY idx_products_brand (brand_id),
  KEY idx_products_published (status, published_at),
  CONSTRAINT fk_products_cat FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='محصولات (قیمت‌ها به ریال)';

CREATE TABLE product_variants (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id       BIGINT UNSIGNED NOT NULL,
  sku              VARCHAR(64)  NOT NULL COMMENT 'کد یکتای تنوع — مبنای فاکتور و انبار',
  barcode          VARCHAR(32)  NULL COMMENT 'EAN/UPC',
  title            VARCHAR(190) NULL COMMENT 'عنوان تولیدشده: «مشکی / ۱۲۸ گیگابایت»',
  price            BIGINT UNSIGNED NOT NULL COMMENT 'قیمت فروش (ریال)',
  compare_at_price BIGINT UNSIGNED NULL COMMENT 'قیمت قبل از تخفیف',
  cost_price       BIGINT UNSIGNED NULL COMMENT 'قیمت تمام‌شده (فقط ادمین)',
  stock_total      INT NOT NULL DEFAULT 0 COMMENT 'کش مجموع موجودی انبارها',
  weight_g         INT UNSIGNED NULL,
  is_default       TINYINT(1) NOT NULL DEFAULT 0,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_variants_sku (sku),
  KEY idx_variants_product (product_id, is_active),
  CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='تنوع‌های قابل‌فروش هر محصول';

CREATE TABLE product_variant_values (
  variant_id         BIGINT UNSIGNED NOT NULL,
  attribute_id       INT UNSIGNED NOT NULL,
  attribute_value_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (variant_id, attribute_id),
  CONSTRAINT fk_pvv_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
  CONSTRAINT fk_pvv_attr FOREIGN KEY (attribute_id) REFERENCES attributes (id) ON DELETE CASCADE,
  CONSTRAINT fk_pvv_value FOREIGN KEY (attribute_value_id) REFERENCES attribute_values (id) ON DELETE CASCADE,
  KEY idx_pvv_value (attribute_value_id)
) ENGINE=InnoDB COMMENT='مشخصات هر تنوع: variant × attribute → value';

CREATE TABLE product_images (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NULL COMMENT 'اگر تصویر مخصوص یک تنوع است',
  path       VARCHAR(500) NOT NULL COMMENT 'کلید در MinIO/S3',
  alt        VARCHAR(190) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pimg_product (product_id, sort_order),
  CONSTRAINT fk_pimg_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_pimg_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='گالری تصاویر';

CREATE TABLE product_videos (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(190) NULL,
  provider    ENUM('upload','youtube','aparat') NOT NULL DEFAULT 'upload',
  source_url  VARCHAR(500) NOT NULL COMMENT 'کلید فایل در S3 یا لینک خارجی',
  poster_path VARCHAR(500) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pvid_product (product_id, sort_order),
  CONSTRAINT fk_pvid_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='ویدئوهای محصول';

CREATE TABLE tags (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80)  NOT NULL,
  slug       VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_name (name),
  UNIQUE KEY uq_tags_slug (slug)
) ENGINE=InnoDB COMMENT='تگ‌های محصولات';

CREATE TABLE product_tags (
  product_id BIGINT UNSIGNED NOT NULL,
  tag_id     INT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, tag_id),
  KEY idx_pt_tag (tag_id),
  CONSTRAINT fk_pt_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_pt_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_relations (
  product_id         BIGINT UNSIGNED NOT NULL,
  related_product_id BIGINT UNSIGNED NOT NULL,
  type               ENUM('related','accessory','similar') NOT NULL DEFAULT 'related',
  sort_order         INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, related_product_id, type),
  KEY idx_prel_related (related_product_id),
  CONSTRAINT chk_prel_not_self CHECK (product_id <> related_product_id),
  CONSTRAINT fk_prel_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_prel_related FOREIGN KEY (related_product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='محصولات مرتبط / لوازم جانبی مرتبط';

CREATE TABLE product_attributes (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id         BIGINT UNSIGNED NOT NULL,
  attribute_id       INT UNSIGNED NOT NULL,
  attribute_value_id INT UNSIGNED NULL COMMENT 'برای صفت‌های select',
  custom_value       VARCHAR(500) NULL COMMENT 'مقدار آزاد (متن/عدد) — مشخصات فنی',
  sort_order         INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_pattr_product (product_id, sort_order),
  CONSTRAINT fk_pattr_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_pattr_attr FOREIGN KEY (attribute_id) REFERENCES attributes (id) ON DELETE CASCADE,
  CONSTRAINT fk_pattr_value FOREIGN KEY (attribute_value_id) REFERENCES attribute_values (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='مشخصات فنی محصول (مقادیر صفت‌ها)';

-- ============================================================================
-- 3) انبار و موجودی (Inventory)
-- ============================================================================

CREATE TABLE warehouses (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(30)  NOT NULL,
  province    VARCHAR(50)  NULL,
  city        VARCHAR(50)  NULL,
  address     TEXT         NULL,
  postal_code VARCHAR(10)  NULL,
  phone       VARCHAR(15)  NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouses_code (code)
) ENGINE=InnoDB;

CREATE TABLE inventory (
  variant_id           BIGINT UNSIGNED NOT NULL,
  warehouse_id         INT UNSIGNED NOT NULL,
  quantity             INT NOT NULL DEFAULT 0 COMMENT 'موجودی فیزیکی',
  reserved             INT NOT NULL DEFAULT 0 COMMENT 'رزرو سفارش‌های در جریان | قابل‌فروش = quantity - reserved',
  low_stock_threshold  INT NOT NULL DEFAULT 5,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (variant_id, warehouse_id),
  CONSTRAINT fk_inv_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='موجودی هر تنوع در هر انبار';

CREATE TABLE stock_movements (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  variant_id     BIGINT UNSIGNED NOT NULL,
  warehouse_id   INT UNSIGNED NOT NULL,
  type           ENUM('in','out','reserve','release','return','adjust') NOT NULL,
  quantity       INT NOT NULL COMMENT 'مثبت؛ جهت حرکت از نوع رکورد مشخص است',
  qty_before     INT NOT NULL,
  qty_after      INT NOT NULL,
  reference_type VARCHAR(30) NULL COMMENT 'order, manual, import, return',
  reference_id   BIGINT UNSIGNED NULL,
  note           VARCHAR(500) NULL,
  created_by     BIGINT UNSIGNED NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sm_variant (variant_id, created_at),
  KEY idx_sm_ref (reference_type, reference_id),
  CONSTRAINT fk_sm_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
  CONSTRAINT fk_sm_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE CASCADE,
  CONSTRAINT fk_sm_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='لاگ کامل گردش انبار (audit trail)';

-- ============================================================================
-- 4) سبد خرید و کوپن (Cart & Coupons)
-- ============================================================================

CREATE TABLE coupons (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code             VARCHAR(50) NOT NULL,
  title            VARCHAR(120) NULL,
  type             ENUM('percent','fixed') NOT NULL,
  value            DECIMAL(10,2) NOT NULL COMMENT 'درصد یا مبلغ ثابت (ریال)',
  max_discount     BIGINT UNSIGNED NULL COMMENT 'سقف تخفیف برای نوع درصدی (ریال)',
  min_cart_amount  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  usage_limit      INT UNSIGNED NULL COMMENT 'حداکثر استفاده کل',
  per_user_limit   INT UNSIGNED NOT NULL DEFAULT 1,
  used_count       INT UNSIGNED NOT NULL DEFAULT 0,
  starts_at        DATETIME NULL,
  expires_at       DATETIME NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupons_code (code)
) ENGINE=InnoDB;

CREATE TABLE carts (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NULL COMMENT 'NULL = سبد مهمان',
  session_id CHAR(36) NULL COMMENT 'شناسه سبد مهمان (ckart cookie)',
  status     ENUM('open','merged','converted','abandoned') NOT NULL DEFAULT 'open',
  coupon_id  INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_carts_user (user_id, status),
  KEY idx_carts_session (session_id, status),
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_carts_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='سبدهای باز (داده داغ در Redis، پایداری در MySQL)';

CREATE TABLE cart_items (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_id    BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,
  quantity   INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price BIGINT UNSIGNED NOT NULL COMMENT 'قیمت لحظه افزودن به سبد',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_item (cart_id, variant_id),
  CONSTRAINT fk_ci_cart FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 5) سفارش و پرداخت (Orders & Payments)
-- ============================================================================

CREATE TABLE orders (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code             VARCHAR(20) NOT NULL COMMENT 'شماره سفارش نمایشی: KRZ-2026-000001',
  user_id          BIGINT UNSIGNED NOT NULL,
  status           ENUM('pending_payment','paid','processing','ready_to_ship','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending_payment',
  payment_status   ENUM('unpaid','paid','failed','partially_refunded','refunded') NOT NULL DEFAULT 'unpaid',
  subtotal         BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'جمع اقلام',
  discount_total   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  shipping_cost    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  tax_total        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  grand_total      BIGINT UNSIGNED NOT NULL DEFAULT 0,
  coupon_id        INT UNSIGNED NULL,
  coupon_code      VARCHAR(50) NULL COMMENT 'اسنپ‌شات کد کوپن',
  shipping_method  VARCHAR(100) NULL COMMENT 'پست پیشتاز، تیپاکس، ...',
  address_json     JSON NOT NULL COMMENT 'اسنپ‌شات آدرس تحویل در لحظه ثبت',
  customer_note    TEXT NULL,
  admin_note       TEXT NULL,
  ip               VARCHAR(45) NULL,
  user_agent       VARCHAR(255) NULL,
  placed_at        DATETIME NULL,
  paid_at          DATETIME NULL,
  delivered_at     DATETIME NULL,
  cancelled_at     DATETIME NULL,
  cancel_reason    VARCHAR(300) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_code (code),
  KEY idx_orders_user (user_id, created_at),
  KEY idx_orders_status (status, created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id        BIGINT UNSIGNED NOT NULL,
  product_id      BIGINT UNSIGNED NOT NULL,
  variant_id      BIGINT UNSIGNED NOT NULL,
  sku             VARCHAR(64)  NOT NULL COMMENT 'اسنپ‌شات',
  product_name    VARCHAR(190) NOT NULL COMMENT 'اسنپ‌شات',
  variant_title   VARCHAR(190) NULL,
  unit_price      BIGINT UNSIGNED NOT NULL,
  quantity        INT UNSIGNED NOT NULL,
  discount_amount BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_price     BIGINT UNSIGNED NOT NULL COMMENT 'unit_price*qty - discount',
  warranty_months INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_oi_order (order_id),
  KEY idx_oi_variant (variant_id),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
  CONSTRAINT fk_oi_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE order_status_histories (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id   BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(30) NULL,
  to_status   VARCHAR(30) NOT NULL,
  note        VARCHAR(500) NULL,
  changed_by  BIGINT UNSIGNED NULL COMMENT 'کاربر ادمین؛ NULL = سیستم',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_osh_order (order_id, created_at),
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_osh_user FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='تاریخچه وضعیت سفارش (state machine log)';

CREATE TABLE payments (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    BIGINT UNSIGNED NULL COMMENT 'پرداخت سفارش؛ NULL برای شارژ کیف پول',
  purpose     ENUM('order','wallet_charge') NOT NULL DEFAULT 'order',
  gateway     ENUM('zarinpal','idpay','zibal','nextpay','manual','wallet','cod') NOT NULL,
  amount      BIGINT UNSIGNED NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'IRR',
  status      ENUM('initiated','pending','paid','failed','cancelled','refunded') NOT NULL DEFAULT 'initiated',
  authority   VARCHAR(100) NULL COMMENT 'شناسه تراکنش درگاه',
  ref_id      VARCHAR(100) NULL COMMENT 'شماره مرجع بانکی',
  card_pan    VARCHAR(20)  NULL COMMENT 'ماسک‌شده',
  fee         BIGINT UNSIGNED NULL,
  payload     JSON NULL COMMENT 'پاسخ خام درگاه',
  paid_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pay_order (order_id),
  UNIQUE KEY uq_pay_authority (gateway, authority),
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='تراکنش‌ها (idempotent روی gateway+authority)';

CREATE TABLE shipments (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  provider      VARCHAR(50) NOT NULL DEFAULT 'post' COMMENT 'post, tipax, chapar, mahex',
  method        VARCHAR(100) NULL,
  tracking_code VARCHAR(50) NULL,
  status        ENUM('pending','picked_up','in_transit','delivered','returned') NOT NULL DEFAULT 'pending',
  cost          BIGINT UNSIGNED NULL,
  shipped_at    DATETIME NULL,
  delivered_at  DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ship_order (order_id),
  CONSTRAINT fk_ship_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE coupon_usages (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  coupon_id       INT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  order_id        BIGINT UNSIGNED NOT NULL,
  discount_amount BIGINT UNSIGNED NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cu_order (coupon_id, order_id),
  KEY idx_cu_user (coupon_id, user_id),
  CONSTRAINT fk_cu_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE CASCADE,
  CONSTRAINT fk_cu_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_cu_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5-الف) کیف پول (Wallet — اختیاری)
CREATE TABLE wallets (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  balance    BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'موجودی (ریال)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallets_user (user_id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='کیف پول کاربران';

CREATE TABLE wallet_transactions (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wallet_id      BIGINT UNSIGNED NOT NULL,
  type           ENUM('charge','debit','refund','withdraw') NOT NULL,
  amount         BIGINT UNSIGNED NOT NULL,
  balance_after  BIGINT UNSIGNED NOT NULL,
  reference_type VARCHAR(30) NULL COMMENT 'order | payment',
  reference_id   BIGINT UNSIGNED NULL,
  description    VARCHAR(300) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wt_wallet (wallet_id, created_at),
  CONSTRAINT fk_wt_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='تراکنش‌های کیف پول';

-- ============================================================================
-- 6) بازخورد و تعامل (Reviews / Q&A / Wishlist)
-- ============================================================================

CREATE TABLE reviews (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id    BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NULL COMMENT 'اگر از روی خرید ثبت شده → برچسب «خریدار»',
  rating        TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         VARCHAR(150) NULL,
  body          TEXT NULL,
  pros          JSON NULL COMMENT 'نقاط قوت',
  cons          JSON NULL COMMENT 'نقاط ضعف',
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  seller_reply  TEXT NULL,
  replied_at    DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_user_product (product_id, user_id),
  KEY idx_reviews_product (product_id, status, created_at),
  CONSTRAINT fk_rev_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_order_item FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='دیدگاه‌ها (با تایید مدیریت منتشر می‌شوند)';

CREATE TABLE product_questions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  question    TEXT NOT NULL,
  answer      TEXT NULL,
  answered_by BIGINT UNSIGNED NULL,
  status      ENUM('pending','answered','approved','rejected') NOT NULL DEFAULT 'pending',
  answered_at DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pq_product (product_id, status),
  CONSTRAINT fk_pq_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_pq_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_pq_answerer FOREIGN KEY (answered_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='پرسش و پاسخ محصول';

CREATE TABLE wishlists (
  user_id    BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_wl_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_wl_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='علاقه‌مندی‌ها';

-- ============================================================================
-- 7) بازاریابی و مدیریت محتوا (CMS)
-- ============================================================================

CREATE TABLE banners (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title             VARCHAR(150) NOT NULL,
  subtitle          VARCHAR(300) NULL,
  image_path        VARCHAR(500) NOT NULL,
  mobile_image_path VARCHAR(500) NULL,
  link_url          VARCHAR(500) NULL,
  position          ENUM('home_hero','home_middle','home_bottom','category_top','sidebar') NOT NULL DEFAULT 'home_hero',
  sort_order        INT NOT NULL DEFAULT 0,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  starts_at         DATETIME NULL,
  ends_at           DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_banners_slot (position, is_active, sort_order)
) ENGINE=InnoDB COMMENT='بنرها و اسلایدرها';

CREATE TABLE pages (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title            VARCHAR(190) NOT NULL,
  slug             VARCHAR(220) NOT NULL,
  body             LONGTEXT NOT NULL,
  status           ENUM('draft','published') NOT NULL DEFAULT 'draft',
  meta_title       VARCHAR(190) NULL,
  meta_description VARCHAR(300) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pages_slug (slug)
) ENGINE=InnoDB COMMENT='صفحات ثابت: درباره ما، تماس، شرایط، ...';

CREATE TABLE tickets (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  order_id   BIGINT UNSIGNED NULL,
  subject    VARCHAR(190) NOT NULL,
  department ENUM('sales','support','technical','financial','other') NOT NULL DEFAULT 'support',
  priority   ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  status     ENUM('open','pending_support','pending_customer','closed') NOT NULL DEFAULT 'open',
  closed_at  DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tk_user (user_id, status),
  KEY idx_tk_status (status, priority),
  CONSTRAINT fk_tk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_tk_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='تیکت‌های پشتیبانی';

CREATE TABLE ticket_messages (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id   BIGINT UNSIGNED NOT NULL,
  sender_id   BIGINT UNSIGNED NOT NULL,
  body        TEXT NOT NULL,
  attachments JSON NULL COMMENT 'لیست file_id ها',
  is_internal TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'یادداشت داخلی ادمین (به کاربر نشان داده نمی‌شود)',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tm_ticket (ticket_id, created_at),
  CONSTRAINT fk_tm_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 8) زیرساخت: فایل‌ها، اعلان‌ها، تنظیمات، لاگ
-- ============================================================================

CREATE TABLE files (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  disk          VARCHAR(20) NOT NULL DEFAULT 's3',
  path          VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NULL,
  mime_type     VARCHAR(100) NULL,
  size_bytes    BIGINT UNSIGNED NULL,
  purpose       VARCHAR(50) NULL COMMENT 'product_image, banner, avatar, invoice, ...',
  owner_id      BIGINT UNSIGNED NULL COMMENT 'کاربر آپلودکننده',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_files_path (disk, path),
  CONSTRAINT fk_files_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='ثبت فایل‌های MinIO/S3';

CREATE TABLE notifications (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       VARCHAR(50) NOT NULL COMMENT 'order.paid, order.shipped, ticket.replied, ...',
  title      VARCHAR(190) NOT NULL,
  body       VARCHAR(500) NULL,
  data       JSON NULL COMMENT 'لینک و شناسه‌های مرتبط',
  channel    ENUM('database','sms','email','push') NOT NULL DEFAULT 'database',
  read_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id, read_at, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE settings (
  `key`       VARCHAR(100) NOT NULL,
  `value`     MEDIUMTEXT NULL,
  `group`     VARCHAR(50) NOT NULL DEFAULT 'general',
  type        ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
  is_public   TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'true = از طریق API عمومی قابل خواندن',
  updated_by  BIGINT UNSIGNED NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`),
  CONSTRAINT fk_settings_user FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='تنظیمات فروشگاه (کش در Redis)';

CREATE TABLE audit_logs (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NULL,
  action       VARCHAR(100) NOT NULL COMMENT 'product.create, order.update_status, ...',
  subject_type VARCHAR(50) NULL,
  subject_id   BIGINT UNSIGNED NULL,
  old_values   JSON NULL,
  new_values   JSON NULL,
  ip           VARCHAR(45) NULL,
  user_agent   VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_subject (subject_type, subject_id),
  KEY idx_audit_user (user_id, created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='ردیابی تمام عملیات حساس پنل ادمین';

-- ============================================================================
-- 9) داده‌های اولیه (Seeds)
-- ============================================================================

-- 9-1) نقش‌ها (پنل اپراتور: هر نقش دسترسی مخصوص خود را دارد)
INSERT INTO roles (id, name, label, description, is_system) VALUES
  (1, 'super_admin',    'مدیر ارشد (Admin)', 'دسترسی کامل به همه بخش‌ها؛ قابل حذف نیست', 1),
  (2, 'product_manager','مدیر محصول', 'ثبت و ویرایش محصولات، دسته‌ها، برندها و موجودی', 1),
  (3, 'order_manager',  'مدیر سفارش', 'مدیریت سفارش‌ها، پرداخت‌ها و بازپرداخت', 1),
  (4, 'support',        'پشتیبانی', 'پاسخ به تیکت‌ها و مشاهده سفارش‌ها و مشتریان', 1),
  (5, 'content_manager','مدیر محتوا', 'مدیریت بنرها، صفحات سایت، دیدگاه‌ها و پرسش‌ها', 1),
  (6, 'warehouse',      'انباردار', 'مدیریت موجودی و انبار', 1),
  (7, 'customer',       'مشتری', 'کاربر عادی فروشگاه (بدون دسترسی پنل ادمین)', 1);

-- 9-2) مجوزها
INSERT INTO permissions (name, label, group_name) VALUES
  ('dashboard.view',      'مشاهده داشبورد',               'dashboard'),
  ('users.view',          'مشاهده کاربران',               'users'),
  ('users.create',        'ایجاد کاربر',                  'users'),
  ('users.update',        'ویرایش کاربر',                 'users'),
  ('users.delete',        'حذف کاربر',                    'users'),
  ('users.assign_role',   'تخصیص نقش به کاربر',           'users'),
  ('roles.view',          'مشاهده نقش‌ها',                'roles'),
  ('roles.create',        'ایجاد نقش',                    'roles'),
  ('roles.update',        'ویرایش نقش و مجوزها',          'roles'),
  ('roles.delete',        'حذف نقش',                      'roles'),
  ('products.view',       'مشاهده محصولات',               'products'),
  ('products.create',     'ایجاد محصول',                  'products'),
  ('products.update',     'ویرایش محصول',                 'products'),
  ('products.delete',     'حذف محصول',                    'products'),
  ('products.publish',    'انتشار محصول',                 'products'),
  ('categories.manage',   'مدیریت دسته‌بندی‌ها',          'catalog'),
  ('brands.manage',       'مدیریت برندها',                'catalog'),
  ('attributes.manage',   'مدیریت صفت‌ها',                'catalog'),
  ('inventory.view',      'مشاهده موجودی',                'inventory'),
  ('inventory.manage',    'اصلاح موجودی انبار',           'inventory'),
  ('orders.view',         'مشاهده سفارش‌ها',              'orders'),
  ('orders.update_status','تغییر وضعیت سفارش',            'orders'),
  ('orders.cancel',       'لغو سفارش',                    'orders'),
  ('orders.refund',       'عودت وجه',                     'orders'),
  ('payments.view',       'مشاهده تراکنش‌ها',             'payments'),
  ('customers.view',      'مشاهده مشتریان',               'customers'),
  ('customers.manage',    'مدیریت مشتریان',               'customers'),
  ('reviews.moderate',    'تایید/رد دیدگاه‌ها',           'moderation'),
  ('questions.moderate',  'پاسخ به پرسش‌ها',              'moderation'),
  ('coupons.manage',      'مدیریت کدهای تخفیف',           'marketing'),
  ('banners.manage',      'مدیریت بنرها',                 'marketing'),
  ('pages.manage',        'مدیریت صفحات محتوایی',         'marketing'),
  ('tickets.view',        'مشاهده تیکت‌ها',               'tickets'),
  ('tickets.reply',       'پاسخ به تیکت‌ها',              'tickets'),
  ('settings.manage',     'مدیریت تنظیمات',               'settings'),
  ('audit.view',          'مشاهده لاگ عملیات',            'settings'),
  ('files.manage',        'مدیریت فایل‌ها',               'settings'),
  ('reports.view',        'مشاهده گزارش‌ها',              'reports');

-- 9-3) سوپر ادمین → همه مجوزها
INSERT INTO permission_role (permission_id, role_id)
  SELECT p.id, 1 FROM permissions p;

-- 9-4) مدیر محصول (فقط محصولات/کاتالوگ/موجودی)
INSERT INTO permission_role (permission_id, role_id)
  SELECT p.id, 2 FROM permissions p WHERE p.name IN (
    'dashboard.view',
    'products.view','products.create','products.update','products.delete','products.publish',
    'categories.manage','brands.manage','attributes.manage',
    'inventory.view','inventory.manage',
    'files.manage'
  );

-- 9-5) مدیر سفارش
INSERT INTO permission_role (permission_id, role_id)
  SELECT p.id, 3 FROM permissions p WHERE p.name IN (
    'dashboard.view',
    'orders.view','orders.update_status','orders.cancel','orders.refund',
    'payments.view','customers.view','inventory.view','reports.view'
  );

-- 9-6) پشتیبانی
INSERT INTO permission_role (permission_id, role_id)
  SELECT p.id, 4 FROM permissions p WHERE p.name IN (
    'dashboard.view','orders.view','customers.view','tickets.view','tickets.reply'
  );

-- 9-7) مدیر محتوا (بنر/صفحات/دیدگاه‌ها)
INSERT INTO permission_role (permission_id, role_id)
  SELECT p.id, 5 FROM permissions p WHERE p.name IN (
    'dashboard.view','banners.manage','pages.manage',
    'reviews.moderate','questions.moderate','files.manage'
  );

-- 9-8) انباردار
INSERT INTO permission_role (permission_id, role_id)
  SELECT p.id, 6 FROM permissions p WHERE p.name IN (
    'dashboard.view','products.view','orders.view','inventory.view','inventory.manage'
  );

-- 9-9) کاربر ادمین پیش‌فرض
--     phone: 09000000000 | email: admin@karzintell.ir | رمز عبور: Admin@123456
--     ⚠️ must_change_password=1 → در اولین ورود باید رمز عوض شود.
INSERT INTO users (id, full_name, email, phone, password_hash, status, must_change_password, email_verified_at, phone_verified_at) VALUES
  (1, 'مدیر ارشد کارزینتل', 'admin@karzintell.ir', '09000000000',
   '$2b$10$vxD6yVP65LLh1VQlYVr3quLFrO0VWVSeOM2yLblW.DC4bnaxyH5Pm',
   'active', 1, NOW(), NOW());

INSERT INTO role_user (role_id, user_id, assigned_by) VALUES (1, 1, 1);

-- 9-10) انبار پیش‌فرض
INSERT INTO warehouses (id, name, code, province, city) VALUES
  (1, 'انبار مرکزی', 'MAIN', 'تهران', 'تهران');

-- 9-11) نمونه دسته‌بندی‌ها (فروشگاه قطعات الکترونیک)
INSERT INTO categories (id, parent_id, name, slug, is_active, sort_order) VALUES
  (1, NULL, 'موبایل',            'mobile',           1, 1),
  (2, NULL, 'کامپیوتر و لپ‌تاپ', 'computer-laptop',  1, 2),
  (3, NULL, 'ساعت و مچ‌بند هوشمند','smartwatch',     1, 3),
  (4, NULL, 'صوتی (هدفون و اسپیکر)','audio',         1, 4),
  (5, NULL, 'لوازم جانبی',        'accessories',     1, 5),
  (6, 1,    'گوشی هوشمند',        'smartphones',     1, 1),
  (7, 1,    'قطعات و تعمیرات موبایل','mobile-parts', 1, 2);

-- 9-12) نمونه برندها
INSERT INTO brands (name, slug, is_active, sort_order) VALUES
  ('اپل',    'apple',   1, 1),
  ('سامسونگ','samsung', 1, 2),
  ('شیائومی','xiaomi',  1, 3),
  ('هوآوی',  'huawei',  1, 4),
  ('انکر',   'anker',   1, 5);

-- 9-13) نمونه صفت‌ها و مقادیر
INSERT INTO attributes (id, name, code, type, unit, is_filterable) VALUES
  (1, 'رنگ',          'color',     'select', NULL, 1),
  (2, 'حافظه داخلی',  'storage',   'select', 'GB', 1),
  (3, 'حافظه رم',     'ram',       'select', 'GB', 1),
  (4, 'اندازه صفحه‌نمایش','screen_size','number','inch',1);

INSERT INTO attribute_values (attribute_id, value, sort_order) VALUES
  (1,'مشکی',1),(1,'سفید',2),(1,'آبی',3),(1,'بنفش',4),
  (2,'64',1),(2,'128',2),(2,'256',3),(2,'512',4),
  (3,'4',1),(3,'6',2),(3,'8',3),(3,'12',4);

-- اتصال صفت‌ها به دسته «گوشی هوشمند»: رنگ و حافظه → سازنده تنوع
INSERT INTO category_attribute (category_id, attribute_id, is_variant, is_required, sort_order) VALUES
  (6, 1, 1, 0, 1),
  (6, 2, 1, 0, 2),
  (6, 3, 0, 0, 3),
  (6, 4, 0, 0, 4),
  (3, 1, 1, 0, 1);

-- 9-14) تنظیمات پایه فروشگاه
INSERT INTO settings (`key`, `value`, `group`, type, is_public) VALUES
  ('store.name',            'کارزینتل',          'general', 'string', 1),
  ('store.name_en',         'Karzintell',        'general', 'string', 1),
  ('store.currency',        'IRR',               'general', 'string', 1),
  ('store.tax_percent',     '9',                 'billing', 'number', 0),
  ('store.default_warehouse_id','1',             'inventory','number',0),
  ('store.free_shipping_threshold','0',          'shipping','number', 1),
  ('store.support_phone',   '',                  'general', 'string', 1),
  ('search.engine',         'meilisearch',       'infra',   'string', 0);

-- ============================================================================
-- پایان اسکیما — 48 جدول
-- ============================================================================
