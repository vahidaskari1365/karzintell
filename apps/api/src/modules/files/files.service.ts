import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
    const folder = PURPOSE_FOLDERS[input.purpose] || 'misc';
    const ext = EXT_BY_MIME[input.mimeType] || (input.originalName?.split('.').pop() || 'bin').slice(0, 8);
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
}
