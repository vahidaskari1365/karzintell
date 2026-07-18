import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Observable, map } from "rxjs";
import { API_MESSAGES } from "@karzintell/shared";

/** خروجی پاسخ تمام endpoint ها را در قالب استاندارد پروژه قرار می‌دهد */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      map((value) => {
        if (value && typeof value === "object" && "__envelope" in value) return value; // از قبل wrap شده
        if (value && typeof value === "object" && "data" in value && Object.keys(value).every((k) => k === "data" || k === "meta")) {
          return { code: 0, message: "ok", data: (value as any).data, meta: { requestId: req.id, ...(value as any).meta } };
        }
        return { code: 0, message: "ok", data: value ?? null, meta: { requestId: req.id } };
      }),
    );
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 1000;
    let message: string = API_MESSAGES[1000];
    let errors: { field?: string; message: string }[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body: any = exception.getResponse();
      const rawMsg = typeof body === "string" ? body : body?.message;
      if ((exception as any).code && typeof (exception as any).code === "number") {
        code = (exception as any).code;
        message = Array.isArray(rawMsg) ? (API_MESSAGES[1004] as string) : String(rawMsg ?? API_MESSAGES[code]);
        if (Array.isArray(rawMsg)) errors = rawMsg.map((m: any) => ({ message: String(m) }));
        const details = (exception as any).details;
        if (details) errors = Array.isArray(details) ? details : [{ message: String(details) }];
      } else {
        code = status === 401 ? 1001 : status === 403 ? 1002 : status === 404 ? 1003 : status === 429 ? 1006 : status >= 500 ? 1000 : 1004;
        message = Array.isArray(rawMsg) ? (API_MESSAGES[code] as string) : String(rawMsg ?? API_MESSAGES[code]);
        if (Array.isArray(rawMsg)) errors = rawMsg.map((m: any) => ({ message: String(m) }));
      }
    } else if (exception instanceof Error) {
      message = process.env.NODE_ENV === "production" ? message : `${message}: ${exception.message}`;
    }

    res.status(status).json({
      code,
      message,
      data: null,
      ...(errors ? { errors } : {}),
      meta: { requestId: (req as any).id },
    });
  }
}
