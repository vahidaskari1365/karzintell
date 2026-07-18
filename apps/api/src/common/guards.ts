import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  Module,
  Global,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { IS_PUBLIC_KEY, PERMISSIONS_KEY, AuthContext } from "./decorators";
import { errors } from "./domain-error";
import { PermissionsResolverService } from "./permissions-resolver.service";

/** احراز هویت سراسری — مسیرهای @Public از آن معاف‌اند */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private reflector: Reflector,
    private resolver: PermissionsResolverService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    req.auth = undefined;
    const token = this.extract(req);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!token) {
      if (isPublic) return true;
      throw errors.unauthorized();
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(token, {
        secret: this.config.get<string>("jwt.accessSecret"),
      });
      const { permissions, mustChangePassword } = await this.resolver.resolve(Number(payload.sub));
      const auth: AuthContext = { userId: Number(payload.sub), permissions, mustChangePassword };
      req.auth = auth;
      return true;
    } catch (e: any) {
      if (isPublic) return true; // توکن خراب در مسیر عمومی نادیده گرفته می‌شود
      if (e?.name === "TokenExpiredError") throw errors.unauthorized("توکن منقضی شده است");
      throw e instanceof Error && (e as any).code ? e : errors.unauthorized();
    }
  }

  private extract(req: any): string | undefined {
    const h = req.headers.authorization;
    if (h?.startsWith("Bearer ")) return h.slice(7);
    return undefined;
  }
}

/** بررسی مجوز — بعد از JwtAuthGuard اجرا می‌شود */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required || required.length === 0) return true;
    const req = ctx.switchToHttp().getRequest();
    const auth: AuthContext | undefined = req.auth;
    if (!auth) throw errors.unauthorized();
    const ok = required.every((p) => auth.permissions.has(p));
    if (!ok) throw errors.forbidden();
    return true;
  }
}

@Global()
@Module({ providers: [PermissionsResolverService, JwtAuthGuard, PermissionsGuard], exports: [PermissionsResolverService, JwtAuthGuard, PermissionsGuard] })
export class GuardModule {}
