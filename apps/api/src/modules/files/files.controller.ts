import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsMimeType, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { FilesService } from './files.service';

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

  @Post('admin/files/presign')
  @RequirePermissions('files.manage')
  async adminPresign(@Body() dto: PresignDto, @CurrentUser() user: AuthUser) {
    return { data: await this.files.presign(dto, user.id) };
  }
}
