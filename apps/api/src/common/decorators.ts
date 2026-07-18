import { SetMetadata, createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { PermissionKey } from "@karzintell/shared";

export const IS_PUBLIC_KEY = "isPublic";
/** مسیر عمومی (بدون نیاز به JWT) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = "requiredPermissions";
/** نیازمندی مجوز — با Guard سراسری PermissionsGuard بررسی می‌شود */
export const RequirePermissions = (...perms: PermissionKey[]) => SetMetadata(PERMISSIONS_KEY, perms);

export interface AuthContext {
  userId: number;
  permissions: Set<string>;
  mustChangePassword?: boolean;
}

export const CurrentUser = createParamDecorator((data: keyof AuthContext | undefined, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const auth: AuthContext | undefined = req.auth;
  return data ? auth?.[data] : auth;
});

export const Ip = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return ((req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "") as string;
});

export const UserAgent = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return String(req.headers["user-agent"] || "").slice(0, 250);
});
