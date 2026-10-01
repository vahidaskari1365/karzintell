import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep as nodePathSep } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileRecord } from '../../database/entities';
import { env } from '../../config/configuration';
import { uuid } from '../../common/utils';

const PURPOSE_FOLDERS: Record<string, string> = {
  product_image: 'products',
  product_video: 'products/videos',
  banner: 'banners',
  avatar: 'avatars',
  page: 'pages',
  brand: 'brands',
  category: 'categories',
  misc: 'misc',
};

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm',
};

/** فهرست بسته‌ی انواع مجاز برای آپلود — از بارگذاری HTML/SVG/JS و اسکریپت جلوگیری می‌کند */
export const ALLOWED_UPLOAD_MIME_TYPES: ReadonlySet<string> = new Set(Object.keys(EXT_BY_MIME));

/** حداکثر حجم مجاز هر فایل آپلودی (۱۰ مگابایت) */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** اعتبار URL آپلود موقت برای ذخیره‌سازی محلی (۵ دقیقه) */
const PRESIGN_TTL_SEC = 300;

/** پسوندهای امن مجاز برای مسیر فایل (جلوگیری از مسیرپیمایی و فایل‌های اجرایی) */
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm']);

function assertSafePath(path: string) {
  if (path.includes('..') || path.startsWith('/') || /[\u0000-\u001f]/.test(path))
    throw new BadRequestException({ code: 'INVALID_PATH', message: 'مسیر فایل نامعتبر است' });
  const ext = path.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext))
    throw new BadRequestException({ code: 'INVALID_PATH', message: 'پسوند فایل مجاز نیست' });
}

