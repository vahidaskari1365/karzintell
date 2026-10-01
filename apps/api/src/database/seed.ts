/**
 * MySQL/MariaDB seed: roles, permissions, one admin, a warehouse and
 * optional demo data. It is idempotent and never contains a password literal.
 * Run with SEED_ADMIN_PASSWORD supplied through the environment, or leave it
 * empty to print a generated one-time password once.
 */
import 'dotenv/config';
import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ALL_ENTITIES } from './entities';
import { env } from '../config/configuration';
import { dbQuery } from '../common/utils';

function tempPassword(): string {
  // Only used when SEED_ADMIN_PASSWORD/SEED_EXTRA_SUPER_ADMIN_PASSWORD is not set.
  return randomBytes(12).toString('base64url');
}

const PERMISSIONS: Array<[string, string, string]> = [
  ['dashboard.view', 'مشاهده داشبورد', 'dashboard'], ['users.view', 'مشاهده کاربران', 'users'],
  ['users.create', 'ایجاد کاربر', 'users'], ['users.update', 'ویرایش کاربر', 'users'],
  ['users.delete', 'حذف کاربر', 'users'], ['users.assign_role', 'تخصیص نقش به کاربر', 'users'],
  ['roles.view', 'مشاهده نقش‌ها', 'roles'], ['roles.create', 'ایجاد نقش', 'roles'],
  ['roles.update', 'ویرایش نقش و مجوزها', 'roles'], ['roles.delete', 'حذف نقش', 'roles'],
  ['products.view', 'مشاهده محصولات', 'products'], ['products.create', 'ایجاد محصول', 'products'],
  ['products.update', 'ویرایش محصول', 'products'], ['products.delete', 'حذف محصول', 'products'],
  ['products.publish', 'انتشار محصول', 'products'], ['categories.manage', 'مدیریت دسته‌بندی‌ها', 'catalog'],
  ['brands.manage', 'مدیریت برندها', 'catalog'], ['attributes.manage', 'مدیریت صفت‌ها', 'catalog'],
  ['inventory.view', 'مشاهده موجودی', 'inventory'], ['inventory.manage', 'اصلاح موجودی انبار', 'inventory'],
  ['inventory.alerts', 'دریافت هشدار موجودی', 'inventory'], ['orders.view', 'مشاهده سفارش‌ها', 'orders'],
  ['orders.update_status', 'تغییر وضعیت سفارش', 'orders'], ['orders.cancel', 'لغو سفارش', 'orders'],
  ['orders.refund', 'عودت وجه', 'orders'], ['payments.view', 'مشاهده تراکنش‌ها', 'payments'],
  ['customers.view', 'مشاهده مشتریان', 'customers'], ['customers.manage', 'مدیریت مشتریان', 'customers'],
  ['reviews.moderate', 'تایید/رد دیدگاه‌ها', 'moderation'], ['questions.moderate', 'پاسخ به پرسش‌ها', 'moderation'],
  ['coupons.manage', 'مدیریت کدهای تخفیف', 'marketing'], ['banners.manage', 'مدیریت بنرها', 'marketing'],
  ['pages.manage', 'مدیریت صفحات محتوایی', 'marketing'], ['tickets.view', 'مشاهده پشتیبانی', 'tickets'],
  ['tickets.reply', 'پاسخ به پشتیبانی', 'tickets'], ['tickets.assign', 'تخصیص پشتیبانی', 'tickets'],
  ['settings.manage', 'مدیریت تنظیمات', 'settings'], ['audit.view', 'مشاهده لاگ عملیات', 'settings'],
  ['files.manage', 'مدیریت فایل‌ها', 'settings'], ['reports.view', 'مشاهده گزارش‌ها', 'reports'],
  ['reports.export', 'خروجی گزارش‌ها', 'reports'],
];

const ROLES: Array<{ name: string; label: string; description: string; perms: string[] | '*' }> = [
  { name: 'super_admin', label: 'مدیر ارشد', description: 'دسترسی کامل', perms: '*' },
  { name: 'product_manager', label: 'مدیر محصول', description: 'محصول، کاتالوگ و موجودی', perms: ['dashboard.view', 'products.view', 'products.create', 'products.update', 'products.delete', 'products.publish', 'categories.manage', 'brands.manage', 'attributes.manage', 'inventory.view', 'inventory.manage', 'inventory.alerts', 'files.manage'] },
  { name: 'order_manager', label: 'مدیر سفارش', description: 'سفارش و پرداخت', perms: ['dashboard.view', 'orders.view', 'orders.update_status', 'orders.cancel', 'orders.refund', 'payments.view', 'customers.view', 'inventory.view', 'reports.view', 'reports.export'] },
  { name: 'support', label: 'پشتیبانی', description: 'پاسخ به مشتریان', perms: ['dashboard.view', 'orders.view', 'customers.view', 'tickets.view', 'tickets.reply', 'tickets.assign', 'inventory.alerts'] },
  { name: 'content_manager', label: 'مدیر محتوا', description: 'بنر، صفحات و دیدگاه‌ها', perms: ['dashboard.view', 'banners.manage', 'pages.manage', 'reviews.moderate', 'questions.moderate', 'files.manage'] },
  { name: 'warehouse', label: 'انباردار', description: 'موجودی و انبار', perms: ['dashboard.view', 'products.view', 'orders.view', 'inventory.view', 'inventory.manage', 'inventory.alerts'] },
  { name: 'customer', label: 'مشتری', description: 'کاربر عادی فروشگاه', perms: [] },
];

