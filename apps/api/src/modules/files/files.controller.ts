import { Body, Controller, Post, UseInterceptors, UploadedFile, Query, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { FilesService, ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_BYTES } from './files.service';

class PresignDto {
  @IsIn(['product_image', 'product_video', 'banner', 'avatar', 'page', 'brand', 'category', 'misc'] as const)
  purpose: 'product_image' | 'product_video' | 'banner' | 'avatar' | 'page' | 'brand' | 'category' | 'misc';

  @IsString() @IsNotEmpty()
  mimeType: string;

  @IsOptional() @IsString() @MaxLength(255)
  originalName?: string;
}

class ConfirmDto extends PresignDto {
  @IsString() @IsNotEmpty()
  path: string;

  @IsOptional() @IsNumber()
  sizeBytes?: number;
}

@ApiTags('files')
@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('files/presign')
  async presign(@Body() dto: PresignDto, @CurrentUser() user: AuthUser) {
    return { data: await this.files.presign(dto, user.id) };
  }

  @Post('files/confirm')
  async confirm(@Body() dto: ConfirmDto, @CurrentUser() user: AuthUser) {
    return { data: await this.files.confirm(dto, user.id) };
  }

  @Post('files/upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
        return cb(new BadRequestException({ code: 'FILE_TYPE_NOT_ALLOWED', message: 'نوع فایل مجاز نیست' }), false);
      }
      cb(null, true);
    },
  }))
  async upload(
    @UploadedFile() file: any,
    @Query('purpose') purpose: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'فایلی ارسال نشده است' });
    }
    return {
      data: await this.files.uploadAndOptimize(
        file.buffer,
        file.originalname,
        file.mimetype,
        purpose || 'misc',
        user.id,
      ),
    };
  }

  @Post('admin/files/presign')
  @RequirePermissions('files.manage')
  async adminPresign(@Body() dto: PresignDto, @CurrentUser() user: AuthUser) {
    return { data: await this.files.presign(dto, user.id) };
  }
}
