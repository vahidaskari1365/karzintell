/**
 * Supabase/PostgreSQL seed: roles, permissions, one admin, a warehouse and
 * optional demo data. It is idempotent and never contains a password literal.
 * Run with SEED_ADMIN_PASSWORD supplied through the environment, or leave it
 * empty to print a generated one-time password once.
 */
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ALL_ENTITIES } from './entities';
import { env } from '../config/configuration';
import { dbQuery, slugify, tempPassword } from '../common/utils';

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
  const url = process.env.DIRECT_DATABASE_URL || env.db.url || undefined;
  return new DataSource({
    type: 'postgres',
    ...(url ? { url } : { host: env.db.host, port: env.db.port, username: env.db.username, password: env.db.password, database: env.db.database }),
    ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
    extra: { max: env.db.poolMax },
    entities: ALL_ENTITIES,
    synchronize: false,
  });
}

async function main() {
  const ds = queryDataSource();
  await ds.initialize();
  console.log('🌱 Seeding Supabase/PostgreSQL...');

  for (const [name, label, group] of PERMISSIONS) {
    await dbQuery(ds, `INSERT INTO permissions (name, label, group_name) VALUES (?, ?, ?)
      ON CONFLICT (name) DO UPDATE SET label = EXCLUDED.label, group_name = EXCLUDED.group_name`, [name, label, group]);
  }

  const roleIds = new Map<string, number>();
  for (const role of ROLES) {
    await dbQuery(ds, `INSERT INTO roles (name, label, description, is_system) VALUES (?, ?, ?, TRUE)
      ON CONFLICT (name) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description, is_system = TRUE`,
      [role.name, role.label, role.description]);
    const roleRows = await dbQuery(ds, `SELECT id FROM roles WHERE name = ?`, [role.name]);
    const roleId = Number(roleRows[0].id);
    roleIds.set(role.name, roleId);
    const names = role.perms === '*' ? PERMISSIONS.map(([name]) => name) : role.perms;
    for (const permission of names) {
      await dbQuery(ds, `INSERT INTO permission_role (permission_id, role_id)
        SELECT id, ? FROM permissions WHERE name = ? ON CONFLICT DO NOTHING`, [roleId, permission]);
    }
  }
  await dbQuery(ds, `SELECT setval(pg_get_serial_sequence('roles', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM roles), 1), TRUE)`);

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
    const inserted = await dbQuery(ds, `INSERT INTO users (full_name, email, phone, password_hash, status, must_change_password, email_verified_at, phone_verified_at)
      VALUES ('مدیر ارشد کارزینتل', ?, ?, ?, 'active', TRUE, NOW(), NOW()) RETURNING id`, [adminEmail, adminPhone, hash]);
    adminId = Number(inserted[0].id);
    if (process.env.SEED_ADMIN_PASSWORD) console.log('   ✅ ادمین با رمز SEED_ADMIN_PASSWORD ساخته شد؛ تغییر رمز اجباری است.');
    else {
      console.log(`   ✅ ادمین ساخته شد: ${adminEmail}`);
      console.log(`   🔐 رمز موقت (فقط این‌بار): ${password}`);
    }
  }
  const superAdminRoleId = roleIds.get('super_admin')!;
  await dbQuery(ds, `INSERT INTO role_user (role_id, user_id, assigned_by) VALUES (?, ?, ?)
    ON CONFLICT (role_id, user_id) DO NOTHING`, [superAdminRoleId, adminId, adminId]);

  const extraEmail = process.env.SEED_EXTRA_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (extraEmail) {
    const extraPhone = process.env.SEED_EXTRA_SUPER_ADMIN_PHONE || `a${Date.now().toString().slice(-13)}`;
    const found = await dbQuery(ds, 'SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR phone = ? LIMIT 1', [extraEmail, extraPhone]);
    let extraId: number;
    if (found.length) extraId = Number(found[0].id);
    else {
      const password = process.env.SEED_EXTRA_SUPER_ADMIN_PASSWORD || tempPassword();
      const hash = await bcrypt.hash(password, env.bcryptRounds);
      const inserted = await dbQuery(ds, `INSERT INTO users (full_name, email, phone, password_hash, status, must_change_password)
        VALUES ('مدیر ارشد', ?, ?, ?, 'active', TRUE) RETURNING id`, [extraEmail, extraPhone, hash]);
      extraId = Number(inserted[0].id);
      if (!process.env.SEED_EXTRA_SUPER_ADMIN_PASSWORD) console.log(`   🔐 رمز موقت ادمین اضافی: ${password}`);
    }
    await dbQuery(ds, `INSERT INTO role_user (role_id, user_id, assigned_by) VALUES (?, ?, ?)
      ON CONFLICT (role_id, user_id) DO NOTHING`, [superAdminRoleId, extraId, adminId]);
  }

  const warehouse = await dbQuery(ds, `INSERT INTO warehouses (name, code, province, city)
    VALUES ('انبار مرکزی', 'MAIN', 'تهران', 'تهران') ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`);
  const warehouseId = Number(warehouse[0].id);

  // Public catalog seed uses natural keys, not hard-coded identity IDs.
  const rootCategories = [
    ['موبایل', 'mobile', 1], ['کامپیوتر و لپ‌تاپ', 'computer-laptop', 2], ['ساعت و مچ‌بند هوشمند', 'smartwatch', 3],
    ['صوتی (هدفون و اسپیکر)', 'audio', 4], ['لوازم جانبی', 'accessories', 5],
  ] as const;
  const categoryIds = new Map<string, number>();
  for (const [name, slug, sort] of rootCategories) {
    const row = await dbQuery(ds, `INSERT INTO categories (name, slug, is_active, sort_order) VALUES (?, ?, TRUE, ?)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [name, slug, sort]);
    categoryIds.set(slug, Number(row[0].id));
  }
  const mobileId = categoryIds.get('mobile')!;
  for (const [name, slug, sort] of [['گوشی هوشمند', 'smartphones', 1], ['قطعات و تعمیرات موبایل', 'mobile-parts', 2]] as const) {
    const row = await dbQuery(ds, `INSERT INTO categories (parent_id, name, slug, is_active, sort_order) VALUES (?, ?, ?, TRUE, ?)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id RETURNING id`, [mobileId, name, slug, sort]);
    categoryIds.set(slug, Number(row[0].id));
  }

  for (const [name, slug, sort] of [['اپل', 'apple', 1], ['سامسونگ', 'samsung', 2], ['شیائومی', 'xiaomi', 3], ['هوآوی', 'huawei', 4], ['انکر', 'anker', 5]] as const)
    await dbQuery(ds, `INSERT INTO brands (name, slug, is_active, sort_order) VALUES (?, ?, TRUE, ?)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`, [name, slug, sort]);

  const attrs = [['رنگ', 'color', 'select', null], ['حافظه داخلی', 'storage', 'select', 'GB'], ['حافظه رم', 'ram', 'select', 'GB'], ['اندازه صفحه‌نمایش', 'screen_size', 'number', 'inch']] as const;
  const attrIds = new Map<string, number>();
  for (const [name, code, type, unit] of attrs) {
    const row = await dbQuery(ds, `INSERT INTO attributes (name, code, type, unit, is_filterable) VALUES (?, ?, ?, ?, TRUE)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, unit = EXCLUDED.unit RETURNING id`, [name, code, type, unit]);
    attrIds.set(code, Number(row[0].id));
  }
  const values = [['color', 'مشکی', 1], ['color', 'سفید', 2], ['color', 'آبی', 3], ['storage', '64', 1], ['storage', '128', 2], ['storage', '256', 3], ['ram', '4', 1], ['ram', '8', 2], ['ram', '12', 3]] as const;
  const valueIds = new Map<string, number>();
  for (const [code, value, sort] of values) {
    const row = await dbQuery(ds, `INSERT INTO attribute_values (attribute_id, value, sort_order) VALUES (?, ?, ?)
      ON CONFLICT (attribute_id, value) DO UPDATE SET sort_order = EXCLUDED.sort_order RETURNING id`, [attrIds.get(code), value, sort]);
    valueIds.set(`${code}:${value}`, Number(row[0].id));
  }
  for (const [code, variant, required, sort] of [['color', true, false, 1], ['storage', true, false, 2], ['ram', false, false, 3]] as const)
    await dbQuery(ds, `INSERT INTO category_attribute (category_id, attribute_id, is_variant, is_required, sort_order) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (category_id, attribute_id) DO NOTHING`, [categoryIds.get('smartphones'), attrIds.get(code), variant, required, sort]);

  const settings: Array<[string, string, string, string, boolean]> = [
    ['store.name', 'کارزینتل', 'general', 'string', true], ['store.name_en', 'Karzintell', 'general', 'string', true],
    ['store.currency', 'IRR', 'general', 'string', true], ['store.tax_percent', '9', 'billing', 'number', false],
    ['store.free_shipping_threshold', '0', 'shipping', 'number', true], ['store.shipping_flat', '250000', 'shipping', 'number', false],
    ['store.support_phone', '', 'general', 'string', true], ['store.default_warehouse_id', String(warehouseId), 'inventory', 'number', false],
  ];
  for (const [key, value, group, type, isPublic] of settings)
    await dbQuery(ds, `INSERT INTO settings ("key", "value", "group", type, is_public) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", type = EXCLUDED.type, is_public = EXCLUDED.is_public`, [key, value, group, type, isPublic]);

  if (process.env.SAMPLE_DATA === '1') await seedSampleProduct(
    ds,
    Number(categoryIds.get('smartphones')),
    warehouseId,
    Number((await dbQuery(ds, `SELECT id FROM brands WHERE slug = 'apple'`))[0].id),
    attrIds,
    valueIds,
  );

  await ds.destroy();
  console.log('🌱 Seed completed');
}

async function seedSampleProduct(ds: DataSource, categoryId: number, warehouseId: number, brandId: number, attrIds: Map<string, number>, valueIds: Map<string, number>) {
  const product = await dbQuery(ds, `INSERT INTO products (code, category_id, brand_id, name, slug, short_description, description, features, status, published_at, warranty_months, rating_avg, rating_count)
    VALUES ('KRZ-IP16', ?, ?, 'گوشی اپل iPhone 16', 'apple-iphone-16', 'آیفون ۱۶ با تراشه A18', '<p>گوشی هوشمند اپل مدل iPhone 16.</p>', ?, 'published', NOW(), 18, 4.6, 128)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [categoryId, brandId, JSON.stringify(['تراشه A18', 'دوربین ۴۸MP', 'مقاوم IP68'])]);
  const productId = Number(product[0].id);
  for (const [color, suffix, stock] of [['مشکی', 'BLK', 8], ['سفید', 'WHT', 5]] as const) {
    const variant = await dbQuery(ds, `INSERT INTO product_variants (product_id, sku, title, price, compare_at_price, is_default, is_active)
      VALUES (?, ?, ?, ?, ?, ?, TRUE) ON CONFLICT (sku) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
      [productId, `IP16-128-${suffix}`, `${color} / ۱۲۸ گیگابایت`, color === 'مشکی' ? 820000000 : 815000000, color === 'مشکی' ? 880000000 : null, color === 'مشکی']);
    const variantId = Number(variant[0].id);
    await dbQuery(ds, `INSERT INTO product_variant_values (variant_id, attribute_id, attribute_value_id) VALUES (?, ?, ?), (?, ?, ?)
      ON CONFLICT (variant_id, attribute_id) DO UPDATE SET attribute_value_id = EXCLUDED.attribute_value_id`, [variantId, attrIds.get('color'), valueIds.get(`color:${color}`), variantId, attrIds.get('storage'), valueIds.get('storage:128')]);
    await dbQuery(ds, `INSERT INTO inventory (variant_id, warehouse_id, quantity, reserved) VALUES (?, ?, ?, 0)
      ON CONFLICT (variant_id, warehouse_id) DO UPDATE SET quantity = EXCLUDED.quantity`, [variantId, warehouseId, stock]);
  }
  await dbQuery(ds, `UPDATE products SET min_price = 815000000, max_price = 820000000 WHERE id = ?`, [productId]);
  await dbQuery(ds, `INSERT INTO tags (name, slug) VALUES ('پرفروش', 'bestseller') ON CONFLICT (slug) DO NOTHING`);
  await dbQuery(ds, `INSERT INTO product_tags (product_id, tag_id) SELECT ?, id FROM tags WHERE slug = 'bestseller' ON CONFLICT DO NOTHING`, [productId]);
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
