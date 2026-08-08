/**
 * Seed مستقل: نقش‌ها، مجوزها، ادمین پیش‌فرض، انبار، کاتالوگ نمونه.
 * اجرا: npm run seed   (idempotent — چندبار اجرا مشکلی ندارد)
 *
 * نکته: این seed با database/schema.sql سازگار است؛ اگر اسکیما را با SQL لود کرده‌اید،
 * این اسکریپت فقط موارد ناقص را کامل می‌کند.
 */
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ALL_ENTITIES } from './entities';
import { env } from '../config/configuration';
import { slugify } from '../common/utils';

const PERMISSIONS: Array<[string, string, string]> = [
  ['dashboard.view', 'مشاهده داشبورد', 'dashboard'],
  ['users.view', 'مشاهده کاربران', 'users'],
  ['users.create', 'ایجاد کاربر', 'users'],
  ['users.update', 'ویرایش کاربر', 'users'],
  ['users.delete', 'حذف کاربر', 'users'],
  ['users.assign_role', 'تخصیص نقش به کاربر', 'users'],
  ['roles.view', 'مشاهده نقش‌ها', 'roles'],
  ['roles.create', 'ایجاد نقش', 'roles'],
  ['roles.update', 'ویرایش نقش و مجوزها', 'roles'],
  ['roles.delete', 'حذف نقش', 'roles'],
  ['products.view', 'مشاهده محصولات', 'products'],
  ['products.create', 'ایجاد محصول', 'products'],
  ['products.update', 'ویرایش محصول', 'products'],
  ['products.delete', 'حذف محصول', 'products'],
  ['products.publish', 'انتشار محصول', 'products'],
  ['categories.manage', 'مدیریت دسته‌بندی‌ها', 'catalog'],
  ['brands.manage', 'مدیریت برندها', 'catalog'],
  ['attributes.manage', 'مدیریت صفت‌ها', 'catalog'],
  ['inventory.view', 'مشاهده موجودی', 'inventory'],
  ['inventory.manage', 'اصلاح موجودی انبار', 'inventory'],
  ['orders.view', 'مشاهده سفارش‌ها', 'orders'],
  ['orders.update_status', 'تغییر وضعیت سفارش', 'orders'],
  ['orders.cancel', 'لغو سفارش', 'orders'],
  ['orders.refund', 'عودت وجه', 'orders'],
  ['payments.view', 'مشاهده تراکنش‌ها', 'payments'],
  ['customers.view', 'مشاهده مشتریان', 'customers'],
  ['customers.manage', 'مدیریت مشتریان', 'customers'],
  ['reviews.moderate', 'تایید/رد دیدگاه‌ها', 'moderation'],
  ['questions.moderate', 'پاسخ به پرسش‌ها', 'moderation'],
  ['coupons.manage', 'مدیریت کدهای تخفیف', 'marketing'],
  ['banners.manage', 'مدیریت بنرها', 'marketing'],
  ['pages.manage', 'مدیریت صفحات محتوایی', 'marketing'],
  ['tickets.view', 'مشاهده تیکت‌ها', 'tickets'],
  ['tickets.reply', 'پاسخ به تیکت‌ها', 'tickets'],
  ['settings.manage', 'مدیریت تنظیمات', 'settings'],
  ['audit.view', 'مشاهده لاگ عملیات', 'settings'],
  ['files.manage', 'مدیریت فایل‌ها', 'settings'],
  ['reports.view', 'مشاهده گزارش‌ها', 'reports'],
];