function queryDataSource() {
  return new DataSource({
    type: 'mysql',
    host: env.db.host,
    port: env.db.port,
    username: env.db.username,
    password: env.db.password,
    database: env.db.database,
    charset: env.db.charset,
    entities: ALL_ENTITIES,
    synchronize: false,
  });
}

// Helper function to generate UUID for MySQL
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function main() {
  const ds = queryDataSource();
  await ds.initialize();
  console.log('🌱 Seeding MySQL/MariaDB...');

  // Insert permissions (MySQL uses INSERT ... ON DUPLICATE KEY UPDATE)
  for (const [name, label, group] of PERMISSIONS) {
    await dbQuery(ds, `INSERT INTO permissions (name, label, group_name) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE label = VALUES(label), group_name = VALUES(group_name)`, [name, label, group]);
  }

  const roleIds = new Map<string, number>();
  for (const role of ROLES) {
    await dbQuery(ds, `INSERT INTO roles (name, label, description, is_system) VALUES (?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description), is_system = TRUE`,
      [role.name, role.label, role.description]);
    const roleRows = await dbQuery(ds, `SELECT id FROM roles WHERE name = ?`, [role.name]);
    const roleId = Number(roleRows[0].id);
    roleIds.set(role.name, roleId);
    const names = role.perms === '*' ? PERMISSIONS.map(([name]) => name) : role.perms;
    for (const permission of names) {
      // Get permission_id
      const permRows = await dbQuery(ds, `SELECT id FROM permissions WHERE name = ?`, [permission]);
      if (permRows.length) {
        await dbQuery(ds, `INSERT IGNORE INTO permission_role (permission_id, role_id) VALUES (?, ?)`, [Number(permRows[0].id), roleId]);
      }
    }
  }

  // Admin user
  const adminPhone = process.env.SEED_ADMIN_PHONE || '09000000000';
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@karzintell.ir').trim().toLowerCase();
  const existing = await dbQuery(ds, 'SELECT id FROM users WHERE phone = ? OR LOWER(email) = LOWER(?) LIMIT 1', [adminPhone, adminEmail]);
  let adminId: number;
  if (existing.length) {
    adminId = Number(existing[0].id);
    console.log('   ⏭ ادمین از قبل موجود است؛ رمز عبور تغییر نمی‌کند.');
  } else {
    const password = process.env.SEED_ADMIN_PASSWORD || tempPassword();
    const hash = await bcrypt.hash(password, env.bcryptRounds);
    await dbQuery(ds, `INSERT INTO users (full_name, email, phone, password_hash, status, must_change_password, email_verified_at, phone_verified_at)
      VALUES ('مدیر ارشد کارزینتل', ?, ?, ?, 'active', TRUE, NOW(), NOW())`, [adminEmail, adminPhone, hash]);
    const inserted = await dbQuery(ds, `SELECT LAST_INSERT_ID() as id`);
    adminId = Number(inserted[0].id);
    if (process.env.SEED_ADMIN_PASSWORD) console.log('   ✅ ادمین با رمز SEED_ADMIN_PASSWORD ساخته شد؛ تغییر رمز اجباری است.');
    else {
      console.log(`   ✅ ادمین ساخته شد: ${adminEmail}`);
      console.log(`   🔐 رمز موقت (فقط این‌بار): ${password}`);
    }
  }

  // Assign super_admin role to admin
  const superAdminRoleId = roleIds.get('super_admin')!;
  await dbQuery(ds, `INSERT IGNORE INTO role_user (role_id, user_id, assigned_by) VALUES (?, ?, ?)`, [superAdminRoleId, adminId, adminId]);

  // Extra super admin if specified
  const extraEmail = process.env.SEED_EXTRA_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (extraEmail) {
    const extraPhone = process.env.SEED_EXTRA_SUPER_ADMIN_PHONE || `a${Date.now().toString().slice(-13)}`;
    const found = await dbQuery(ds, 'SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR phone = ? LIMIT 1', [extraEmail, extraPhone]);
    let extraId: number;
    if (found.length) extraId = Number(found[0].id);
    else {
      const password = process.env.SEED_EXTRA_SUPER_ADMIN_PASSWORD || tempPassword();
      const hash = await bcrypt.hash(password, env.bcryptRounds);
      await dbQuery(ds, `INSERT INTO users (full_name, email, phone, password_hash, status, must_change_password)
        VALUES ('مدیر ارشد', ?, ?, ?, 'active', TRUE)`, [extraEmail, extraPhone, hash]);
      const inserted = await dbQuery(ds, `SELECT LAST_INSERT_ID() as id`);
      extraId = Number(inserted[0].id);
      if (!process.env.SEED_EXTRA_SUPER_ADMIN_PASSWORD) console.log(`   🔐 رمز موقت ادمین اضافی: ${password}`);
    }
    await dbQuery(ds, `INSERT IGNORE INTO role_user (role_id, user_id, assigned_by) VALUES (?, ?, ?)`, [superAdminRoleId, extraId, adminId]);
  }

  // Create default warehouse
  await dbQuery(ds, `INSERT IGNORE INTO warehouses (name, code, province, city) VALUES ('انبار مرکزی', 'MAIN', 'تهران', 'تهران')`);
  const warehouseResult = await dbQuery(ds, `SELECT id FROM warehouses WHERE code = 'MAIN'`);
  const warehouseId = Number(warehouseResult[0].id);

  // Create categories
  const rootCategories = [
    ['موبایل', 'mobile', 1], ['کامپیوتر و لپ‌تاپ', 'computer-laptop', 2], ['ساعت و مچ‌بند هوشمند', 'smartwatch', 3],
    ['صوتی (هدفون و اسپیکر)', 'audio', 4], ['لوازم جانبی', 'accessories', 5],
  ] as const;
  const categoryIds = new Map<string, number>();
  for (const [name, slug, sort] of rootCategories) {
    await dbQuery(ds, `INSERT INTO categories (name, slug, is_active, sort_order) VALUES (?, ?, TRUE, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)`, [name, slug, sort]);
    const row = await dbQuery(ds, `SELECT id FROM categories WHERE slug = ?`, [slug]);
    categoryIds.set(slug, Number(row[0].id));
  }
  const mobileId = categoryIds.get('mobile')!;
  for (const [name, slug, sort] of [['گوشی هوشمند', 'smartphones', 1], ['قطعات و تعمیرات موبایل', 'mobile-parts', 2]] as const) {
    await dbQuery(ds, `INSERT INTO categories (parent_id, name, slug, is_active, sort_order) VALUES (?, ?, ?, TRUE, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), parent_id = VALUES(parent_id)`, [mobileId, name, slug, sort]);
    const row = await dbQuery(ds, `SELECT id FROM categories WHERE slug = ?`, [slug]);
    categoryIds.set(slug, Number(row[0].id));
  }

  // Create brands
  for (const [name, slug, sort] of [['اپل', 'apple', 1], ['سامسونگ', 'samsung', 2], ['شیائومی', 'xiaomi', 3], ['هوآوی', 'huawei', 4], ['انکر', 'anker', 5]] as const)
    await dbQuery(ds, `INSERT INTO brands (name, slug, is_active, sort_order) VALUES (?, ?, TRUE, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)`, [name, slug, sort]);

  // Create attributes
  const attrs = [['رنگ', 'color', 'select', null], ['حافظه داخلی', 'storage', 'select', 'GB'], ['حافظه رم', 'ram', 'select', 'GB'], ['اندازه صفحه‌نمایش', 'screen_size', 'number', 'inch']] as const;
  const attrIds = new Map<string, number>();
  for (const [name, code, type, unit] of attrs) {
    await dbQuery(ds, `INSERT INTO attributes (name, code, type, unit, is_filterable) VALUES (?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE name = VALUES(name), unit = VALUES(unit)`, [name, code, type, unit]);
    const row = await dbQuery(ds, `SELECT id FROM attributes WHERE code = ?`, [code]);
    attrIds.set(code, Number(row[0].id));
  }

  // Create attribute values
  const values = [['color', 'مشکی', 1], ['color', 'سفید', 2], ['color', 'آبی', 3], ['storage', '64', 1], ['storage', '128', 2], ['storage', '256', 3], ['ram', '4', 1], ['ram', '8', 2], ['ram', '12', 3]] as const;
  const valueIds = new Map<string, number>();
  for (const [code, value, sort] of values) {
    await dbQuery(ds, `INSERT INTO attribute_values (attribute_id, value, sort_order) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)`, [attrIds.get(code), value, sort]);
    const row = await dbQuery(ds, `SELECT id FROM attribute_values WHERE attribute_id = ? AND value = ?`, [attrIds.get(code), value]);
    valueIds.set(`${code}:${value}`, Number(row[0].id));
  }

  // Link attributes to categories
  for (const [code, variant, required, sort] of [['color', true, false, 1], ['storage', true, false, 2], ['ram', false, false, 3]] as const)
    await dbQuery(ds, `INSERT IGNORE INTO category_attribute (category_id, attribute_id, is_variant, is_required, sort_order) VALUES (?, ?, ?, ?, ?)`, [categoryIds.get('smartphones'), attrIds.get(code), variant, required, sort]);

  // Create settings
  const settings: Array<[string, string, string, string, boolean]> = [
    ['store.name', 'کارزینتل', 'general', 'string', true], ['store.name_en', 'Karzintell', 'general', 'string', true],
    ['store.currency', 'IRR', 'general', 'string', true], ['store.tax_percent', '9', 'billing', 'number', false],
    ['store.free_shipping_threshold', '0', 'shipping', 'number', true], ['store.shipping_flat', '250000', 'shipping', 'number', false],
    ['store.support_phone', '', 'general', 'string', true], ['store.default_warehouse_id', String(warehouseId), 'inventory', 'number', false],
  ];
  for (const [key, value, group, type, isPublic] of settings)
    await dbQuery(ds, `INSERT INTO settings (setting_key, setting_value, setting_group, setting_type, is_public) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type), is_public = VALUES(is_public)`, [key, value, group, type, isPublic]);

  // Create sample product if SAMPLE_DATA is enabled
  if (process.env.SAMPLE_DATA === '1') await seedSampleProduct(ds, Number(categoryIds.get('smartphones')), warehouseId, Number((await dbQuery(ds, `SELECT id FROM brands WHERE slug = 'apple'`))[0].id), attrIds, valueIds);

  await ds.destroy();
  console.log('🌱 Seed completed');
}

