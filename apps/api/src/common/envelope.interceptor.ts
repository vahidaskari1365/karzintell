import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Envelope استاندارد: کنترلرها `{ data, meta? }` یا داده خام برمی‌گردانند.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result) => {
        if (result && typeof result === 'object' && 'data' in (result as any)) {
          const r = result as { data: unknown; meta?: Record<string, unknown> };
          return { success: true, data: r.data, ...(r.meta ? { meta: r.meta } : {}) };
        }
        return { success: true, data: result ?? null };
      }),
    );
  }
}