const ROLES: Array<{ id: number; name: string; label: string; description: string; perms: string[] | '*' }> = [
  { id: 1, name: 'super_admin', label: 'مدیر ارشد (Admin)', description: 'دسترسی کامل', perms: '*' },
  { id: 2, name: 'product_manager', label: 'مدیر محصول', description: 'ثبت و ویرایش محصولات و کاتالوگ و موجودی', perms: [
    'dashboard.view', 'products.view', 'products.create', 'products.update', 'products.delete', 'products.publish',
    'categories.manage', 'brands.manage', 'attributes.manage', 'inventory.view', 'inventory.manage', 'files.manage',
  ]},
  { id: 3, name: 'order_manager', label: 'مدیر سفارش', description: 'مدیریت سفارش‌ها و پرداخت‌ها', perms: [
    'dashboard.view', 'orders.view', 'orders.update_status', 'orders.cancel', 'orders.refund',
    'payments.view', 'customers.view', 'inventory.view', 'reports.view',
  ]},
  { id: 4, name: 'support', label: 'پشتیبانی', description: 'تیکت‌ها و مشاهده سفارش‌ها', perms: [
    'dashboard.view', 'orders.view', 'customers.view', 'tickets.view', 'tickets.reply',
  ]},
  { id: 5, name: 'content_manager', label: 'مدیر محتوا', description: 'بنرها، صفحات و دیدگاه‌ها', perms: [
    'dashboard.view', 'banners.manage', 'pages.manage', 'reviews.moderate', 'questions.moderate', 'files.manage',
  ]},
  { id: 6, name: 'warehouse', label: 'انباردار', description: 'موجودی و انبار', perms: [
    'dashboard.view', 'products.view', 'orders.view', 'inventory.view', 'inventory.manage',
  ]},
  { id: 7, name: 'customer', label: 'مشتری', description: 'کاربر عادی فروشگاه', perms: [] },
];

