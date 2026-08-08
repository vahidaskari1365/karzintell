import "dotenv/config";

/** پارسرهای کمکی */
const int = (v: string | undefined, d: number): number => {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : d;
};
const bool = (v: string | undefined, d: boolean): boolean =>
  v === undefined ? d : v === "1" || v === "true" || v === "yes";

/**
 * تنظیمات متمرکز برنامه (خوانده‌شده از متغیرهای محیطی — نمونه در .env.example ریشه)
 * تمام ماژول‌ها فقط از همین آبجکت استفاده می‌کنند.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") !== "production",
  isProd: process.env.NODE_ENV === "production",

  port: int(process.env.API_PORT, 4000),
  publicUrl: process.env.API_PUBLIC_URL || "http://localhost:4000",
  webUrl: process.env.WEB_URL || "http://localhost:3000",
  globalPrefix: "api/v1",
  swagger: bool(process.env.SWAGGER, true),
  /** اگر خالی باشد رصد خطا (Sentry) کاملاً غیرفعال است و وابستگی‌ای لود نمی‌شود */
  sentryDsn: process.env.SENTRY_DSN || "",
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    "http://localhost:3000,http://127.0.0.1:3000,https://karzintell.vercel.app"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  bcryptRounds: int(process.env.BCRYPT_ROUNDS, 10),

  db: {
    host: process.env.DB_HOST || "localhost",
    port: int(process.env.DB_PORT, 3306),
    username: process.env.DB_USER || "karzintell",
    password: process.env.DB_PASSWORD || "secret",
    database: process.env.DB_NAME || "karzintell",
    logging: bool(process.env.DB_LOGGING, false),
  },

  redis: {
    enabled: !!(process.env.REDIS_URL || process.env.REDIS_HOST),
    host: process.env.REDIS_HOST || "localhost",
    port: int(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: int(process.env.REDIS_DB, 0),
    keyPrefix: process.env.REDIS_PREFIX || "krz:",
    url: process.env.REDIS_URL || "",
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
    accessTtl: int(process.env.JWT_ACCESS_TTL_SEC, 900),
    refreshTtl: int(process.env.JWT_REFRESH_TTL_SEC, 30 * 24 * 3600),
  },

  meili: {
    host: process.env.MEILI_HOST || "http://localhost:7700",
    masterKey: process.env.MEILI_API_KEY || "masterKey123",
    index: process.env.MEILI_INDEX || "products",
  },

  mail: {
    host: process.env.SMTP_HOST || "",
    port: int(process.env.SMTP_PORT, 1025),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "کارزینتل <no-reply@karzintell.ir>",
    fromName: "کارزینتل",
  },

  sms: {
    provider: process.env.SMS_DRIVER || "log", // log | kavenegar
    apiKey: process.env.SMS_API_KEY || "",
    sender: process.env.SMS_SENDER || "",
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    region: process.env.S3_REGION || "us-east-1",
    bucket: process.env.S3_BUCKET || "karzintell",
    accessKey: process.env.S3_ACCESS_KEY || "minioadmin",
    secretKey: process.env.S3_SECRET_KEY || "minioadmin",
    publicUrl: process.env.S3_PUBLIC_URL || "http://localhost:9000/karzintell",
  },

  order: {
    taxPercent: int(process.env.ORDER_TAX_PERCENT, 9),
    reserveMinutes: int(process.env.ORDER_PENDING_EXPIRE_MIN, 60),
  },

  payment: {
    defaultGateway: process.env.PAYMENT_GATEWAY || "manual",
    zarinpalMerchantId: process.env.ZARINPAL_MERCHANT_ID || "",
    zarinpalSandbox: bool(process.env.ZARINPAL_SANDBOX, true),
    idpayApiKey: process.env.IDPAY_API_KEY || "",
    idpaySandbox: bool(process.env.IDPAY_SANDBOX, true),
    nextpayApiKey: process.env.NEXTPAY_API_KEY || "",
    mellatTerminalId: process.env.MELLAT_TERMINAL_ID || "",
    mellatUsername: process.env.MELLAT_USERNAME || "",
    mellatPassword: process.env.MELLAT_PASSWORD || "",
    samanTerminalId: process.env.SAMAN_TERMINAL_ID || "",
    callbackUrl:
      process.env.PAYMENT_CALLBACK_BASE || "http://localhost:4000/api/v1/payments/callback",
    frontendResultUrl: process.env.PAYMENT_FRONT_RESULT_URL || "http://localhost:3000/checkout/callback",
  },

  webpush: {
    subject: process.env.VAPID_SUBJECT || "mailto:no-reply@karzintell.ir",
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
  },
} as const;

export default () => env;
