import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RequestWithUser } from './types';
import { IS_PUBLIC_KEY } from './decorators';
import { env } from '../config/configuration';
import { RbacService } from '../modules/rbac/rbac.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    // روت عمومی: اگر توکن هست، کاربر را تنظیم می‌کنیم (اختیاری) وگرنه عبور
    if (isPublic) {
      if (token) await this.authenticate(req, token).catch(() => undefined);
      return true;
    }

    if (!token) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'ورود لازم است' });
    await this.authenticate(req, token);
    return true;
  }

  private async authenticate(req: RequestWithUser, token: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; typ: string }>(token, {
        secret: env.jwt.accessSecret,
      });
      if (payload.typ !== 'access') throw new Error('bad token');
      req.user = await this.rbac.buildAuthUser(payload.sub);
    } catch {
      throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'نشست منقضی شده است' });
    }
  }
}
