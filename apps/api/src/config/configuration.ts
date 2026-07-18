/** خواندن متمرکز تنظیمات محیطی با مقادیر پیش‌فرض امن برای توسعه */
export default () => ({
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.API_PORT || "4000", 10),
  publicUrl: process.env.API_PUBLIC_URL || "http://localhost:4000",
  webUrl: process.env.WEB_URL || "http://localhost:3000",
  database: {
    driver: process.env.DB_DRIVER || "mysql", // mysql | sqlite
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    name: process.env.DB_NAME || "karzintell",
    user: process.env.DB_USER || "karzintell",
    password: process.env.DB_PASSWORD || "secret",
    sqlitePath: process.env.DB_SQLITE_PATH || "./var/karzintell.db",
  },
  redis: {
    url: process.env.REDIS_URL || "", // خالی = fallback حافظه‌ای
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
    accessTtlSec: parseInt(process.env.JWT_ACCESS_TTL_SEC || "900", 10),
    refreshTtlSec: parseInt(process.env.JWT_REFRESH_TTL_SEC || String(30 * 24 * 3600), 10),
  },
  meili: {
    host: process.env.MEILI_HOST || "",
    apiKey: process.env.MEILI_API_KEY || "",
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || "",
    bucket: process.env.S3_BUCKET || "karzintell",
    accessKey: process.env.S3_ACCESS_KEY || "",
    secretKey: process.env.S3_SECRET_KEY || "",
    publicUrl: process.env.S3_PUBLIC_URL || "",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "0",
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "1025", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "کارزینتل <no-reply@karzintell.ir>",
  },
  sms: {
    driver: process.env.SMS_DRIVER || "log", // log | kavenegar
    apiKey: process.env.SMS_API_KEY || "",
    sender: process.env.SMS_SENDER || "",
  },
  payment: {
    defaultGateway: process.env.PAYMENT_GATEWAY || "manual",
    zarinpal: {
      merchantId: process.env.ZARINPAL_MERCHANT_ID || "",
      sandbox: process.env.ZARINPAL_SANDBOX !== "0",
    },
  },
  upload: {
    driver: process.env.UPLOAD_DRIVER || "local", // local | s3
    localDir: process.env.UPLOAD_LOCAL_DIR || "./uploads",
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || "10", 10),
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "10", 10),
    otpTtlMin: parseInt(process.env.OTP_TTL_MIN || "2", 10),
    otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10),
    orderPendingExpireMin: parseInt(process.env.ORDER_PENDING_EXPIRE_MIN || "60", 10),
  },
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@karzintell.ir",
    phone: process.env.ADMIN_PHONE || "09000000000",
    password: process.env.ADMIN_PASSWORD || "Admin@123456",
  },
});
