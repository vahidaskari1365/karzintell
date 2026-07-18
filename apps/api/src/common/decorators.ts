import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@karzintell/shared';
import { AuthUser, RequestWithUser } from './types';

export const IS_PUBLIC_KEY = 'isPublic';
/** مسیر عمومی (بدون نیاز به JWT؛ اگر توکن باشد کاربر تشخیص داده می‌شود) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'requiredPermissions';
/** نیازمندی مجوز — توسط PermissionsGuard سراسری بررسی می‌شود */
export const RequirePermissions = (...perms: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

/** کاربر جاری (پر شده توسط JwtAuthGuard) */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] | undefined => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;
    return data ? user?.[data] : user;
  },
);

/** شناسه سبد مهمان از هدر X-Cart-Session یا کوکی krz_sid */
export const CartSession = createParamDecorator((_: unknown, ctx: ExecutionContext): string | null => {
  const req = ctx.switchToHttp().getRequest<RequestWithUser>();
  const header = (req.headers['x-cart-session'] as string) || (req as any).cookies?.['krz_sid'];
  if (header && /^[0-9a-fA-F-]{36}$/.test(header)) {
    req.cartSessionId = header;
    return header;
  }
  return req.cartSessionId ?? null;
});
