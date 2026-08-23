import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

/** پسوندهای امن مجاز برای مسیر فایل (جلوگیری از مسیرپیمایی و فایل‌های اجرایی) */
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm']);

function assertSafePath(path: string) {
  if (path.includes('..') || path.startsWith('/') || /[\u0000-\u001f]/.test(path))
    throw new BadRequestException({ code: 'INVALID_PATH', message: 'مسیر فایل نامعتبر است' });
  const ext = path.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext))
    throw new BadRequestException({ code: 'INVALID_PATH', message: 'پسوند فایل مجاز نیست' });
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger('Files');
  private s3 = new S3Client({
    endpoint: env.s3.endpoint,
    region: env.s3.region,
    credentials: { accessKeyId: env.s3.accessKey, secretAccessKey: env.s3.secretKey },
    forcePathStyle: true,
  });

  constructor(@InjectRepository(FileRecord) private readonly files: Repository<FileRecord>) {}

  publicUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${env.s3.publicUrl}/${path.replace(/^\/+/, '')}`;
  }

  /** presign برای آپلود مستقیم کلاینت به MinIO/S3 */
  async presign(input: { purpose: string; mimeType: string; originalName?: string }, ownerId: number) {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(input.mimeType))
      throw new BadRequestException({ code: 'FILE_TYPE_NOT_ALLOWED', message: 'نوع فایل مجاز نیست' });
    const folder = PURPOSE_FOLDERS[input.purpose] || 'misc';
    const ext = EXT_BY_MIME[input.mimeType];
    const path = `${folder}/${uuid()}.${ext}`;

    try {
      const command = new PutObjectCommand({
        Bucket: env.s3.bucket,
        Key: path,
        ContentType: input.mimeType,
      });
      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
      return {
        uploadUrl,
        path,
        publicUrl: this.publicUrl(path),
        expiresIn: 300,
        fields: {}, // برای سازگاری با فرمت form-data در سرویس‌های دیگر
      };
    } catch (e) {
      this.logger.error(`S3 presign failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException({
        code: 'STORAGE_UNAVAILABLE',
        message: 'سرویس ذخیره‌سازی (MinIO/S3) در دسترس نیست — docker compose را اجرا کنید',
      });
    }
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
        await this.uploadBufferToS3(largeBuffer, largePath, 'image/webp');

        // ۲. تصویر متوسط (Medium) - حداکثر ۶۰۰ پیکسل عرض/ارتفاع
        const mediumBuffer = await sharp(fileBuffer)
          .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        const mediumPath = `${folder}/${baseUuid}_medium.webp`;
        await this.uploadBufferToS3(mediumBuffer, mediumPath, 'image/webp');

        // ۳. تصویر کوچک (Thumbnail) - ۱۵۰ در ۱۵۰ کراپ شده
        const thumbBuffer = await sharp(fileBuffer)
          .resize(150, 150, { fit: 'cover' })
          .webp({ quality: 85 })
          .toBuffer();
        const thumbPath = `${folder}/${baseUuid}_thumb.webp`;
        await this.uploadBufferToS3(thumbBuffer, thumbPath, 'image/webp');

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
    await this.uploadBufferToS3(fileBuffer, path, mimeType);

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

  private async uploadBufferToS3(buffer: Buffer, path: string, mimeType: string) {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: env.s3.bucket,
          Key: path,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
    } catch (e) {
      this.logger.error(`S3 direct upload failed for ${path}: ${(e as Error).message}`);
      throw new ServiceUnavailableException({
        code: 'STORAGE_UNAVAILABLE',
        message: 'خطا در بارگذاری فایل در فضای S3 یا MinIO',
      });
    }
  }
}
