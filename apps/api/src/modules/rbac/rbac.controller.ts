import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RbacService } from "./rbac.service";
import { RequirePermissions, CurrentUser } from "../../common/decorators";
import { AuthUser } from "../../common/types";
import { PERMISSION_GROUPS } from "../../shared";

/** مدیریت نقش‌ها و مجوزها (پنل اپراتور) */
@ApiTags("admin/rbac")
@Controller("admin")
export class RbacController {
  constructor(private rbac: RbacService) {}

  @Get("permissions")
  @RequirePermissions("roles.view")
  listPermissions() {
    return { permissions: this.rbac.allPermissions(), groups: PERMISSION_GROUPS };
  }

  @Get("roles")
  @RequirePermissions("roles.view")
  listRoles() {
    return this.rbac.listRoles();
  }

  @Post("roles")
  @RequirePermissions("roles.create")
  createRole(@Body() body: { name: string; title: string; permissions?: string[] }, @CurrentUser() admin: AuthUser) {
    return this.rbac.createRole(body.name, body.title, body.permissions ?? [], admin);
  }

  @Patch("roles/:id")
  @RequirePermissions("roles.update")
  updateRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { title?: string; description?: string; permissions?: string[] },
    @CurrentUser() admin: AuthUser,
  ) {
    return this.rbac.updateRole(id, body, admin);
  }

  @Delete("roles/:id")
  @RequirePermissions("roles.delete")
  deleteRole(@Param("id", ParseIntPipe) id: number) {
    return this.rbac.deleteRole(id);
  }
}
