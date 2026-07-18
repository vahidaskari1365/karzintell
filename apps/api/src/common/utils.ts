import * as crypto from "crypto";

/** تبدیل ارقام فارسی/عربی به لاتین و تمیزکاری رشته */
export function normalizeDigits(input: string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const fi = fa.indexOf(ch);
    if (fi >= 0) return String(fi);
    const ai = ar.indexOf(ch);
    return ai >= 0 ? String(ai) : ch;
  });
}

/** نرمال‌سازی شماره موبایل ایران → 09xxxxxxxxx */
export function normalizePhone(input: string): string {
  let p = normalizeDigits(input).replace(/[\s\-()]/g, "");
  if (p.startsWith("+98")) p = "0" + p.slice(3);
  else if (p.startsWith("0098")) p = "0" + p.slice(4);
  else if (p.startsWith("98") && p.length === 12) p = "0" + p.slice(2);
  return p;
}

export const IRAN_MOBILE_RE = /^09\d{9}$/;

/** slug سازگار با فارسی: حروف فارسی حفظ، فاصله‌ها خط تیره، نویسه‌های اضافی حذف */
export function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[‌‎‏‎‎‏‎‏]/g, " ") // نیم‌فاصله و کنترل‌ها → فاصله
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function randomNumericCode(len = 6): string {
  let out = "";
  while (out.length < len) out += crypto.randomInt(0, 10);
  return out;
}

export function hmacSign(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function timingSafeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** ساخت کد سفارش: KRZ-2026-000123 */
export function orderCode(seq: number, date = new Date()): string {
  return `KRZ-${date.getFullYear()}-${String(seq).padStart(6, "0")}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function roundRial(n: number): number {
  return Math.round(n);
}

/** سقف/کف مبلغ تخفیف کوپن */
export function computeCouponDiscount(
  type: "percent" | "fixed",
  value: number,
  maxDiscount: number | null,
  subtotal: number,
): number {
  let d = type === "percent" ? Math.floor((subtotal * value) / 100) : Math.floor(value);
  if (type === "percent" && maxDiscount && maxDiscount > 0) d = Math.min(d, maxDiscount);
  return clamp(d, 0, subtotal);
}

/** استخراج IP کلاینت از ریکوئست */
export function clientIp(req: any): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    ""
  );
}