async function seedSampleProduct(ds: any, categoryId: number, warehouseId: number, brandId: number, attrIds: Map<string, number>, valueIds: Map<string, number>) {
  // Insert product
  const features = JSON.stringify(['تراشه A18', 'دوربین ۴۸MP', 'مقاوم IP68']);
  await dbQuery(ds, `INSERT INTO products (code, category_id, brand_id, name, slug, short_description, description, features, status, published_at, warranty_months, rating_avg, rating_count)
    VALUES ('KRZ-IP16', ?, ?, 'گوشی اپل iPhone 16', 'apple-iphone-16', 'آیفون ۱۶ با تراشه A18', '<p>گوشی هوشمند اپل مدل iPhone 16.</p>', ?, 'published', NOW(), 18, 4.6, 128)
    ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [categoryId, brandId, features]);
  
  const productRows = await dbQuery(ds, `SELECT id FROM products WHERE slug = 'apple-iphone-16'`);
  const productId = Number(productRows[0].id);

  // Insert variants
  for (const [color, suffix, stock] of [['مشکی', 'BLK', 8], ['سفید', 'WHT', 5]] as const) {
    await dbQuery(ds, `INSERT INTO product_variants (product_id, sku, title, price, compare_at_price, is_default, is_active)
      VALUES (?, ?, ?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE title = VALUES(title)`,
      [productId, `IP16-128-${suffix}`, `${color} / ۱۲۸ گیگابایت`, color === 'مشکی' ? 820000000 : 815000000, color === 'مشکی' ? 880000000 : null, color === 'مشکی']);
    
    const variantRows = await dbQuery(ds, `SELECT id FROM product_variants WHERE sku = ?`, [`IP16-128-${suffix}`]);
    const variantId = Number(variantRows[0].id);

    // Insert variant attribute values
    await dbQuery(ds, `INSERT INTO product_variant_values (variant_id, attribute_id, attribute_value_id) VALUES (?, ?, ?), (?, ?, ?)
      ON DUPLICATE KEY UPDATE attribute_value_id = VALUES(attribute_value_id)`,
      [variantId, attrIds.get('color'), valueIds.get(`color:${color}`), variantId, attrIds.get('storage'), valueIds.get('storage:128')]);

    // Insert inventory
    await dbQuery(ds, `INSERT INTO inventory (variant_id, warehouse_id, quantity, reserved) VALUES (?, ?, ?, 0)
      ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
      [variantId, warehouseId, stock]);
  }

  // Update product prices
  await dbQuery(ds, `UPDATE products SET min_price = 815000000, max_price = 820000000 WHERE id = ?`, [productId]);

  // Create tag
  await dbQuery(ds, `INSERT IGNORE INTO tags (name, slug) VALUES ('پرفروش', 'bestseller')`);
  
  // Link product to tag
  const tagRows = await dbQuery(ds, `SELECT id FROM tags WHERE slug = 'bestseller'`);
  if (tagRows.length) {
    await dbQuery(ds, `INSERT IGNORE INTO product_tags (product_id, tag_id) VALUES (?, ?)`, [productId, Number(tagRows[0].id)]);
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
