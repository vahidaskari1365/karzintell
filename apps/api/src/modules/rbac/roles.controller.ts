import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { RolesService } from './roles.service';

class CreateRoleDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  name: string;
  @IsString() @IsNotEmpty() @MaxLength(100)
  label: string;
  @IsOptional() @IsString() @MaxLength(255)
  description?: string;
  @IsOptional() @IsArray() @IsInt({ each: true })
  permissionIds?: number[];
}

class UpdateRoleDto {
  @IsOptional() @IsString() @MaxLength(100)
  label?: string;
  @IsOptional() @IsString() @MaxLength(255)
  description?: string;
  @IsOptional() @IsArray() @IsInt({ each: true })
  permissionIds?: number[];
}

@ApiTags('admin/roles')
@Controller('admin')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  // ------------------------------ مجوزها
  @Get('permissions')
  @RequirePermissions('roles.view')
  async permissions() {
    return { data: await this.roles.listPermissionsGrouped() };
  }

  // ------------------------------ نقش‌ها
  @Get('roles')
  @RequirePermissions('roles.view')
  async list() {
    return {
      data: (await this.roles.listRoles()).map((r) => ({
        id: r.id,
        name: r.name,
        label: r.label,
        description: r.description,
        isSystem: r.isSystem,
        permissionIds: (r.permissions || []).map((p) => p.id),
        permissionNames: (r.permissions || []).map((p) => p.name),
        usersCount: undefined,
      })),
    };
  }

  @Post('roles')
  @RequirePermissions('roles.create')
  async create(@Body() dto: CreateRoleDto, @CurrentUser() admin: AuthUser) {
    return { data: await this.roles.create(dto, admin) };
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.update')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto, @CurrentUser() admin: AuthUser) {
    return { data: await this.roles.update(id, dto, admin) };
  }

  @Delete('roles/:id')
  @RequirePermissions('roles.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.roles.remove(id) };
  }
}
