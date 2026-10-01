import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../modules/audit/audit.service';
import { RequestWithUser } from './types';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** ثبت خودکار عملیات نوشتنی روت‌های /admin در audit_logs */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const isAdminRoute = req.originalUrl?.includes('/admin/');
    const isWrite = WRITE_METHODS.has(req.method);
    const excludes = ['/admin/audit-logs'];

    if (!isAdminRoute || !isWrite || excludes.some((e) => req.originalUrl.startsWith(e)))
      return next.handle();

    return next.handle().pipe(
      tap({
        next: () => {
          const path = req.originalUrl.split('?')[0];
          const segments = path.split('/').filter(Boolean);
          const subjectType = segments[2] || null; // admin/{X} → X
          const numericId = segments.map((s) => Number(s)).find((n) => Number.isInteger(n) && n > 0);
          this.audit
            .record({
              userId: req.user?.id ?? null,
              action: `${req.method} ${subjectType || 'admin'}`,
              subjectType,
              subjectId: numericId ?? null,
              newValues: req.body && Object.keys(req.body).length ? req.body : null,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            })
            .catch(() => undefined);
        },
      }),
    );
  }
}
