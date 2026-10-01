import { describe, expect, it } from 'vitest';
import { otpCode, paginate, sanitizeHtml, sha256, slugify } from '../src/common/utils';
import { ORDER_TRANSITIONS, OrderStatus } from '../src/database/entities/order-status';
import { computeCouponDiscount } from '../src/modules/coupons/coupon-math';

// ---------------------------------------------------------------- utils
describe('utils: slugify', () => {
  it('فارسی را حفظ و فاصله را خط‌تیره می‌کند', () => {
    expect(slugify('گوشی سامسونگ A54')).toBe('گوشی-سامسونگ-a54');
  });
  it('کاراکترهای خاص را حذف می‌کند', () => {
    expect(slugify('iPhone 15 Pro Max!!?')).toBe('iphone-15-pro-max');
  });
  it('چند فاصله/خط‌تیره پیاپی ادغام می‌شود', () => {
    expect(slugify('a---b   c')).toBe('a-b-c');
  });
});

describe('utils: sanitizeHtml', () => {
  it('اسکریپت را کاملاً حذف می‌کند', () => {
    expect(sanitizeHtml('<p>سلام</p><script>alert(1)</script>')).not.toContain('script');
    expect(sanitizeHtml('<p>سلام</p><script>alert(1)</script>')).toContain('سلام');
  });
  it('هندلرهای رویداد (onclick و...) را حذف می‌کند', () => {
    expect(sanitizeHtml('<b onclick="x()">متن</b>')).not.toContain('onclick');
  });
  it('javascript: در لینک/تصویر خنثی می‌شود', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>').toLowerCase()).not.toContain('javascript:');
    expect(sanitizeHtml('<img src="javascript:alert(1)">').toLowerCase()).not.toContain('javascript:');
  });
  it('تگ‌های امن (p، b، ul) باقی می‌مانند', () => {
    const out = sanitizeHtml('<p><b>مهم</b></p>');
    expect(out).toContain('<p>');
    expect(out).toContain('<b>');
  });
});

describe('utils: paginate', () => {
  it('مقادیر پیش‌فرض', () => {
    const p = paginate(undefined, undefined);
    expect(p.page).toBe(1);
    expect(p.limit).toBeGreaterThan(0);
    expect(p.skip).toBe(0);
  });
  it('صفحه ۳ با لیمیت ۱۰ → رد ۲۰ رکورد', () => {
    const p = paginate('3', '10');
    expect(p).toMatchObject({ page: 3, limit: 10, skip: 20 });
  });
});

describe('utils: otp/sha256', () => {
  it('کد OTP شش رقمی است', () => {
    expect(otpCode()).toMatch(/^\d{6}$/);
  });
  it('sha256 هش ۶۴ کاراکتری hex برمی‌گرداند', () => {
    expect(sha256('کارزینتل')).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ----------------------------------------------------- وضعیت سفارش (FSM)
describe('ORDER_TRANSITIONS — ماشین وضعیت سفارش', () => {
  const all = Object.keys(ORDER_TRANSITIONS) as OrderStatus[];

  it('همه گذرها به وضعیت‌های معتبر اشاره می‌کنند', () => {
    for (const from of all) {
      for (const to of ORDER_TRANSITIONS[from]) {
        expect(all).toContain(to);
      }
    }
  });

  it('وضعیت‌های پایانی خروجی ندارند', () => {
    expect(ORDER_TRANSITIONS.cancelled).toEqual([]);
    expect(ORDER_TRANSITIONS.refunded).toEqual([]);
  });

  it('از pending_payment نمی‌توان مستقیم shipped شد', () => {
    expect(ORDER_TRANSITIONS.pending_payment).not.toContain('shipped');
  });

  it('زنجیره استاندارد خرید معتبر است: پرداخت → پردازش → ارسال → تحویل', () => {
    expect(ORDER_TRANSITIONS.pending_payment).toContain('paid');
    expect(ORDER_TRANSITIONS.paid).toContain('processing');
    expect(ORDER_TRANSITIONS.processing).toContain('ready_to_ship');
    expect(ORDER_TRANSITIONS.ready_to_ship).toContain('shipped');
    expect(ORDER_TRANSITIONS.shipped).toContain('delivered');
  });
});

// ----------------------------------------------------------- محاسبه کوپن
const compute = (
  coupon: { type: string; value: number | string; maxDiscount?: number | string | null },
  subtotal: number,
) => computeCouponDiscount(coupon, subtotal);

describe('computeCouponDiscount — فرمول تخفیف کوپن', () => {
  it('درصدی ساده', () => {
    expect(compute({ type: 'percent', value: 10 }, 1_000_000)).toBe(100_000);
  });

  it('سقف تخفیف (maxDiscount) اعمال می‌شود', () => {
    expect(compute({ type: 'percent', value: 50, maxDiscount: 100_000 }, 1_000_000)).toBe(100_000);
  });

  it('ثابت (amount)', () => {
    expect(compute({ type: 'amount', value: 250_000 }, 1_000_000)).toBe(250_000);
  });

  it('تخفیف هرگز از مبلغ سبد بیشتر نمی‌شود', () => {
    expect(compute({ type: 'amount', value: 2_000_000 }, 1_000_000)).toBe(1_000_000);
    expect(compute({ type: 'percent', value: 100 }, 1_000_000)).toBe(1_000_000);
  });

  it('مقادیر اعشاری درصدی رو به پایین گرد می‌شوند', () => {
    expect(compute({ type: 'percent', value: 33 }, 10_000)).toBe(3_300);
  });
});
