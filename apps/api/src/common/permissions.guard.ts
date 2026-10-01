import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './decorators';
import { RequestWithUser } from './types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || !required.length) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;
    if (!user) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'دسترسی مجاز نیست' });

    const perms = user.permissions;
    if (perms === '*') return true;
    const ok = required.every((p) => perms.includes(p));
    if (!ok)
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'مجوز کافی برای این بخش ندارید',
      });
    return true;
  }
}
