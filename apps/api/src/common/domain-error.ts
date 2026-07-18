import { HttpException } from "@nestjs/common";
import { API_MESSAGES } from "@karzintell/shared";

/** خطای دامنه با کد استاندارد پروژه (Envelope: {code, message, data:null, errors}) */
export class DomainError extends HttpException {
  constructor(
    public readonly code: number,
    message?: string,
    public readonly details?: unknown,
    status?: number,
  ) {
    const finalStatus =
      status ??
      (code === 1001 ? 401 : code === 1002 ? 403 : code === 1003 ? 404 : code === 1004 ? 422 : code === 1006 ? 429 : 400);
    super(message ?? API_MESSAGES[code] ?? API_MESSAGES[1000], finalStatus);
  }
}

export const errors = {
  unauthorized: (msg?: string) => new DomainError(1001, msg),
  forbidden: (msg?: string) => new DomainError(1002, msg),
  notFound: (msg?: string) => new DomainError(1003, msg ?? "مورد درخواستی یافت نشد"),
  badRequest: (msg: string, details?: unknown) => new DomainError(1004, msg, details, 400),
  validation: (details: unknown, msg?: string) => new DomainError(1004, msg ?? "اطلاعات ارسالی معتبر نیست", details, 422),
  tooMany: () => new DomainError(1006),
  outOfStock: (msg = "موجودی انبار کافی نیست") => new DomainError(1007, msg),
  invalidState: (msg?: string) => new DomainError(1008, msg),
  invalidCoupon: (msg?: string) => new DomainError(1009, msg),
  insufficientWallet: () => new DomainError(1010),
  invalidOtp: (msg?: string) => new DomainError(1011, msg),
  mustChangePassword: () => new DomainError(1012),
  duplicate: (msg = "درخواست تکراری است") => new DomainError(1013, msg),
  txExpired: (msg?: string) => new DomainError(1005, msg ?? "تراکنش نامعتبر یا منقضی است"),
  internal: (msg?: string) => new DomainError(1000, msg ?? "خطای داخلی سرور", undefined, 500),
};
