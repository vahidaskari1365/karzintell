import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { uuid } from './utils';

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  402: 'PAYMENT_FAILED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  410: 'GONE',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

/** خطای دامنه با کد سفارشی */
export class DomainException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super({ code, message, details }, status);
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const traceId = uuid();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'خطای داخلی سرور';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      code = body?.code || STATUS_CODES[status] || 'ERROR';
      if (status === 400 && Array.isArray(body?.message)) {
        code = 'VALIDATION_ERROR';
        message = 'اطلاعات واردشده معتبر نیست';
        details = body.message.map((m: string) => {
          const [field, ...rest] = String(m).split(' ');
          return { field, message: rest.join(' ') || String(m) };
        });
      } else {
        message = typeof body?.message === 'string' ? body.message : body?.message?.[0] || exception.message;
        if (body?.details) details = body.details;
      }
    } else {
      this.logger.error(
        `${req.method} ${req.url} → ${(exception as Error).message}`,
        (exception as Error).stack,
      );
    }

    res.status(status).json({
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      traceId,
    });
  }
}