async function main() {
  const ds = new DataSource({
    type: 'mysql',
    host: env.db.host,
    port: env.db.port,
    username: env.db.username,
    password: env.db.password,
    database: env.db.database,
    entities: ALL_ENTITIES,
    synchronize: false,
  });
  await ds.initialize();
  console.log('🌱 Seeding...');

  // 1) مجوزها
  for (const [name, label, group] of PERMISSIONS) {
    await ds.query(
      'INSERT IGNORE INTO permissions (name, label, group_name) VALUES (?, ?, ?)',
      [name, label, group],
    );
  }

  // 2) نقش‌ها + نگاشت مجوز
  for (const role of ROLES) {
    await ds.query(
      'INSERT INTO roles (id, name, label, description, is_system) VALUES (?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description)',
      [role.id, role.name, role.label, role.description],
    );
    if (role.perms === '*') {
      await ds.query(
        'INSERT IGNORE INTO permission_role (permission_id, role_id) SELECT id, ? FROM permissions',
        [role.id],
      );
    } else if (role.perms.length) {
      await ds.query(
        `INSERT IGNORE INTO permission_role (permission_id, role_id)
         SELECT id, ? FROM permissions WHERE name IN (${role.perms.map(() => '?').join(',')})`,
        [role.id, ...role.perms],
      );
    }
  }

  // 3) ادمین پیش‌فرض
  const adminPhone = '09000000000';
  const existing = await ds.query('SELECT id FROM users WHERE phone = ?', [adminPhone]);
  if (!existing.length) {
    const hash = await bcrypt.hash('Admin@123456', env.bcryptRounds);
    await ds.query(
      `INSERT INTO users (id, full_name, email, phone, password_hash, status, must_change_password, email_verified_at, phone_verified_at)
       VALUES (1, 'مدیر ارشد کارزینتل', 'admin@karzintell.ir', ?, ?, 'active', 1, NOW(), NOW())`,
      [adminPhone, hash],
    );
    await ds.query('INSERT IGNORE INTO role_user (role_id, user_id, assigned_by) VALUES (1, 1, 1)');
    console.log('   ✅ admin@karzintell.ir / Admin@123456 (تغییر رمز در اولین ورود اجباری است)');
  } else {
    console.log('   ⏭  ادمین از قبل موجود است');
  }

  // اضافه کردن یوزر vahid.askari1986@gmail.com به عنوان ادمین ارشد (درخواستی کاربر)
  const vahidEmail = 'vahid.askari1986@gmail.com';
  const existingVahid = await ds.query('SELECT id FROM users WHERE email = ?', [vahidEmail]);
  if (!existingVahid.length) {
    const hashVahid = await bcrypt.hash('Vahid@0142', env.bcryptRounds);
    await ds.query(
      `INSERT INTO users (full_name, email, phone, password_hash, status, must_change_password, email_verified_at, phone_verified_at)
       VALUES ('وحید عسگری', ?, '09120000142', ?, 'active', 0, NOW(), NOW())`,
      [vahidEmail, hashVahid],
    );
    const vahidUser = await ds.query('SELECT id FROM users WHERE email = ?', [vahidEmail]);
    if (vahidUser.length) {
      const vahidId = vahidUser[0].id;
      await ds.query('INSERT IGNORE INTO role_user (role_id, user_id, assigned_by) VALUES (1, ?, 1)', [vahidId]);
      console.log('   ✅ یوزر vahid.askari1986@gmail.com با نقش ادمین با موفقیت ایجاد شد.');
    }
  } else {
    // بروزرسانی پسورد و نقش ادمینی برای یوزر موجود
    const hashVahid = await bcrypt.hash('Vahid@0142', env.bcryptRounds);
    const vahidId = existingVahid[0].id;
    await ds.query(
      `UPDATE users SET password_hash = ?, status = 'active', must_change_password = 0 WHERE id = ?`,
      [hashVahid, vahidId]
    );
    await ds.query('INSERT IGNORE INTO role_user (role_id, user_id, assigned_by) VALUES (1, ?, 1)', [vahidId]);
    console.log('   ✅ یوزر vahid.askari1986@gmail.com ارتقا یافت و رمز بروزرسانی شد.');
  }

  // 4) انبار پیش‌فرض
  await ds.query(
    "INSERT IGNORE INTO warehouses (id, name, code, province, city) VALUES (1, 'انبار مرکزی', 'MAIN', 'تهران', 'تهران')",
  );

  // 5) کاتالوگ نمونه
  if ((await ds.query('SELECT COUNT(*) AS c FROM categories'))[0].c === 0) {
    const cats = [
      [1, null, 'موبایل', 'mobile', 1],
      [2, null, 'کامپیوتر و لپ‌تاپ', 'computer-laptop', 2],
      [3, null, 'ساعت و مچ‌بند هوشمند', 'smartwatch', 3],
      [4, null, 'صوتی (هدفون و اسپیکر)', 'audio', 4],
      [5, null, 'لوازم جانبی', 'accessories', 5],
      [6, 1, 'گوشی هوشمند', 'smartphones', 1],
      [7, 1, 'قطعات و تعمیرات موبایل', 'mobile-parts', 2],
    ];
    for (const [id, parent, name, slug, sort] of cats)
      await ds.query(
        'INSERT IGNORE INTO categories (id, parent_id, name, slug, is_active, sort_order) VALUES (?, ?, ?, ?, 1, ?)',
        [id, parent, name, slug, sort],
      );

    const brands = [
      ['اپل', 'apple', 1], ['سامسونگ', 'samsung', 2], ['شیائومی', 'xiaomi', 3],
      ['هوآوی', 'huawei', 4], ['انکر', 'anker', 5],
    ];
    for (const [name, slug, sort] of brands)
      await ds.query(
        'INSERT IGNORE INTO brands (name, slug, is_active, sort_order) VALUES (?, ?, 1, ?)',
        [name, slug, sort],
      );

    // صفت‌ها
    const attrs: Array<[number, string, string, string, string | null]> = [
      [1, 'رنگ', 'color', 'select', null],
      [2, 'حافظه داخلی', 'storage', 'select', 'GB'],
      [3, 'حافظه رم', 'ram', 'select', 'GB'],
      [4, 'اندازه صفحه‌نمایش', 'screen_size', 'text', 'اینچ'],
    ];
    for (const [id, name, code, type, unit] of attrs)
      await ds.query(
        'INSERT IGNORE INTO attributes (id, name, code, type, unit, is_filterable) VALUES (?, ?, ?, ?, ?, 1)',
        [id, name, code, type, unit],
      );

    const values: Array<[number, string, number]> = [
      [1, 'مشکی', 1], [1, 'سفید', 2], [1, 'آبی', 3], [1, 'بنفش', 4],
      [2, '64', 1], [2, '128', 2], [2, '256', 3], [2, '512', 4],
      [3, '4', 1], [3, '6', 2], [3, '8', 3], [3, '12', 4],
    ];
    for (const [attrId, value, sort] of values)
      await ds.query(
        'INSERT IGNORE INTO attribute_values (attribute_id, value, sort_order) VALUES (?, ?, ?)',
        [attrId, value, sort],
      );

    await ds.query(
      `INSERT IGNORE INTO category_attribute (category_id, attribute_id, is_variant, is_required, sort_order) VALUES
       (6, 1, 1, 0, 1), (6, 2, 1, 0, 2), (6, 3, 0, 0, 3), (6, 4, 0, 0, 4), (3, 1, 1, 0, 1)`,
    );
    console.log('   ✅ کاتالوگ نمونه ساخته شد');
  }

  // 6) تنظیمات پایه
  const settings: Array<[string, string, string, string, number]> = [
    ['store.name', 'کارزینتل', 'general', 'string', 1],
    ['store.name_en', 'Karzintell', 'general', 'string', 1],
    ['store.currency', 'IRR', 'general', 'string', 1],
    ['store.logo', '', 'general', 'string', 1],
    ['store.primary_color', '#10b981', 'general', 'string', 1],
    ['store.socials', '{"instagram":"","telegram":"","whatsapp":"","aparat":""}', 'general', 'json', 1],
    ['store.tax_percent', '9', 'billing', 'number', 0],
    ['store.free_shipping_threshold', '0', 'shipping', 'number', 1],
    ['store.shipping_flat', '250000', 'shipping', 'number', 0],
    ['store.support_phone', '', 'general', 'string', 1],
    ['payment.gateways_enabled', '', 'payment', 'json', 0],
    ['sms.notify_admin', '', 'sms', 'string', 0],
    ['mail.shop_inbox', '', 'mail', 'string', 0],
    ['security.captcha', '1', 'security', 'boolean', 0],
    ['search.engine', 'meilisearch', 'infra', 'string', 0],
  ];
  for (const [key, value, group, type, pub] of settings)
    await ds.query(
      'INSERT IGNORE INTO settings (`key`, `value`, `group`, type, is_public) VALUES (?, ?, ?, ?, ?)',
      [key, value, group, type, pub],
    );

  // 6-ب) مناطق و روش‌های ارسال پیش‌فرض
  await ds.query(
    `INSERT IGNORE INTO shipping_zones (id, name, provinces, cities, is_active, sort_order)
     VALUES (1, 'سراسر کشور', NULL, NULL, 1, 10),
            (2, 'تهران', JSON_ARRAY('تهران'), NULL, 1, 1)`,
  );
  await ds.query(
    `INSERT IGNORE INTO shipping_methods (id, zone_id, name, type, cost, free_above, eta, is_active, sort_order)
     VALUES (1, 1, 'پست پیشتاز', 'post', 250000, NULL, '۲ تا ۵ روز کاری', 1, 1),
            (2, 1, 'تیپاکس', 'tipax', 350000, NULL, '۱ تا ۳ روز کاری', 1, 2),
            (3, 2, 'پیک (تهران)', 'courier', 180000, NULL, 'همان‌روز تا ۲۴ ساعت', 1, 1)`,
  );

  // 6-ج) صفحات پایه CMS
  await ds.query(
    `INSERT IGNORE INTO pages (id, title, slug, body, status, meta_title, meta_description, published_at)
     VALUES
      (1, 'درباره ما', 'about-us',
       '<p>کارزینتل فروشگاه اینترنتی قطعات الکترونیک است؛ از موبایل و ساعت هوشمند تا هدفون و لوازم جانبی، با ضمانت اصالت کالا و ارسال سریع به سراسر ایران.</p><p>هدف ما خرید آسان، قیمت منصفانه و پشتیبانی واقعی است.</p>',
       'published', 'درباره کارزینتل', 'آشنایی با فروشگاه اینترنتی کارزینتل — ضمانت اصالت کالا و ارسال سریع', NOW()),
      (2, 'تماس با ما', 'contact-us',
       '<p>پشتیبانی کارزینتل همه‌روزه از ساعت ۹ تا ۲۱ پاسخگوی شماست.</p><p>يمكنك از طریق تیکت پشتیبانی در حساب کاربری، یا تلفن پشتیبانی با ما در تماس باشید.</p>',
       'published', 'تماس با کارزینتل', 'راه‌های ارتباط با پشتیبانی فروشگاه کارزینتل', NOW()),
      (3, 'قوانین و مقررات', 'terms',
       '<p>استفاده از فروشگاه کارزینتل به معنای پذیرش قوانین زیر است:</p><ul><li>اصالت همه کالاها تضمین می‌شود.</li><li>تا ۷ روز مهلت بازگشت کالای سالم دارید.</li><li>قیمت‌ها لحظه‌ای و ممکن است تغییر کنند.</li></ul>',
       'published', 'قوانین و مقررات', 'شرایط استفاده از فروشگاه اینترنتی کارزینتل', NOW()),
      (4, 'حریم خصوصی', 'privacy',
       '<p>اطلاعات شخصی شما نزد کارزینتل محفوظ است و فقط برای پردازش سفارش و بهبود تجربه خرید استفاده می‌شود.</p>',
       'published', 'حریم خصوصی', 'سیاست حفظ حریم خصوصی کارزینتل', NOW())`,
  );

  // 6-د) سوالات متداول نمونه
  await ds.query(
    `INSERT IGNORE INTO faqs (id, question, answer, sort_order, is_active)
     VALUES
      (1, 'هزینه ارسال چقدر است؟', 'به ترتیب روش ارسال (پست پیشتاز، تیپاکس یا پیک) و منطقه شما محاسبه می‌شود و در صفحه پرداخت نمایش داده می‌شود. بالای مبلغ مشخص، ارسال رایگان است.', 1, 1),
      (2, 'امکان بازگشت کالا وجود دارد؟', 'بله، تا ۷ روز پس از تحویل، در صورت سالم بودن کالا و بسته‌بندی می‌توانید درخواست بازگشت ثبت کنید.', 2, 1),
      (3, 'چطور سفارشم را پیگیری کنم؟', 'از بخش «سفارش‌های من» در حساب کاربری یا صفحه «پیگیری سفارش» با کد سفارش و موبایل گیرنده.', 3, 1),
      (4, 'اصالت کالاها چطور تضمین می‌شود؟', 'همه کالاها از تامین‌کنندگان رسمی تهیه می‌شوند و دارای گارانتی معتبر هستند.', 4, 1)`,
  );

  // 6-ه) مقاله نمونه وبلاگ
  await ds.query(
    `INSERT IGNORE INTO blog_posts (id, title, slug, excerpt, body, kind, status, meta_title, published_at)
     VALUES (1, 'راهنمای خرید گوشی در سال ۲۰۲۶', 'phone-buying-guide-2026',
      'اینکه کدام گوشی برای شما بهتر است به بودجه، عکاسی و کارکرد روزانه‌تان بستگی دارد؛ در این راهنما همه را بررسی می‌کنیم.',
      '<h2>بودجه تعیین‌کننده است</h2><p>قبل از هر چیز سقف بودجه را مشخص کنید؛ سپس بین برندهای معتبر بازار (سامسونگ، شیائومی، اپل) انتخاب کنید.</p><h2>باتری و شارژ سریع</h2><p>برای استفاده روزانه، باتری بالای ۵۰۰۰ میلی‌آمپر با شارژ سریع ۶۷ واتی به بالا گزینه عالی است.</p>',
      'post', 'published', 'راهنمای خرید گوشی ۲۰۲۶ | وبلاگ کارزینتل', NOW())`,
  );

  // 7) محصول نمونه (برای دمو) — فقط اگر SAMPLE_DATA=1 (پیش‌فرض: خاموش؛ محصولات واقعی از پنل ادمین افزوده می‌شوند)
  if (process.env.SAMPLE_DATA === '1' && (await ds.query('SELECT COUNT(*) AS c FROM products'))[0].c === 0) {
    const colorValues = await ds.query(`SELECT av.id, av.value FROM attribute_values av WHERE av.attribute_id = 1 LIMIT 2`);
    const storageValue = await ds.query(`SELECT id FROM attribute_values WHERE attribute_id = 2 AND value = '128'`);
    await ds.query(
      `INSERT INTO products (code, category_id, brand_id, name, slug, short_description, description, features, status, published_at, warranty_months, rating_avg, rating_count)
       VALUES ('KRZ-IP16', 6, 1, 'گوشی اپل iPhone 16', 'apple-iphone-16',
        'آیفون ۱۶ با تراشه A18 — پرچمدار اپل',
        '<p>گوشی هوشمند اپل مدل iPhone 16 با نمایشگر ۶.۱ اینچی Super Retina XDR و دوربین ۴۸ مگاپیکسلی.</p>',
        JSON.stringify(['تراشه A18', 'دوربین ۴۸MP', 'مقاوم IP68', 'نمایشگر OLED']),
        'published', NOW(), 18, 4.6, 128)`,
    );
    const pid = (await ds.query(`SELECT id FROM products WHERE slug = 'apple-iphone-16'`))[0].id;
    let variantIndex = 0;
    for (const cv of colorValues) {
      variantIndex++;
      const sku = `IP16-128-${cv.value === 'مشکی' ? 'BLK' : 'WHT'}`;
      await ds.query(
        `INSERT INTO product_variants (product_id, sku, barcode, title, price, compare_at_price, stock_total, is_default, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [pid, sku, `6261000000${variantIndex}0`.slice(0, 12), `مشکی`.length ? `${cv.value} / ۱۲۸ گیگابایت` : null,
         variantIndex === 1 ? 820_000_000 : 815_000_000,
         variantIndex === 1 ? 880_000_000 : null,
         variantIndex === 1 ? 8 : 5, variantIndex === 1 ? 1 : 0],
      );
      const vid = (await ds.query('SELECT id FROM product_variants WHERE sku = ?', [sku]))[0].id;
      await ds.query('INSERT IGNORE INTO product_variant_values (variant_id, attribute_id, attribute_value_id) VALUES (?, 1, ?), (?, 2, ?)', [vid, cv.id, vid, storageValue[0].id]);
      await ds.query('INSERT IGNORE INTO inventory (variant_id, warehouse_id, quantity, reserved) VALUES (?, 1, ?, 0)', [vid, variantIndex === 1 ? 8 : 5]);
      await ds.query('UPDATE product_variants SET stock_total = ? WHERE id = ?', [variantIndex === 1 ? 8 : 5, vid]);
    }
    await ds.query(
      `UPDATE products SET min_price = 815000000, max_price = 820000000 WHERE id = ?`,
      [pid],
    );
    await ds.query(
      `INSERT INTO product_attributes (product_id, attribute_id, attribute_value_id, custom_value, sort_order) VALUES
       (?, 3, NULL, '8 گیگابایت', 1), (?, 4, NULL, '6.1', 2)`,
      [pid, pid],
    );
    await ds.query(`INSERT IGNORE INTO tags (id, name, slug) VALUES (1, 'پرفروش', 'bestseller')`);
    await ds.query(`INSERT IGNORE INTO product_tags (product_id, tag_id) VALUES (?, 1)`, [pid]);
    console.log('   ✅ محصول نمونه (iPhone 16) ساخته شد');
  }

  await ds.destroy();
  console.log('🌱 Seed completed');
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
