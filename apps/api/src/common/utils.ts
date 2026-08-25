import { randomBytes, randomInt, randomUUID, createHash } from 'crypto';

/** uuidv4 */
export const uuid = (): string => randomUUID();

/** sha256 هگز */
export const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

/** کد OTP شش‌رقمی */
export const otpCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** رمز موقت برای کاربرانی که ادمین می‌سازد (یک بار نمایش داده می‌شود) */
export const tempPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[randomInt(0, chars.length)];
  return `Kz${out}!`;
};

/** کد خوانای انسانی یکتا: KRZ-9F3KQ2 */
export const humanCode = (prefix = 'KRZ'): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[randomInt(0, alphabet.length)];
  return `${prefix}-${out}`;
};

/** slug سازگار با فارسی */
export const slugify = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/[‌‎‏]/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/** صفحه‌بندی استاندارد */
export const paginate = (page?: number | string, limit?: number | string) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, skip: (p - 1) * l, take: l };
};

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'ul', 'ol', 'li', 'a',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'span',
  'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'figure', 'figcaption', 'hr',
]);
const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'class']);

/** sanitize ساده HTML برای توضیحات محصول/صفحات (حذف اسکریپت و رویدادها) */
export const sanitizeHtml = (html: string): string => {
  let out = html.replace(/<\s*(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  out = out.replace(/<\s*(script|style|iframe|object|embed|form)[^>]*\/?>/gi, '');
  // حذف attribute های on* و javascript:
  out = out.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*\2/gi, '$1="#"');
  // حذف تگ‌های غیرمجاز (نگه داشتن محتوایشان)
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g,
    (match, tag: string, attrs: string) => {
      const t = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(t)) return '';
      const isClose = match.startsWith('</');
      if (isClose) return `</${t}>`;
      const cleanAttrs = String(attrs || '')
        .replace(/([a-zA-Z-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g, (m2, name: string, value: string) =>
          ALLOWED_ATTRS.has(name.toLowerCase()) ? ` ${name.toLowerCase()}=${value}` : '');
      return `<${t}${cleanAttrs}>`;
    });
  return out;
};

/** توکن تصادفی url-safe */
export const randomToken = (bytes = 48): string => randomBytes(bytes).toString('base64url');

/**
 * اجرای SQL خام با placeholder قابل‌حمل. TypeORM در QueryBuilder پارامترها را
 * تبدیل می‌کند، اما EntityManager.query به‌صورت مستقیم از syntax درایور استفاده
 * می‌کند؛ این wrapper از فراموش‌شدن تبدیل ? به $1 در PostgreSQL جلوگیری می‌کند.
 */
export type SqlClient = { query: (text: string, parameters?: unknown[]) => Promise<any> };

export const dbQuery = (client: SqlClient, text: string, parameters: unknown[] = []) => {
  let index = 0;
  const query = text.replace(/\?/g, () => `$${++index}`);
  return client.query(query, parameters);
};
