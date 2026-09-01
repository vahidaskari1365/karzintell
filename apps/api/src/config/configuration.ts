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
 * دیتابیس: MySQL 8 / MariaDB (سازگار با cPanel)
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
  /**
   * CORS:
   * - development: فقط localhost
   * - production: فقط دامنه واقعی سایت (با www)
   * همیشه با CORS_ORIGINS قابل override است.
   */
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    ((process.env.NODE_ENV || "development") === "production"
      ? "https://karzintell.com,https://www.karzintell.com"
      : "http://localhost:3000,http://127.0.0.1:3000")
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  bcryptRounds: int(process.env.BCRYPT_ROUNDS, 10),

  db: {
    // MySQL / MariaDB برای هاست cPanel
    type: "mysql" as const,
    host: process.env.DB_HOST || "localhost",
    port: int(process.env.DB_PORT, 3306),
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "karzintell",
    // SSL برای MySQL روی هاست محلی/معیمولی غیرفعال است
    ssl: false,
    // در Shared Hosting پیش‌فرض ۵ اتصال توصیه می‌شود
    poolSize: int(process.env.DB_POOL_SIZE, 5),
    logging: bool(process.env.DB_LOGGING, false),
    // Charset برای پشتیبانی از UTF-8 فارسی
    charset: "utf8mb4",
    timezone: "+03:30", // Tehran timezone
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
    accessSecret: process.env.JWT_ACCESS_SECRET || "change-me-access-secret-32chars-minimum",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "change-me-refresh-secret-32chars-minimum",
    accessTtl: int(process.env.JWT_ACCESS_TTL_SEC, 900),
    refreshTtl: int(process.env.JWT_REFRESH_TTL_SEC, 30 * 24 * 3600),
  },

  meili: {
    host: process.env.MEILI_HOST || "http://localhost:7700",
    masterKey: process.env.MEILI_API_KEY || "change-me-meilisearch-key",
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

  /**
   * ذخیره‌سازی فایل‌ها:
   * - local (پیش‌فرض): روی دیسک خود هاست (cPanel/Shared Hosting) — /uploads سرو می‌شود
   * - s3: هر سروس سازگار با S3 (MinIO/آمازون) — برای مقیاس بیشتر، اختیاری
   */
  storage: {
    driver: (process.env.STORAGE_DRIVER || "local") as "local" | "s3",
    /** پوشه ذخیره فایل‌ها روی دیسک (پیش‌فرض: ./uploads نسبت به cwd یعنی ریشه apps/api) */
    dir: process.env.STORAGE_DIR || "uploads",
    /**
     * URL عمومی فایل‌ها. پیش‌فرض: از API_PUBLIC_URL + /uploads ساخته می‌شود
     * (یعنی فایل‌ها از دامنه خود سایت سرو می‌شوند).
     */
    publicUrl:
      process.env.STORAGE_PUBLIC_URL ||
      `${(process.env.API_PUBLIC_URL || "http://localhost:4000").replace(/\/+$/, "")}/uploads`,
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    region: process.env.S3_REGION || "us-east-1",
    bucket: process.env.S3_BUCKET || "karzintell",
    accessKey: process.env.S3_ACCESS_KEY || "change-me-access-key",
    secretKey: process.env.S3_SECRET_KEY || "change-me-secret-key",
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

/**
 * سخت‌گیری امنیتی در Production: اگر اسرار حیاتی روی مقادیر پیش‌فرض/ضعیف باقی
 * مانده باشند، برنامه از راه‌اندازی خودداری می‌کند (Fail-Closed) تا سایت با
 * تنظیمات ناامن بالا نیاید.
 */
const WEAK_SECRETS = [
  'dev-access-secret-change-me',
  'dev-refresh-secret-change-me',
  'change-me-access-secret',
  'change-me-refresh-secret',
  'secret',
  'root_secret',
  'masterKey123',
  'minioadmin',
  'secret_secret_secret',
  'change-me-secure-password',
];

export function assertSecureConfiguration() {
  if (!env.isProd) return;

  const problems: string[] = [];

  const check = (label: string, value: string | undefined, minLen = 0) => {
    if (!value) return problems.push(`${label} تنظیم نشده است`);
    if (WEAK_SECRETS.includes(value)) return problems.push(`${label} برابر مقدار پیش‌فرض است`);
    if (minLen && value.length < minLen) return problems.push(`${label} کوتاه‌تر از ${minLen} کاراکتر است`);
  };

  check('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET, 32);
  check('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET, 32);
  check('DB_PASSWORD', process.env.DB_PASSWORD);
  if (!process.env.DB_HOST && !process.env.DB_NAME) problems.push('DB_HOST و DB_NAME تنظیم نشده‌اند');
  if (env.redis.enabled) check('REDIS_PASSWORD', process.env.REDIS_PASSWORD);

  if (problems.length) {
    throw new Error(
      `[امنیت] تنظیمات Production ناامن است؛ برای راه‌اندازی امن، مقادیر زیر را اصلاح کنید:\n` +
        problems.map((p) => `  - ${p}`).join('\n') +
        `\n  (مثلاً: openssl rand -base64 48 برای تولید JWT_ACCESS_SECRET و JWT_REFRESH_SECRET)`,
    );
  }
}

assertSecureConfiguration();
