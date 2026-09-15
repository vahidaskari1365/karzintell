import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * اضافه‌کردن پنل فروشنده (Vendor/Seller) به کارزینتل
 *
 * این migration:
 * 1. جدول seller_profiles می‌سازد (پروفایل فروشنده‌ها با اطلاعات فروشگاه)
 * 2. ستون seller_id را به جدول products اضافه می‌کند (برای مالکیت محصول)
 * 3. نقش "seller" و مجوزهای مربوطه را در RBAC ثبت می‌کند
 * 4. سیستم قبلی seed را به‌روزرسانی می‌کند تا نقش seller را شامل شود
 *
 * Idempotent است — اگر اجرا شود، چیزی را overwrite نمی‌کند.
 */
export class AddSellerPanel1726300800000 implements MigrationInterface {
  name = 'AddSellerPanel1726300800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ───────────────────────────────────────────────────────────────────────
    // 1) ایجاد جدول seller_profiles
    // ───────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`seller_profiles\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`store_name\` VARCHAR(190) NOT NULL,
        \`store_slug\` VARCHAR(190) NOT NULL,
        \`description\` TEXT NULL,
        \`logo_path\` VARCHAR(500) NULL,
        \`phone\` VARCHAR(20) NULL,
        \`email\` VARCHAR(190) NULL,
        \`address\` TEXT NULL,
        \`economic_code\` VARCHAR(50) NULL,
        \`registration_number\` VARCHAR(50) NULL,
        \`national_id\` VARCHAR(20) NULL,
        \`commission_rate\` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
        \`rejection_reason\` TEXT NULL,
        \`reviewed_by\` INT UNSIGNED NULL,
        \`reviewed_at\` DATETIME NULL,
        \`product_count\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`rating_avg\` DECIMAL(3,2) NOT NULL DEFAULT 0.00,
        \`rating_count\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`is_featured\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_seller_user\` (\`user_id\`),
        UNIQUE KEY \`idx_seller_slug\` (\`store_slug\`),
        KEY \`idx_seller_status\` (\`status\`),
        KEY \`idx_seller_featured\` (\`is_featured\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ───────────────────────────────────────────────────────────────────────
    // 2) اضافه‌کردن ستون seller_id به جدول products
    // ───────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE \`products\`
      ADD COLUMN IF NOT EXISTS \`seller_id\` INT UNSIGNED NULL AFTER \`brand_id\`
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS \`idx_products_seller\` ON \`products\` (\`seller_id\`)
    `);

    // ───────────────────────────────────────────────────────────────────────
    // 3) ثبت نقش seller در RBAC (اگر قبلاً ثبت نشده باشد)
    // ───────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO \`roles\` (\`id\`, \`name\`, \`title\`, \`description\`, \`is_system\`, \`created_at\`, \`updated_at\`)
      SELECT 8, 'seller', 'فروشنده',
             'فروشنده محصولاتی را در فروشگاه قرار می‌دهد و سفارش‌های خود را مدیریت می‌کند',
             1, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM \`roles\` WHERE \`name\` = 'seller')
    `);

    // ───────────────────────────────────────────────────────────────────────
    // 4) ثبت permission های seller
    // ───────────────────────────────────────────────────────────────────────
    const sellerPerms = [
      ['seller.dashboard', 'داشبورد فروشنده', 'seller'],
      ['seller.products.view', 'مشاهده محصولات خود', 'seller'],
      ['seller.products.create', 'ایجاد محصول', 'seller'],
      ['seller.products.update', 'ویرایش محصول خود', 'seller'],
      ['seller.products.delete', 'حذف محصول خود', 'seller'],
      ['seller.orders.view', 'مشاهده سفارش‌های محصول خود', 'seller'],
      ['seller.orders.update_status', 'به‌روزرسانی وضعیت ارسال', 'seller'],
      ['seller.profile.manage', 'ویرایش پروفایل فروشندگی', 'seller'],
      ['seller.payouts.view', 'مشاهده تسویه‌ها', 'seller'],
    ];

    for (const [key, title, group] of sellerPerms) {
      await queryRunner.query(
        `INSERT INTO \`permissions\` (\`key\`, \`title\`, \`group_name\`, \`created_at\`, \`updated_at\`)
         SELECT ?, ?, ?, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM \`permissions\` WHERE \`key\` = ?)`,
        [key, title, group, key],
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // 5) اتصال permission های seller به نقش seller
    // ───────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO \`permission_roles\` (\`permission_id\`, \`role_id\`)
      SELECT p.id, r.id
      FROM \`permissions\` p
      CROSS JOIN \`roles\` r
      WHERE r.name = 'seller'
        AND p.\`key\` LIKE 'seller.%'
        AND NOT EXISTS (
          SELECT 1 FROM \`permission_roles\` pr
          WHERE pr.permission_id = p.id AND pr.role_id = r.id
        )
    `);

    // 6) اضافه‌کردن permission files.manage به seller
    await queryRunner.query(`
      INSERT INTO \`permission_roles\` (\`permission_id\`, \`role_id\`)
      SELECT p.id, r.id
      FROM \`permissions\` p
      CROSS JOIN \`roles\` r
      WHERE r.name = 'seller'
        AND p.\`key\` = 'files.manage'
        AND NOT EXISTS (
          SELECT 1 FROM \`permission_roles\` pr
          WHERE pr.permission_id = p.id AND pr.role_id = r.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // حذف permission های seller از permission_roles
    await queryRunner.query(`
      DELETE pr FROM \`permission_roles\` pr
      INNER JOIN \`permissions\` p ON pr.permission_id = p.id
      INNER JOIN \`roles\` r ON pr.role_id = r.id
      WHERE r.name = 'seller' OR p.\`key\` LIKE 'seller.%'
    `);

    // حذف permission های seller
    await queryRunner.query(`DELETE FROM \`permissions\` WHERE \`key\` LIKE 'seller.%'`);

    // حذف نقش seller
    await queryRunner.query(`DELETE FROM \`roles\` WHERE \`name\` = 'seller'`);

    // حذف seller_id از products
    await queryRunner.query(`ALTER TABLE \`products\` DROP INDEX \`idx_products_seller\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`seller_id\``);

    // حذف جدول seller_profiles
    await queryRunner.query(`DROP TABLE IF EXISTS \`seller_profiles\``);
  }
}
