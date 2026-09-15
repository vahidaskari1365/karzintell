import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * اضافه‌کردن پنل فروشنده (Vendor/Seller) به کارزینتل
 *
 * این migration:
 * 1. جدول seller_profiles می‌سازد (پروفایل فروشنده‌ها با اطلاعات فروشگاه)
 * 2. ستون seller_id را به جدول products اضافه می‌کند (برای مالکیت محصول)
 * 3. نقش "seller" و مجوزهای مربوطه را در RBAC ثبت می‌کند
 *
 * Schema واقعی دیتابیس (بررسی شده روی هاست):
 *   roles: id, name, label, description, is_system, created_at, updated_at
 *   permissions: id, name, label, group_name, created_at, updated_at
 *   permission_role: permission_id, role_id
 *   role_user: role_id, user_id, assigned_by, created_at
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
    // بررسی وجود ستون قبل از اضافه‌کردن (پشتیبانی از MariaDB که IF NOT EXISTS ندارد در ALTER TABLE)
    const productColumns = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'seller_id'`
    );

    if (!productColumns || productColumns.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`products\`
        ADD COLUMN \`seller_id\` INT UNSIGNED NULL AFTER \`brand_id\`
      `);
      await queryRunner.query(`
        CREATE INDEX \`idx_products_seller\` ON \`products\` (\`seller_id\`)
      `);
    }

    // ───────────────────────────────────────────────────────────────────────
    // 3) ثبت نقش seller در RBAC (اگر قبلاً ثبت نشده باشد)
    // ───────────────────────────────────────────────────────────────────────
    // Schema واقعی: roles(id, name, label, description, is_system, ...)
    const existingSellerRole = await queryRunner.query(
      `SELECT id FROM \`roles\` WHERE \`name\` = 'seller' LIMIT 1`
    );

    let sellerRoleId: number;
    if (!existingSellerRole || existingSellerRole.length === 0) {
      await queryRunner.query(`
        INSERT INTO \`roles\` (\`name\`, \`label\`, \`description\`, \`is_system\`, \`created_at\`, \`updated_at\`)
        VALUES (
          'seller',
          'فروشنده',
          'فروشنده محصولاتی را در فروشگاه قرار می‌دهد و سفارش‌های خود را مدیریت می‌کند',
          1,
          NOW(),
          NOW()
        )
      `);
      const newRole = await queryRunner.query(`SELECT LAST_INSERT_ID() AS id`);
      sellerRoleId = newRole[0].id;
    } else {
      sellerRoleId = existingSellerRole[0].id;
    }

    // ───────────────────────────────────────────────────────────────────────
    // 4) ثبت permission های seller
    // ───────────────────────────────────────────────────────────────────────
    // Schema واقعی: permissions(id, name, label, group_name, ...)
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

    for (const [name, label, groupName] of sellerPerms) {
      await queryRunner.query(
        `INSERT INTO \`permissions\` (\`name\`, \`label\`, \`group_name\`, \`created_at\`, \`updated_at\`)
         SELECT ?, ?, ?, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM \`permissions\` WHERE \`name\` = ?)`,
        [name, label, groupName, name],
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // 5) اتصال permission های seller به نقش seller
    // ───────────────────────────────────────────────────────────────────────
    // Schema واقعی: permission_role(permission_id, role_id)
    await queryRunner.query(`
      INSERT IGNORE INTO \`permission_role\` (\`permission_id\`, \`role_id\`)
      SELECT p.id, r.id
      FROM \`permissions\` p
      CROSS JOIN \`roles\` r
      WHERE r.name = 'seller'
        AND p.\`name\` LIKE 'seller.%'
    `);

    // 6) اضافه‌کردن permission files.manage به seller
    await queryRunner.query(`
      INSERT IGNORE INTO \`permission_role\` (\`permission_id\`, \`role_id\`)
      SELECT p.id, r.id
      FROM \`permissions\` p
      CROSS JOIN \`roles\` r
      WHERE r.name = 'seller'
        AND p.\`name\` = 'files.manage'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // حذف permission های seller از permission_role
    await queryRunner.query(`
      DELETE pr FROM \`permission_role\` pr
      INNER JOIN \`permissions\` p ON pr.permission_id = p.id
      INNER JOIN \`roles\` r ON pr.role_id = r.id
      WHERE r.name = 'seller' OR p.\`name\` LIKE 'seller.%'
    `);

    // حذف permission های seller
    await queryRunner.query(`DELETE FROM \`permissions\` WHERE \`name\` LIKE 'seller.%'`);

    // حذف نقش seller
    await queryRunner.query(`DELETE FROM \`roles\` WHERE \`name\` = 'seller'`);

    // حذف seller_id از products
    await queryRunner.query(`ALTER TABLE \`products\` DROP INDEX \`idx_products_seller\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`seller_id\``);

    // حذف جدول seller_profiles
    await queryRunner.query(`DROP TABLE IF EXISTS \`seller_profiles\``);
  }
}