/**
 * خدمات فایل با دو درایور ذخیره‌سازی:
 *
 *  - local (پیش‌فرض، مناسب cPanel/Shared Hosting): فایل روی دیسک خود هاست
 *    در STORAGE_DIR (پیش‌فرض: ./uploads) ذخیره می‌شود و از طریق مسیر /uploads
 *    توسط خود Backend سرو می‌گردد. هیچ سروس خارجی لازم نیست.
 *
 *  - s3 (اختیاری، مقیاس‌پذیری): هر سروس سازگار با S3 مثل MinIO/آمازون.
 *
 * انتخاب درایور با متغیر STORAGE_DRIVER انجام می‌شود.
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger('Files');
  private s3: S3Client | null = null;

  constructor(@InjectRepository(FileRecord) private readonly files: Repository<FileRecord>) {}

  private get driver() {
    return env.storage.driver;
  }

  private s3Client(): S3Client {
    if (!this.s3) {
      this.s3 = new S3Client({
        endpoint: env.s3.endpoint,
        region: env.s3.region,
        credentials: { accessKeyId: env.s3.accessKey, secretAccessKey: env.s3.secretKey },
        forcePathStyle: true,
      });
    }
    return this.s3;
  }

  /** مسیر مطلق فایل روی دیسک — همیشه داخل STORAGE_DIR می‌ماند */
  private localFilePath(path: string): string {
    const root = resolve(process.cwd(), env.storage.dir);
    const target = resolve(root, path);
    if (!target.startsWith(root + nodePathSep)) {
      throw new BadRequestException({ code: 'INVALID_PATH', message: 'مسیر فایل نامعتبر است' });
    }
    return target;
  }

  /** base URL عمومی فایل‌ها (بر اساس درایور) */
  private storageBaseUrl(): string {
    const base = this.driver === 's3' ? env.s3.publicUrl : env.storage.publicUrl;
    return base.replace(/\/+$/, '');
  }

  publicUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${this.storageBaseUrl()}/${path.replace(/^\/+/, '')}`;
  }

  /**
   * presign برای آپلود مستقیم کلاینت:
   * - درایور local: URL آپلود روی خود Backend (روت عمومی files/presigned)
   *   با توکن تک‌باری HMAC که فقط برای همین مسیر و تا ۵ دقیقه معتبر است.
   * - درایور s3: URL امضاشده S3.
   */
  async presign(input: { purpose: string; mimeType: string; originalName?: string }, ownerId: number) {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(input.mimeType))
      throw new BadRequestException({ code: 'FILE_TYPE_NOT_ALLOWED', message: 'نوع فایل مجاز نیست' });
    const folder = PURPOSE_FOLDERS[input.purpose] || 'misc';
    const ext = EXT_BY_MIME[input.mimeType];
    const path = `${folder}/${uuid()}.${ext}`;

    if (this.driver === 's3') {
      try {
        const command = new PutObjectCommand({
          Bucket: env.s3.bucket,
          Key: path,
          ContentType: input.mimeType,
        });
        const uploadUrl = await getSignedUrl(this.s3Client(), command, { expiresIn: PRESIGN_TTL_SEC });
        return {
          uploadUrl,
          path,
          publicUrl: this.publicUrl(path),
          expiresIn: PRESIGN_TTL_SEC,
          fields: {}, // برای سازگاری با فرمت form-data در سرویس‌های دیگر
        };
      } catch (e) {
        this.logger.error(`S3 presign failed: ${(e as Error).message}`);
        throw new ServiceUnavailableException({
          code: 'STORAGE_UNAVAILABLE',
          message: 'سرویس ذخیره‌سازی S3 در دسترس نیست',
        });
      }
    }

    // درایور local: توکن تک‌باری + URL روی خود Backend
    const exp = Math.floor(Date.now() / 1000) + PRESIGN_TTL_SEC;
    const token = this.signPresignToken(path, input.purpose, exp);
    const base = env.publicUrl.replace(/\/+$/, '');
    return {
      uploadUrl: `${base}/${env.globalPrefix}/files/presigned?token=${encodeURIComponent(token)}`,
      path,
      publicUrl: this.publicUrl(path),
      expiresIn: PRESIGN_TTL_SEC,
      fields: {},
    };
  }

  private signPresignToken(path: string, purpose: string, exp: number): string {
    const payload = `${path}|${purpose}|${exp}`;
    const sig = createHash('sha256').update(`${env.jwt.accessSecret}:${payload}`).digest('hex');
    return `${Buffer.from(payload).toString('base64url')}.${sig}`;
  }

  /**
   * دریافت فایل آپلودشده از روت presigned (درایور local) — توکن تک‌باری
   * باید برای مسیر و در بازه اعتبار امضاشده باشد.
   */
  async storePresigned(token: string, body: Buffer, mimeType?: string) {
    if (this.driver !== 'local')
      throw new BadRequestException({ code: 'NOT_ALLOWED', message: 'این روت فقط برای ذخیره‌سازی محلی است' });
    const parts = token.split('.');
    if (parts.length !== 2) throw this.presignInvalid();
    const [payloadB64, sig] = parts;
    let payload: string;
    try {
      payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    } catch {
      throw this.presignInvalid();
    }
    const expected = createHash('sha256').update(`${env.jwt.accessSecret}:${payload}`).digest('hex');
    if (!timingSafeEqualHex(sig, expected)) throw this.presignInvalid();

    const [path, purpose, expStr] = payload.split('|');
    if (!path || !purpose || !expStr) throw this.presignInvalid();
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() / 1000 > exp) throw this.presignInvalid();

    assertSafePath(path);
    if (!PURPOSE_FOLDERS[purpose] && purpose !== 'misc')
      throw new BadRequestException({ code: 'INVALID_PATH', message: 'purpose نامعتبر است' });
    const mime = (mimeType || '').split(';')[0].trim().toLowerCase();
    if (mime && !ALLOWED_UPLOAD_MIME_TYPES.has(mime))
      throw new BadRequestException({ code: 'FILE_TYPE_NOT_ALLOWED', message: 'نوع فایل مجاز نیست' });

    await this.storeBuffer(body, path, mimeType || 'application/octet-stream');
    return { path, publicUrl: this.publicUrl(path) };
  }

  private presignInvalid() {
    return new BadRequestException({ code: 'PRESIGN_INVALID', message: 'لینک آپلود نامعتبر یا منقضی است' });
  }

  async confirm(input: { path: string; purpose: string; originalName?: string; mimeType?: string; sizeBytes?: number }, ownerId: number) {
    assertSafePath(input.path);
    if (input.mimeType && !ALLOWED_UPLOAD_MIME_TYPES.has(input.mimeType))
      throw new BadRequestException({ code: 'FILE_TYPE_NOT_ALLOWED', message: 'نوع فایل مجاز نیست' });
    return this.files.save(
      this.files.create({
        path: input.path,
        purpose: input.purpose,
        originalName: input.originalName ?? null,
        mimeType: input.mimeType ?? null,
        sizeBytes: input.sizeBytes ?? null,
        ownerId,
      }),
    );
  }

  /** آپلود مستقیم بافر فایل و بهینه‌سازی فرمت و رزولوشن آن به WebP در ۳ سایز */
  async uploadAndOptimize(fileBuffer: Buffer, originalName: string, mimeType: string, purpose: string, ownerId: number) {
    let sharp: any;
    try {
      // sharp یک dependency اختیاری است؛ نبودن آن فقط بهینه‌سازی تصویر را غیرفعال می‌کند
      sharp = require('sharp');
    } catch {
      this.logger.warn('کتابخانه Sharp نصب نشده است؛ تصویر بهینه‌سازی نخواهد شد.');
    }

    const folder = PURPOSE_FOLDERS[purpose] || 'misc';
    const originalExt = originalName.split('.').pop() || 'bin';
    const baseUuid = uuid();

    if (sharp && mimeType.startsWith('image/') && mimeType !== 'image/gif') {
      try {
        // ۱. تصویر بزرگ (Large) - حداکثر ۱۲۰۰ پیکسل عرض/ارتفاع
        const largeBuffer = await sharp(fileBuffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        const largePath = `${folder}/${baseUuid}_large.webp`;
        await this.storeBuffer(largeBuffer, largePath, 'image/webp');

        // ۲. تصویر متوسط (Medium) - حداکثر ۶۰۰ پیکسل عرض/ارتفاع
        const mediumBuffer = await sharp(fileBuffer)
          .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        const mediumPath = `${folder}/${baseUuid}_medium.webp`;
        await this.storeBuffer(mediumBuffer, mediumPath, 'image/webp');

        // ۳. تصویر کوچک (Thumbnail) - ۱۵۰ در ۱۵۰ کراپ شده
        const thumbBuffer = await sharp(fileBuffer)
          .resize(150, 150, { fit: 'cover' })
          .webp({ quality: 85 })
          .toBuffer();
        const thumbPath = `${folder}/${baseUuid}_thumb.webp`;
        await this.storeBuffer(thumbBuffer, thumbPath, 'image/webp');

        const record = await this.files.save(
          this.files.create({
            path: largePath,
            purpose,
            originalName,
            mimeType: 'image/webp',
            sizeBytes: largeBuffer.length,
            ownerId,
          }),
        );

        return {
          id: record.id,
          path: largePath,
          publicUrl: this.publicUrl(largePath),
          sizes: {
            large: this.publicUrl(largePath),
            medium: this.publicUrl(mediumPath),
            thumbnail: this.publicUrl(thumbPath),
          }
        };
      } catch (e) {
        this.logger.error(`Sharp image optimization failed: ${(e as Error).message}`);
      }
    }

    // فالبک برای تصاویر متحرک گیف، ویدیو یا در صورت خطا
    const ext = EXT_BY_MIME[mimeType] || originalExt;
    const path = `${folder}/${baseUuid}.${ext}`;
    await this.storeBuffer(fileBuffer, path, mimeType);

    const record = await this.files.save(
      this.files.create({
        path,
        purpose,
        originalName,
        mimeType,
        sizeBytes: fileBuffer.length,
        ownerId,
      }),
    );

    return {
      id: record.id,
      path,
      publicUrl: this.publicUrl(path),
    };
  }

  /** ذخیره بافر در درایور فعال (local: دیسک | s3: آبجکت استور) */
  private async storeBuffer(buffer: Buffer, path: string, mimeType: string) {
    try {
      if (this.driver === 's3') {
        await this.s3Client().send(
          new PutObjectCommand({
            Bucket: env.s3.bucket,
            Key: path,
            Body: buffer,
            ContentType: mimeType,
          }),
        );
        return;
      }
      const target = this.localFilePath(path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, buffer);
    } catch (e) {
      this.logger.error(`file storage failed for ${path}: ${(e as Error).message}`);
      throw new ServiceUnavailableException({
        code: 'STORAGE_UNAVAILABLE',
        message: 'خطا در ذخیره‌سازی فایل روی هاست',
      });
    }
  }
}

/** مقایسه ثابت‌زمانه برای امضای hex */
function timingSafeEqualHex(a: string, b: string): boolean {
  const ha = Buffer.from(a, 'hex');
  const hb = Buffer.from(b, 'hex');
  if (ha.length !== hb.length) return false;
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}
