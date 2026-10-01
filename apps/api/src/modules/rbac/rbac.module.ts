import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Permission, PermissionUser, Role, RoleUser, User } from "../../database/entities";
import { RbacService } from "./rbac.service";
import { RbacController } from "./rbac.controller";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, PermissionUser, RoleUser])],
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
