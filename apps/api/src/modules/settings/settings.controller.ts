import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { SettingsService } from './settings.service';

class SettingItemDto {
  @IsString() key: string;
  @IsString() value: string;
  @IsOptional() @IsIn(['string', 'number', 'boolean', 'json'] as const)
  type?: 'string' | 'number' | 'boolean' | 'json';
  @IsOptional() @IsString() group?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

class BulkSettingsDto {
  @IsArray()
  items: SettingItemDto[];
}

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Public()
  @Get('settings/public')
  async publicSettings() {
    return { data: await this.service.publicSettings() };
  }

  @Get('admin/settings')
  @RequirePermissions('settings.manage')
  async adminList() {
    return { data: await this.service.adminList() };
  }

  @Put('admin/settings')
  @RequirePermissions('settings.manage')
  async update(@Body() dto: BulkSettingsDto, @CurrentUser() admin: AuthUser) {
    return { data: await this.service.upsertBulk(dto.items, admin.id) };
  }
}
