import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { AdminUsersService } from './admin-users.service';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  AssignPermissionsDto,
  AssignRolesDto,
} from './admin-users.dto';

@ApiTags('admin/users')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @RequirePermissions('users.view')
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    const { items, total, page: p, limit: lim } = await this.service.list({ page, limit, q, status, role });
    return { data: items, meta: { page: p, limit: lim, total } };
  }

  @Get(':id')
  @RequirePermissions('users.view')
  async one(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.service.findOne(id) };
  }

  @Post()
  @RequirePermissions('users.create')
  async create(@Body() dto: AdminCreateUserDto, @CurrentUser() admin: AuthUser) {
    return { data: await this.service.create(dto, admin) };
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return { data: await this.service.update(id, dto, admin) };
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() admin: AuthUser) {
    return { data: await this.service.remove(id, admin) };
  }

  @Put(':id/roles')
  @RequirePermissions('users.assign_role')
  async assignRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolesDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return { data: await this.service.assignRoles(id, dto.roleIds, admin) };
  }

  @Put(':id/permissions')
  @RequirePermissions('users.assign_role')
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return { data: await this.service.assignPermissions(id, dto.items, admin) };
  }
}
