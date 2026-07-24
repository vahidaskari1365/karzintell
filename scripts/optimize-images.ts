import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

async function run() {
  const args = process.argv.slice(2);
  const inputPath = args[0];
  if (!inputPath) {
    console.log('❌ لطفا مسیر فایل عکس ورودی را وارد کنید.');
    console.log('مثال: npx tsx scripts/optimize-images.ts input.jpg');
    process.exit(1);
  }

  let sharp: any;
  try {
    sharp = require('sharp');
  } catch {
    console.error('❌ کتابخانه sharp یافت نشد. لطفا ابتدا npm install را اجرا کنید.');
    process.exit(1);
  }

  const absoluteInputPath = path.resolve(inputPath);
  if (!fs.existsSync(absoluteInputPath)) {
    console.error(`❌ فایل ورودی یافت نشد: ${absoluteInputPath}`);
    process.exit(1);
  }

  const dir = path.dirname(absoluteInputPath);
  const ext = path.extname(absoluteInputPath);
  const name = path.basename(absoluteInputPath, ext);

  console.log(`⏳ در حال پردازش و بهینه‌سازی فایل: ${name}${ext} ...`);

  try {
    // ۱. نسخه بزرگ (Large)
    const largePath = path.join(dir, `${name}_large.webp`);
    await sharp(absoluteInputPath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(largePath);
    console.log(`   ✅ نسخه بزرگ با موفقیت ایجاد شد: ${largePath}`);

    // ۲. نسخه متوسط (Medium)
    const mediumPath = path.join(dir, `${name}_medium.webp`);
    await sharp(absoluteInputPath)
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(mediumPath);
    console.log(`   ✅ نسخه متوسط با موفقیت ایجاد شد: ${mediumPath}`);

    // ۳. نسخه بندانگشتی (Thumbnail)
    const thumbPath = path.join(dir, `${name}_thumb.webp`);
    await sharp(absoluteInputPath)
      .resize(150, 150, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(thumbPath);
    console.log(`   ✅ نسخه بندانگشتی با موفقیت ایجاد شد: ${thumbPath}`);

    console.log(`\n🎉 عملیات بهینه‌سازی تصاویر با موفقیت به پایان رسید.`);
  } catch (error) {
    console.error('❌ خطا در حین پردازش تصویر:', error);
    process.exit(1);
  }
}

run();
